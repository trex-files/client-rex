#version 330 core

// No-op fragment shader for the transform-feedback simulation pass.
// GL_RASTERIZER_DISCARD is enabled during the sim draw, so this shader
// never executes. It must exist and be valid GLSL for the program link
// to succeed.

out vec4 fragColor;

void main() {
    fragColor = vec4(0.0);
}
