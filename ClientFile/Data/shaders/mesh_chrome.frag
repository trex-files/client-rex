#version 330 core

// TODO Phase 2 — needs a dedicated mesh_chrome.vert that emits vViewPos
// and vNormal varyings for sphere-map UV computation. Currently this frag
// is paired with mesh_static.vert (which emits vColor + vUV only) and the
// program will fail to link. Chrome rendering remains on the legacy path
// until Phase 2 — do NOT call PipelineMeshChrome() until that is in.

// Chrome / metal / oil mesh material. Texture coordinates are computed
// in the vertex shader from the mesh normal (sphere-map style). See the
// legacy ZzzBMD::RenderMesh CHROME branches for the formula variants:
//   CHROME2: u = (n.z + n.x) * 0.8 + Wave2*2
//            v = (n.y + n.x) * 1.0 + Wave2*3
//   CHROME3: u = dot(n, lightVec)
//            v = 1 - dot(n, lightVec)
//   CHROME4: similar to CHROME3 but with time-modulated light vector
// We pick the CHROME2-style here as the most common; other variants
// are separate shader programs (kept minimal — chrome variants are
// uncommon and easy to compile-fork).

in vec3 vViewPos;
in vec3 vNormal;
in vec4 vColor;
in vec3 vWorldPos;

uniform sampler2D uTex;
uniform float     uAlpha;
uniform float     uChromeWave;   // (WorldTime % 5000) * 0.00024 - 0.4

// Fog mirrors legacy fixed-function GL_FOG (glEnable(GL_FOG) + GL_LINEAR mode).
uniform int   uFogEnabled;
// NOTE: fog-of-war fade on chrome needs visual validation — environment
// reflection darkening may look odd; revisit after Phase 2 chrome vert is linked.
layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};
uniform float uFogStart;
uniform float uFogEnd;
uniform vec4  uFogColor;

out vec4 fragColor;

void main() {
    vec3 n = normalize(vNormal);
    float u = (n.z + n.x) * 0.8 + uChromeWave * 2.0;
    float v = (n.y + n.x) * 1.0 + uChromeWave * 3.0;
    vec4 texel = texture(uTex, vec2(u, v));
    vec3 rgb = texel.rgb * vColor.rgb;
    if (uFogEnabled == 1) {
        float dist = -vViewPos.z;
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        rgb = mix(uFogColor.rgb, rgb, fogF);
    }
    vec4 c = vec4(rgb, texel.a * vColor.a * uAlpha);
    // Fog of war: radial fade to black beyond the entity visibility radius.
    // Guard: w<=0 means the UBO hasn't been uploaded yet → full visibility.
    if (uVisibility.w > 0.0) {
        vec2  worldXYTiles = vWorldPos.xy * 0.01;
        float distTiles    = length(worldXYTiles - uVisibility.xy);
        float visFactor    = 1.0 - smoothstep(uVisibility.z, uVisibility.w, distTiles);
        c.rgb *= visFactor;
        c.a   *= visFactor;
    }
    fragColor = c;
}
