#version 330 core

// GPU-skinned mesh vertex shader.
//
// aBoneIDs / aBoneWeights drive a 4-bone blend (in practice the engine
// uses 1 bone per vertex, but the shader supports up to 4).
// uBonePalette is laid out as a UBO of mat3x4 to keep the uniform block
// size manageable: 128 bones × 48 bytes = 6 KB.

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec4 aColor;
layout(location = 2) in vec2 aTexCoord;
layout(location = 3) in vec3 aNormal;
layout(location = 6) in uvec4 aBoneIDs;
layout(location = 7) in vec4  aBoneWeights;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

#define MAX_BONES 128

layout(std140) uniform BonePalette {
    mat3x4 uBones[MAX_BONES];   // mat3x4 = 3 cols × 4 rows = 12 floats per bone
};

uniform mat4 uWorld;
uniform vec2 uTexCoordOffset;

// Per-character lighting uniforms — match BMD::Transform lighting (lines 366-370).
//   uLightEnable = 1 → compute luminosity from dot(skinnedNormal, uLightDir)
//   uLightEnable = 0 → use uBodyLight directly as vertex color (StreamMesh path)
//
// Luminosity formula (exact match of CPU path):
//   Luminosity = clamp(dot(worldNormal, uLightDir) * 0.8 + 0.4, 0.2, 1e9)
//   vColor.rgb  = uBodyLight * Luminosity
//   vColor.a    = 1.0  (alpha carried by the pipeline / fragment alpha)
uniform vec3  uBodyLight;   // BMD::BodyLight (RGB tint, [0,1])
uniform vec3  uLightDir;    // pre-computed LightPosition from BMD::Transform
uniform int   uLightEnable; // 1 = compute lighting, 0 = use uBodyLight directly

// [GPU CHROME] Sphere-map/env-map UV generation — exact port of the legacy
// per-vertex chrome UV loop (ZzzBMD.cpp RenderMesh ~1470-1541). When
// uChromeMode==0 (default, set on every non-chrome draw) vUV = aTexCoord as
// before. n = bone-rotated normal (mat3(skin)*aNormal) == CPU NormalTransform
// (no body scale, matching VectorRotate by the bone matrix only).
//   uChromeP: x=Wave, y=Wave2, z=Wt*0.00006, w=unused
//   uChromeL: legacy L = (cos(Wt*.001), sin(Wt*.002), 1)
//   uChromeLV: legacy global LightVector
// Modes: 1=CHROME2 2=CHROME3 3=CHROME4 4=CHROME5 5=CHROME6 6=CHROME7 7=OIL
//        8=CHROME 9=default/METAL
uniform int   uChromeMode;
uniform vec4  uChromeP;
uniform vec3  uChromeL;
uniform vec3  uChromeLV;

// [DIAG] uSkinClamp=1: pin any vertex whose SKINNED (pre-world) position is
// non-finite or outside character-local space to the origin and paint it green.
// Localises the line artifact: green dots + no lines => localPos was garbage
// (palette/attrib read), lines remain => garbage enters later (uWorld/...).
uniform int   uSkinClamp;

vec2 ChromeUV(vec3 n) {
    float W  = uChromeP.x;
    float W2 = uChromeP.y;
    if (uChromeMode == 1) return vec2((n.z+n.x)*0.8 + W2*2.0, (n.y+n.x)*1.0 + W2*3.0);
    if (uChromeMode == 2) { float d = dot(n, uChromeLV); return vec2(d, 1.0-d); }
    if (uChromeMode == 3) { float d = dot(n, uChromeL);
        return vec2(d + n.y*0.5 + uChromeL.y*0.6, 1.0-d - (n.z*0.5 + W*0.6)); }
    if (uChromeMode == 4) { float d = dot(n, uChromeL);
        return vec2(d + n.y*3.0 + uChromeL.y*5.0, 1.0-d - (n.z*2.5 + W*1.0)); }
    if (uChromeMode == 5) { float c = (n.z+n.x)*0.8 + W2*2.0; return vec2(c, c); }
    if (uChromeMode == 6) { float c = (n.z+n.x)*0.8 + uChromeP.z; return vec2(c, c); }
    if (uChromeMode == 7) return vec2(n.x, n.y);
    if (uChromeMode == 8) return vec2(n.z*0.5 + W, n.y*0.5 + W*2.0);
    return vec2(n.z*0.5 + 0.2, n.y*0.5 + 0.5);   // mode 9: default/METAL
}

out vec3 vViewPos;   // view-space position (camera at origin) for fog distance — legacy GL_FOG parity
out vec3 vWorldPos;  // world-space position for fog-of-war visibility fade
out vec3 vNormal;
out vec4 vColor;
out vec2 vUV;

mat4 boneMatFor(uint id) {
    mat3x4 m = uBones[id];
    // uBones column c holds boneMatrix ROW c (engine float[3][4] row-major affine:
    // CPU skin is world[r] = dot(row_r.xyz, v) + row_r.w, i.e. world = M * v).
    // GLSL mat4*vec4 linearly combines the mat4's COLUMNS, so the mat4 columns must
    // be M's columns: col j = (M[0][j], M[1][j], M[2][j]) = (m[0][j], m[1][j], m[2][j]).
    // The previous version used m[j][*] as col j → it TRANSPOSED the 3x3 rotation,
    // so any rotated bone flung its verts off-model ("shard explosion"). Translation
    // (col 3) was already correct and stays.
    return mat4(
        m[0][0], m[1][0], m[2][0], 0.0,   // col0 = M's column 0
        m[0][1], m[1][1], m[2][1], 0.0,   // col1 = M's column 1
        m[0][2], m[1][2], m[2][2], 0.0,   // col2 = M's column 2
        m[0][3], m[1][3], m[2][3], 1.0    // col3 = translation
    );
}

