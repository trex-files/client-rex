#version 330 core

// Bright-extract pass for bloom.
// Pixels whose luminance exceeds uThreshold are passed through;
// pixels below threshold are zeroed. Output is stored into a half-res
// FBO that the blur pass reads next.
//
// Luminance formula: BT.601 coefficients (matches legacy MU client
// colour space — render targets are sRGB-ish LDR RGBA8).

in vec2 vUV;

uniform sampler2D uSrc;
uniform float     uThreshold;   // default 0.85

out vec4 fragColor;

void main() {
    vec3 color = texture(uSrc, vUV).rgb;
    // BT.601 luminance.
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    // Soft knee: smoothstep avoids the sharp hard-cut that bakes
    // a halo ring artifact at the threshold boundary.
    float knee = 0.05;
    float w = smoothstep(uThreshold - knee, uThreshold + knee, luma);
    fragColor = vec4(color * w, 1.0);
}
