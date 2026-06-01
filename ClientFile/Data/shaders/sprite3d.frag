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

#ifdef FOG_ENABLED
layout(std140) uniform FogBlock {
    vec4 uFogColorRGBA;
    vec4 uFogParams;   // x=start, y=end, z=enabled(0|1), w=unused
};
#endif

uniform sampler2D uTex;

out vec4 fragColor;

void main() {
    vec4 sampled = texture(uTex, vUV);
    vec4 c = sampled * vColor;
    // 2026-05-27: Lowered discard threshold 0.01 → 0.001 so particle edges
    // fade smoothly instead of stopping at a hard cutoff. Same fix applied
    // to sprite3d_additive.frag for the additive path.
    if (c.a < 0.001) discard;
#ifdef FOG_ENABLED
    float dist = -vEyePos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    fragColor = c;
}
