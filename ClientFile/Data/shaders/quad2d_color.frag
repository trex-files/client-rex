#version 330 core

// 2D solid-color quad. Mirrors legacy RenderColor (no texture, just RGBA fill).

in vec4 vColor;

out vec4 fragColor;

void main() {
    fragColor = vColor;
}
