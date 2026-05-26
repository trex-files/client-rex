#version 330 core

// Standard textured 3D sprite (billboard). Multiplies the texel by the
// per-vertex color. Used for damage numbers, footstep effects, particle
// quads, etc.
//
// Defensive low-threshold discard: any texel whose final alpha is
// effectively zero never reaches the blend stage. Critical because this
// shader is paired with multiple blend variants (additive, alpha-blend,
// lightmap) — additive paths don't care, but alpha-blend paths would
// otherwise let alpha=1 RGB=0 noise pixels render as opaque black, and
// alpha=0 borders go through the blend equation pointlessly. Threshold
// is 0.01 (not 0.25) so genuine glow tails (alpha 0.05..0.5) still
// contribute correctly; only the hard-zero edges drop out.

in vec2 vUV;
in vec4 vColor;
in vec3 vEyePos;   // eye-space position for fog distance

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
    // Many MU effect textures are JPG (Components=3, alpha is forced to 1.0
    // by the legacy shim). Black corners of textures like flare01.jpg
    // (BITMAP_LIGHT) are intended to be transparent — legacy relied on
    // additive blending (One/One) to make them invisible (RGB=0 contributes
    // 0 to dest). When the same sprite is routed to alpha-blend mode (via
    // SubType / AlphaBlendType not landing on additive), those black corners
    // render as opaque BLACK rectangles behind dropped-item glows / aura
    // halos / damage flares — exactly what users see.
    //
    // Mirror the legacy "additive treats RGB=0 as transparent" contract by
    // discarding fragments whose RGB is effectively zero, regardless of the
    // alpha-test path. Effects authored for additive blending (drop glow,
    // skill flare, magic circle) all have RGB tapering to 0 at the texture
    // edges; legitimate near-black sprites (e.g. dark damage numbers) still
    // have measurable RGB above the threshold.
    if (max(sampled.r, max(sampled.g, sampled.b)) < 0.10) discard;  // raised 0.02 → 0.04 to match mesh.frag JPEG anti-alias band
    if (uFogEnabled == 1) {
        float dist = length(vEyePos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    fragColor = c;
}
