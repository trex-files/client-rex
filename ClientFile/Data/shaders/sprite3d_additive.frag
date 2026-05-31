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
in vec3 vEyePos;   // eye-space position (unused — no fog on additive path)

uniform sampler2D uTex;

out vec4 fragColor;

void main() {
    vec4 sampled = texture(uTex, vUV);
    vec4 c = sampled * vColor;
    // 2026-05-27: Lowered discard threshold 0.01 → 0.001 to smooth particle
    // edges. With additive blend (GL_ONE/GL_ONE), src.rgb * 0.001 contributes
    // imperceptibly to the framebuffer — keeping these pixels gives a soft
    // gradient down to zero instead of a hard cutoff at 0.01 alpha. User
    // reported "bordes ruidosos / no smooth" on Doorkeeper Titus fire and
    // Flame skill — that was the 0.01 threshold creating a visible boundary
    // between "barely visible" and "discarded" pixels.
    if (c.a < 0.001) discard;
    // No RGB discard — see file header.
    // No fog — see file header.
    fragColor = c;
}
