#version 330 core

// Fullscreen-quad vertex shader. The vertex buffer holds 6 vertices
// covering the full screen in clip-space; the texcoord matches the
// FBO contents.

layout(location = 0) in vec2 aPosition;    // in clip-space [-1, 1]
layout(location = 2) in vec2 aTexCoord;

out vec2 vUV;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vUV         = aTexCoord;
}
