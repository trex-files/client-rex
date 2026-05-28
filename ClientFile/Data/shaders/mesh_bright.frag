#version 330 core

// Mesh fragment shader for the BMD additive (RENDER_BRIGHT) path.
//
// Pipeline state from MakeMeshBright:
//   blend = GL_ONE / GL_ONE additive
//   depthWrite = false
//   cull = none
//
// The legacy effect renderer pairs additive blending with
// glAlphaFunc(GL_GREATER, 0.0) (or sometimes 0.25), which discards the
// fully-transparent border pixels of effect textures. Without that the
// alpha=0 pixels still execute the fragment write, and any color in
// them (even RGB=0) competes with depth/blend in subtle ways. Worse,
// if a state leak elsewhere flips off blending mid-frame, those alpha=0
// pixels render as opaque black squares — which is exactly the symptom
// users see on Ice Storm / aura / glow effects.
//
// Use a low threshold (0.01) so genuine glow tails (alpha=0.05..0.5)
// still contribute additively while only the hard-zero borders are
// clipped.

in vec2 vUV;
in vec4 vColor;
in vec3 vViewPos;   // view-space position (camera at origin) — fog distance
in vec3 vWorldPos;

#ifdef FOG_ENABLED
layout(std140) uniform FogBlock {
    vec4 uFogColorRGBA;
    vec4 uFogParams;   // x=start, y=end, z=enabled(0|1), w=unused
};
#endif

uniform sampler2D uTex;

// 2026-05-27: Output RGB multiplier. CPU sets this via SetUniformFloat
// in DrawMesh::Flush — defaults to 1.0 (no change) for world/hero/skill
// bright renders. The inventory grid bumps it to ~1.7 for chrome
// additive contribution that needs to match legacy intensity. GLSL 330
// doesn't allow default uniform initializers; CPU must set every Flush.
uniform float uBrightMult;

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    vec4 c = texel * vColor;
    // 2026-05-27: Lowered discard threshold 0.01 → 0.001 for smooth particle
    // edges (Flame skill, Doorkeeper Titus fire). Hard 0.01 cutoff produced a
    // visible noisy boundary between "barely visible" and "discarded" pixels.
    if (c.a < 0.001) discard;
#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    c.rgb *= uBrightMult;
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
