#version 330 core

// Additive-blend variant of dynmesh3d.frag.
// Used exclusively by PipelineDynMeshAdditive (GL_ONE / GL_ONE).
//
// Same rationale as sprite3d_additive.frag: dest = src + dest in additive
// blending, so RGB=0 contributes 0 to the destination — no need for the
// RGB-zero discard that dynmesh3d.frag carries (that defence is for
// alpha-blend pipelines where RGB=0 + alpha=1 would render opaque black).
// Keeping the discard here would carve a sharp edge across additive glow
// gradients (ribbons, circles, magic boxes, dyn-light beams) wherever
// RGB dips below 0.02 — visible as a hard horizontal cut on the lower
// half of the lighthouse glow in World95 select-server.
//
// Fog uniforms kept for layout parity; fog block removed because legacy
// EnableAlphaBlend (additive) does glDisable(GL_FOG) and the dyn-mesh
// frontend already sets uFogEnabled = 0 for the additive pipeline.

in vec2 vUV;
in vec4 vColor;
in vec3 vViewPos;   // view-space position (not used, kept for layout parity)

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
