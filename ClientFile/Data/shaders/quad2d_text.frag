#version 330 core

// Glyph rasterizer output. Atlas stores alpha in red channel (R8 single-channel
// stored as glyph coverage). vColor carries text color + alpha.

in vec2 vUV;
in vec4 vColor;

uniform sampler2D uAtlas;

out vec4 fragColor;

void main() {
    float a = texture(uAtlas, vUV).r;
    fragColor = vec4(vColor.rgb, vColor.a * a);
    if (fragColor.a < 0.01) discard;
}
