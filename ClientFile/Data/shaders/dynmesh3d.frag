#version 330 core

// Standard textured fragment for world-space dynamic geometry
// (RenderCircle3D, ribbons, dynamic effect meshes).
// Multiplies texel RGBA by per-vertex color (light * alpha in w).
//
// Defensive low-threshold discard so alpha-near-zero pixels never reach
// the blend stage. Same rationale as sprite3d.frag — paired with multiple
// blend variants and we don't want alpha-blend pipelines to render
// alpha=1 RGB=0 noise as opaque black.

in vec2 vUV;
in vec4 vColor;
in vec3 vWorldPos;   // world-space position for fog distance

// Fog mirrors legacy fixed-function GL_FOG (glEnable(GL_FOG) + GL_LINEAR mode).
uniform int   uFogEnabled;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec4  uFogColor;

uniform sampler2D uTex;

out vec4 fragColor;

void main() {
    vec4 sampled = texture(uTex, vUV);
    vec4 c = sampled * vColor;
    if (c.a < 0.01) discard;
    // Same rationale as sprite3d.frag: ribbons / circles / dynmeshes that
    // were authored for additive blending have RGB=0 borders treated as
    // transparent by legacy. Mirror the contract by discarding near-zero
    // RGB pixels regardless of which pipeline the batch lands on.
    if (max(sampled.r, max(sampled.g, sampled.b)) < 0.02) discard;
    if (uFogEnabled == 1) {
        float dist = length(vWorldPos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    fragColor = c;
}
