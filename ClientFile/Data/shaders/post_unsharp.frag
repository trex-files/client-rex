#version 330 core

in vec2 vUV;

uniform sampler2D uSrc;
uniform vec2      uTexelSize;
uniform float     uAmount;
uniform float     uRadius;

out vec4 fragColor;

void main() {
    vec3 original = texture(uSrc, vUV).rgb;

    // 3x3 Gaussian blur
    float kernel[9] = float[](
        1.0/16.0, 2.0/16.0, 1.0/16.0,
        2.0/16.0, 4.0/16.0, 2.0/16.0,
        1.0/16.0, 2.0/16.0, 1.0/16.0
    );

    vec3 blurred = vec3(0.0);
    int idx = 0;
    for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
            blurred += texture(uSrc, vUV + vec2(float(x), float(y)) * uTexelSize * uRadius).rgb * kernel[idx];
            idx++;
        }
    }

    // High-pass: original - blurred, then add back with strength
    vec3 highPass = original - blurred;
    vec3 sharpened = original + highPass * uAmount;

    fragColor = vec4(clamp(sharpened, 0.0, 1.0), 1.0);
}
