#version 330 core

in vec2 vUV;

uniform sampler2D uTex;
uniform float     uAlpha;

out vec4 fragColor;

void main() {
    float a = texture(uTex, vUV).a * uAlpha;
    if (a < 0.02) discard;
    fragColor = vec4(0.0, 0.0, 0.0, a);
}
