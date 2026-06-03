#version 330 core

// 2D textured quad. Mirrors legacy RenderBitmap / RenderColorBitmap.
// vColor is the per-vertex tint; texture is sampled in linear filter.

in vec2 vUV;
in vec4 vColor;

uniform sampler2D uTex;

out vec4 fragColor;

void main() {
    fragColor = texture(uTex, vUV) * vColor;
}
