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

// Fog mirrors legacy fixed-function GL_FOG (glEnable(GL_FOG) + GL_LINEAR mode).
uniform int   uFogEnabled;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec4  uFogColor;

uniform sampler2D uTex;

// 2026-05-27: Output RGB multiplier. CPU sets this via SetUniformFloat
// in DrawMesh::Flush — defaults to 1.0 (no change) for world/hero/skill
// bright renders. The inventory grid bumps it to ~1.7 for chrome
// additive contribution that needs to match legacy intensity. GLSL 330
// doesn't allow default uniform initializers; CPU must set every Flush.
uniform float uBrightMult;

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    vec4 c = texel * vColor;
    // 2026-05-27: Lowered discard threshold 0.01 → 0.001 for smooth particle
    // edges (Flame skill, Doorkeeper Titus fire). Hard 0.01 cutoff produced a
    // visible noisy boundary between "barely visible" and "discarded" pixels.
    if (c.a < 0.001) discard;
    if (uFogEnabled == 1) {
        float dist = length(vViewPos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    c.rgb *= uBrightMult;
    fragColor = c;
}
