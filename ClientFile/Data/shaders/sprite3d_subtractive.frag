#version 330 core

// Subtractive-blend variant of sprite3d.frag.
// Used exclusively by PipelineSprite3DAlphaMinus (GL_ZERO / GL_ONE_MINUS_SRC_COLOR).
//
// The RGB discard present in sprite3d.frag MUST NOT run here: for subtractive
// blend the fragment's RGB is the darkening payload, not dead weight. Low-RGB
// edge pixels (0.0..0.02) are the soft falloff gradient that makes dark halos
// (AlphaMinus sprites and particles) fade out smoothly. Discarding them kills
// the gradient → hard-edged disc. Legacy fixed-function had no fragment shader,
// so all fragments reached the blend stage — this variant restores that parity.

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
    if (c.a < 0.01) discard;
    // No RGB discard — see file header.
#ifdef FOG_ENABLED
    float dist = -vEyePos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    fragColor = c;
}
