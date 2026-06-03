#version 330 core

// SSAO sample pass — half-resolution.
// Samples depth neighborhood to estimate ambient occlusion.
// Uses 8 Poisson-disk offsets in a hemisphere around each pixel.
// Output: grayscale AO factor (1.0 = fully lit, 0.0 = fully occluded).

in vec2 vUV;

uniform sampler2D uDepth;       // scene depth (0..1 non-linear)
uniform vec2      uTexelSize;   // 1/halfW, 1/halfH
uniform float     uRadius;      // world-space occlusion radius (0.3..1.0)
uniform float     uBias;        // self-shadow bias (0.01..0.1)
uniform float     uNear;        // camera near plane
uniform float     uFar;         // camera far plane
uniform int       uSamples;     // 4 or 8
uniform float     uNoiseScale;  // per-frame dither (randomize offsets each frame)

out vec4 fragColor;

// Linearize depth from non-linear [0,1] to view-space [near,far].
float linearizeDepth(float d) {
    return (2.0 * uNear * uFar) / (uFar + uNear - d * (uFar - uNear));
}

// 8 Poisson disk offsets in a unit disk.
// Pre-computed to avoid trig at runtime.
const vec2 kPoissonDisk[8] = vec2[](
    vec2( 0.3568126, -0.5820648),
    vec2(-0.6905845,  0.2913978),
    vec2(-0.1795694, -0.9036438),
    vec2( 0.8887891,  0.2793950),
    vec2(-0.4372291,  0.7745929),
    vec2( 0.0826137,  0.4673099),
    vec2( 0.6341069, -0.1497694),
    vec2(-0.9180839, -0.3940978)
);

// Simple hash for per-pixel rotation (cheap dither, avoids structured noise).
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453 + uNoiseScale);
}

void main() {
    float depth = texture(uDepth, vUV).r;

    // Skip skybox / background pixels (depth == 1.0).
    if (depth >= 0.9999) {
        fragColor = vec4(1.0);
        return;
    }

    float linearD = linearizeDepth(depth);

    // Per-pixel rotation angle for Poisson disk (reduces structured banding).
    float angle  = hash(vUV) * 6.28318;
    float cosA   = cos(angle);
    float sinA   = sin(angle);

    // Occlusion accumulator.
    float occlusion = 0.0;
    int   count     = min(uSamples, 8);

    for (int i = 0; i < count; ++i) {
        // Rotate Poisson sample.
        vec2 raw    = kPoissonDisk[i];
        vec2 offset = vec2(raw.x * cosA - raw.y * sinA,
                           raw.x * sinA + raw.y * cosA);
        // Scale to radius in UV space.
        vec2 sampleUV = vUV + offset * uRadius * uTexelSize * 10.0;
        sampleUV      = clamp(sampleUV, vec2(0.0), vec2(1.0));

        float sDepth  = texture(uDepth, sampleUV).r;
        float sLinear = linearizeDepth(sDepth);

        // How much shallower than us is the sample?
        float diff = linearD - sLinear;

        // Inside occlusion range (above bias, below max range).
        // Range falloff: contributions further away contribute less.
        float rangeCheck = 1.0 - smoothstep(0.0, uRadius * 5.0, abs(diff));
        if (diff > uBias) {
            occlusion += rangeCheck;
        }
    }

    float ao = 1.0 - (occlusion / float(count));
    // Remap to [0.7, 1.0] — full black occlusion is too aggressive for this game.
    ao = mix(0.7, 1.0, ao);

    fragColor = vec4(ao, ao, ao, 1.0);
}
