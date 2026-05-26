#version 330 core

// Particle fragment. Atlas texel × instance color. Blend mode is set by
// the pipeline (additive, alpha, etc.) — same shader is bound for all
// blend modes.
//
// Defensive low-threshold discard so alpha-near-zero atlas pixels never
// reach the blend stage. Same rationale as sprite3d.frag: alpha-blend
// pipelines would otherwise show alpha=1 RGB=0 pixels (rare but possible
// in atlas pages with packed sub-textures) as opaque black squares.

in vec2 vUV;
in vec4 vColor;

uniform sampler2D uAtlas;

out vec4 fragColor;

void main() {
    vec4 sampled = texture(uAtlas, vUV);
    vec4 c = sampled * vColor;
    if (c.a < 0.01) discard;
    // Same rationale as sprite3d.frag: particle atlases authored for
    // additive blending have black borders meant to be invisible. When
    // routed through alpha-blend they show as opaque black squares.
    // Discard near-zero RGB pixels to mirror the legacy additive-only
    // contract regardless of which pipeline the batch lands on.
    if (max(sampled.r, max(sampled.g, sampled.b)) < 0.10) discard;  // raised 0.02 → 0.04 to match mesh.frag JPEG anti-alias band
    fragColor = c;
}
