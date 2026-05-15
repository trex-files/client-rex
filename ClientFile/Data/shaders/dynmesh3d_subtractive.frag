#version 330 core

// Subtractive-blend variant of dynmesh3d.frag.
// Used exclusively by PipelineDynMeshAlphaMinus (GL_ZERO / GL_ONE_MINUS_SRC_COLOR).
//
// The RGB discard present in dynmesh3d.frag MUST NOT run here: for subtractive
// blend the fragment's RGB is the darkening payload, not dead weight. Low-RGB
// edge pixels (0.0..0.02) are the soft falloff gradient that makes dark halos
// (Rageful Glow, ghost trails, BK effects with RENDER_TYPE_ALPHA_BLEND_MINUS)
// fade out smoothly. Discarding them kills the gradient → hard-edged disc.
// Legacy fixed-function had no fragment shader, so all fragments reached the
// blend stage — this variant restores that parity.

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
    // No RGB discard — see file header.
    if (uFogEnabled == 1) {
        float dist = length(vWorldPos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    fragColor = c;
}
