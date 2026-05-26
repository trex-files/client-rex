#version 330 core

// Variant of sprite3d.frag that discards alpha < 0.25 (matches legacy
// glAlphaFunc(GL_GREATER, 0.25)). Used by alpha-tested sprites where
// the source has hard edges (font glyphs, mask sprites).

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
    if (c.a < 0.25) discard;
    // LEGACY MATCH 2026-05-26: RGB-cut removed. Legacy has NO RGB threshold.
    if (uFogEnabled == 1) {
        float dist = length(vEyePos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    fragColor = c;
}
