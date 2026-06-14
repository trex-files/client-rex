#version 330 core

// GPU-skinned GROUND-SHADOW vertex shader.
//
// Skins the vertex exactly like mesh_skinned.vert, then applies the legacy
// ground projection (BMD::RenderBodyShadow) so the shadow matches the CPU
// per-vertex projection bit-for-bit:
//   rel   = worldPos - uBodyOrigin            (uBodyOrigin = live BodyOrigin, terrain-Z)
//   rel.x += rel.z * (rel.x + sx) / (rel.z - sy)   // uShadowSkew = (sx, sy)
//   out   = (rel.x + origin.x, rel.y + origin.y, 5 + origin.z)
// Flat black output (mesh_shadow_skinned.frag) — legacy samples a 1x1 white tex,
// so the projected geometry IS the shadow shape; no per-texel silhouette.

layout(location = 0) in vec3 aPosition;
layout(location = 6) in uvec4 aBoneIDs;
layout(location = 7) in vec4  aBoneWeights;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

#define MAX_BONES 128

layout(std140) uniform BonePalette {
    mat3x4 uBones[MAX_BONES];
};

uniform mat4 uWorld;        // Translation(snapshot BodyOrigin) * Scale(BodyScale)
uniform vec3 uBodyOrigin;   // live BodyOrigin (terrain-Z) — projection origin
uniform vec2 uShadowSkew;   // (sx, sy): 2000 (2500 BattleCastle), 4000

mat4 boneMatFor(uint id) {
    mat3x4 m = uBones[id];
    return mat4(
        m[0][0], m[1][0], m[2][0], 0.0,
        m[0][1], m[1][1], m[2][1], 0.0,
        m[0][2], m[1][2], m[2][2], 0.0,
        m[0][3], m[1][3], m[2][3], 1.0
    );
}

void main() {
    mat4 skin =
        boneMatFor(aBoneIDs.x) * aBoneWeights.x +
        boneMatFor(aBoneIDs.y) * aBoneWeights.y +
        boneMatFor(aBoneIDs.z) * aBoneWeights.z +
        boneMatFor(aBoneIDs.w) * aBoneWeights.w;

    vec3 worldPos = (uWorld * (skin * vec4(aPosition, 1.0))).xyz;

    vec3 rel = worldPos - uBodyOrigin;
    rel.x += rel.z * (rel.x + uShadowSkew.x) / (rel.z - uShadowSkew.y);
    vec3 projWorld = vec3(rel.x + uBodyOrigin.x,
                          rel.y + uBodyOrigin.y,
                          5.0   + uBodyOrigin.z);

    gl_Position = uProj * uView * vec4(projWorld, 1.0);
}
