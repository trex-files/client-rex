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
    // Defensive RGB-near-zero discard so additive-authored sprites that land
    // on the alpha-test pipeline (e.g. AlphaBlendType=2 packed atlases with
    // hard alpha cutouts) do not paint opaque black squares around the
    // visible glyph. Threshold mirrors sprite3d.frag.
    if (max(sampled.r, max(sampled.g, sampled.b)) < 0.10) discard;  // raised 0.02 → 0.04 to match mesh.frag JPEG anti-alias band
    if (uFogEnabled == 1) {
        float dist = length(vEyePos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    fragColor = c;
}
