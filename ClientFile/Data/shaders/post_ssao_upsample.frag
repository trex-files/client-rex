#version 330 core

// SSAO upsample + composite pass — full resolution.
// Bilaterally upsamples the blurred half-res AO to full-res using depth
// edge-awareness, then multiplies it into the scene color.
// Multiplicative blend: scene * ao (0.7..1.0 range, so non-zero base).

in vec2 vUV;

uniform sampler2D uScene;       // full-res scene color (current post-chain)
uniform sampler2D uAO;          // blurred AO (half-res)
uniform sampler2D uDepthFull;   // full-res depth for edge-stop
uniform sampler2D uDepthHalf;   // half-res depth for edge-stop
uniform vec2      uHalfTexel;   // 1/halfW, 1/halfH

out vec4 fragColor;

void main() {
    vec3  scene    = texture(uScene, vUV).rgb;
    float fullD    = texture(uDepthFull, vUV).r;

    // Bilateral 2×2 gather from half-res AO.
    // Sample the 4 nearest half-res texels and weight by depth similarity.
    vec2 halfUV    = vUV - uHalfTexel * 0.5;
    vec2 offsets[4];
    offsets[0]     = halfUV;
    offsets[1]     = halfUV + vec2(uHalfTexel.x, 0.0);
    offsets[2]     = halfUV + vec2(0.0, uHalfTexel.y);
    offsets[3]     = halfUV + uHalfTexel;

    float aoSum    = 0.0;
    float wSum     = 0.0;
    for (int i = 0; i < 4; ++i) {
        vec2  uv   = clamp(offsets[i], vec2(0.0), vec2(1.0));
        float hD   = texture(uDepthHalf, uv).r;
        float ao   = texture(uAO, uv).r;
        float depthDiff = abs(hD - fullD);
        float w    = exp(-depthDiff * 30.0);
        aoSum     += ao * w;
        wSum      += w;
    }

    float ao = (wSum > 0.0001) ? (aoSum / wSum) : texture(uAO, vUV).r;

    // Multiplicative darkening: preserves color hue, only darkens brightness.
    fragColor = vec4(scene * ao, 1.0);
}
