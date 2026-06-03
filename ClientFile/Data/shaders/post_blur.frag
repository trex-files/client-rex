#version 330 core

// Two-pass Gaussian blur. The CPU sets uDirection to (1,0) for horizontal
// pass, (0,1) for vertical. uTexelSize = (1/W, 1/H).

in vec2 vUV;

uniform sampler2D uSrc;
uniform vec2      uDirection;
uniform vec2      uTexelSize;

out vec4 fragColor;

const float w[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
    vec3 acc = texture(uSrc, vUV).rgb * w[0];
    for (int i = 1; i < 5; ++i) {
        vec2 offset = uDirection * uTexelSize * float(i);
        acc += texture(uSrc, vUV + offset).rgb * w[i];
        acc += texture(uSrc, vUV - offset).rgb * w[i];
    }
    fragColor = vec4(acc, 1.0);
}
