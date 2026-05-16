#version 330 core

// Additive-blend variant of sprite3d.frag.
// Used exclusively by PipelineSprite3DAdditive (GL_ONE / GL_ONE).
//
// The RGB discard present in sprite3d.frag MUST NOT run here: for additive
// blend, dest = src + dest, so low-RGB edge pixels (0.0..0.02) are the
// natural soft falloff of glow textures (lighthouse aura, Excellent halo,
// ice storm, weapon flare). Discarding them carves a visible HORIZONTAL
// edge across the glow where the RGB drops below 0.02 — exactly the
// "borde cortado abajo" the user reports on the World95 lighthouse beam.
// Additive math handles RGB=0 correctly (0+dest = dest = invisible), so
// the RGB-zero defence sprite3d.frag carries (for alpha-blend pipelines
// where RGB=0 + alpha=1 would render opaque black) is not needed here.
//
// Fog uniforms are declared so the shader signature matches the others
// (Draw3D::Flush sets them unconditionally) but the fog block is also
// removed: legacy EnableAlphaBlend (additive One/One) explicitly disables
// GL_FOG (ZzzOpenglUtil.cpp:645) and Draw3D::Flush already passes
// uFogEnabled = 0 for the additive pipeline. Skipping the block keeps the
// shader cheap.

in vec2 vUV;
in vec4 vColor;
in vec3 vEyePos;   // eye-space position (not used here, kept for layout parity)

uniform int   uFogEnabled;  // ignored — additive should never be fogged
uniform float uFogStart;
uniform float uFogEnd;
uniform vec4  uFogColor;

uniform sampler2D uTex;

out vec4 fragColor;

void main() {
    vec4 sampled = texture(uTex, vUV);
    vec4 c = sampled * vColor;
    if (c.a < 0.01) discard;
    // No RGB discard — see file header.
    // No fog — see file header.
    fragColor = c;
}
