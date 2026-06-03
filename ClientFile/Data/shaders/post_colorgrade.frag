#version 330 core

// Color grading + optional ACES tone-mapping pass.
//
// LUT format: 2D horizontal strip (256×16).
//   - 16 B-slices laid out left-to-right: slice b occupies columns [b*16 .. b*16+15].
//   - Within each slice: R varies along X, G varies along Y.
//   - Sampling: u = (b*16 + r + 0.5) / 256.0,  v = (g + 0.5) / 16.0
//
// An identity LUT is auto-created at Init() so the pass is always live.
// Override via PostProcess::SetLUTTexture() for custom grades.

in vec2 vUV;

uniform sampler2D uSrc;
uniform sampler2D uLUT;
uniform float     uLUTStrength;   // 0–1 blend factor
uniform int       uAcesEnabled;   // 1 = apply ACES before LUT

out vec4 fragColor;

vec3 acesToneMapping(vec3 x) {
    // ACES fitted curve (Stephen Hill approximation).
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
    vec3 color = texture(uSrc, vUV).rgb;

    if (uAcesEnabled != 0) {
        color = acesToneMapping(color);
    }

    // Map [0,1] to LUT index space [0, 15] then to 2D strip UV.
    vec3 idx = clamp(color, 0.0, 1.0) * 15.0;
    float r = idx.r;
    float g = idx.g;
    float b = idx.b;
    float u = (floor(b) * 16.0 + r + 0.5) / 256.0;
    float v = (g + 0.5) / 16.0;
    vec3 graded = texture(uLUT, vec2(u, v)).rgb;

    color = mix(color, graded, uLUTStrength);

    fragColor = vec4(color, 1.0);
}
