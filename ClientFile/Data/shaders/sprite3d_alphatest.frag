#version 330 core

// Variant of sprite3d.frag that discards alpha < 0.25 (matches legacy
// glAlphaFunc(GL_GREATER, 0.25)). Used by alpha-tested sprites where
// the source has hard edges (font glyphs, mask sprites).

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
    if (c.a < 0.25) discard;
#ifdef FOG_ENABLED
    float dist = -vEyePos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    fragColor = c;
}