void main() {
    mat4 skin =
        boneMatFor(aBoneIDs.x) * aBoneWeights.x +
        boneMatFor(aBoneIDs.y) * aBoneWeights.y +
        boneMatFor(aBoneIDs.z) * aBoneWeights.z +
        boneMatFor(aBoneIDs.w) * aBoneWeights.w;

    vec4 localPos = skin * vec4(aPosition, 1.0);
    bool clamped = false;
    if (uSkinClamp == 1) {
        // Mode 1: LOCAL clamp. Character-local verts live within ~±300 units;
        // 400 catches moderate skin-transform garbage that the old 3000
        // threshold let through (the line artifact spans ~1000-2500 units).
        vec3 lp = localPos.xyz;
        if (any(isnan(lp)) || any(greaterThan(abs(lp), vec3(400.0)))) {
            localPos = vec4(0.0, 0.0, 0.0, 1.0);
            clamped = true;
        }
    }
    vec4 worldPos = uWorld * localPos;
    if (uSkinClamp == 2) {
        // Mode 2: WORLD clamp. Pin any vert further than 300 world units from
        // the body origin (uWorld translation) — catches garbage entering at or
        // after uWorld that mode 1 cannot see. Painted BLUE below.
        // (1500 was too lax: the line artifact spans only ~500-800 world units.)
        vec3 bodyOrig = uWorld[3].xyz;
        if (any(isnan(worldPos.xyz)) || distance(worldPos.xyz, bodyOrig) > 300.0) {
            worldPos = vec4(bodyOrig, 1.0);
            clamped = true;
        }
    }
    // Mode 3: distance HEATMAP, no clamp. Repaint every vertex by how far the
    // shader believes it is from the body origin. Bodies should read green/
    // yellow; whatever colour the line artifact shows = its believed distance.
    // Lines staying WHITE = they are not produced by this shader at all.
    int heat = 0;
    if (uSkinClamp == 3) {
        float d = distance(worldPos.xyz, uWorld[3].xyz);
        heat = (d < 200.0) ? 1 : (d < 400.0) ? 2 : (d < 800.0) ? 3 : 4;
        if (any(isnan(worldPos.xyz))) heat = 5;
    }
    vec4 viewPos  = uView * worldPos;

    gl_Position = uProj * viewPos;
    vViewPos    = viewPos.xyz;
    vWorldPos   = worldPos.xyz;

    // Skin the normal (matching CPU NormalTransform = VectorRotate(Normal, BoneMatrix)).
    // ONLY the bone rotation — NOT mat3(uWorld). uWorld is scale(BodyScale)+translate, so
    // mat3(uWorld) scaled the normal by BodyScale; since Luminosity = dot(n,L) is linear
    // that scaled luminosity by BodyScale for any entity with BodyScale != 1 (pets/mounts/
    // scaled mobs) -> wrong shading. The CPU applies NO BodyScale to the normal. Not
    // re-normalised, to match the CPU (which doesn't after VectorRotate).
    vec3 worldNormal = mat3(skin) * aNormal;
    vNormal = worldNormal;

    // Per-vertex lighting — matches BMD::Transform lines 366-370 exactly:
    //   Luminosity = DotProduct(tn, LightPosition) * 0.8 + 0.4
    //   if (Luminosity < 0.2) Luminosity = 0.2
    //   LightTransform[i][j] = BodyLight * Luminosity
    // Legacy parity: glColor/F2B clamp the VERTEX color to [0,1] BEFORE the
    // texture modulate. Custom mobs carry BodyLight far above 1.0 (e.g. arena
    // devils ~(3.5,5.9,4.9)); without this clamp texel*vColor saturates to
    // solid white, while the CPU path correctly shows the texture at full
    // brightness ("white monsters" bug).
    if (uLightEnable != 0) {
        float Luminosity = dot(worldNormal, uLightDir) * 0.8 + 0.4;
        if (Luminosity < 0.2) Luminosity = 0.2;
        vColor = vec4(clamp(uBodyLight * Luminosity, 0.0, 1.0), 1.0);
    } else {
        vColor = vec4(clamp(uBodyLight, 0.0, 1.0), 1.0);
    }

    if (uChromeMode != 0) {
        // Chrome UV from the bone-rotated normal (CPU NormalTransform parity: bone
        // rotation only, no world scale). uTexCoordOffset carries CHROME4's scroll.
        vUV = ChromeUV(mat3(skin) * aNormal) + uTexCoordOffset;
    } else {
        vUV = aTexCoord + uTexCoordOffset;
    }

    if (clamped) {
        // [DIAG] flag pinned verts: GREEN = mode-1 local clamp hit (skin-side
        // garbage), BLUE = mode-2 world clamp hit (post-uWorld garbage).
        vColor = (uSkinClamp == 1) ? vec4(0.0, 4.0, 0.0, 1.0)
                                   : vec4(0.0, 0.5, 4.0, 1.0);
    }
    if (heat != 0) {
        // [DIAG] mode-3 heatmap: 1=GREEN <200u, 2=YELLOW <400u, 3=RED <800u,
        // 4=MAGENTA >=800u, 5=CYAN NaN.
        vColor = (heat == 1) ? vec4(0.0, 2.0, 0.0, 1.0)
               : (heat == 2) ? vec4(2.0, 2.0, 0.0, 1.0)
               : (heat == 3) ? vec4(2.0, 0.0, 0.0, 1.0)
               : (heat == 4) ? vec4(2.0, 0.0, 2.0, 1.0)
               :               vec4(0.0, 2.0, 2.0, 1.0);
    }
}
