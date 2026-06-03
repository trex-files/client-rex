#version 330 core

in vec2 vUV;

uniform sampler2D uSrc;

out vec4 fragColor;

void main() {
    vec3 color = texture(uSrc, vUV).rgb;

    // Clamp to [0,1] before S-curve so the cubic stays monotone on its valid domain.
    vec3 c = clamp(color, 0.0, 1.0);

    // Mild S-curve contrast: smoothstep lifts shadows and compresses highlights.
    vec3 contrasted = c * c * (3.0 - 2.0 * c);
    vec3 result = mix(c, contrasted, 0.4);

    fragColor = vec4(result, 1.0);
}
