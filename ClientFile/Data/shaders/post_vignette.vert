#version 330 core

// Fullscreen-quad vertex shader for vignette pass.
// Shares LayoutPostFullscreen with all other post passes.

layout(location = 0) in vec2 aPosition;
layout(location = 2) in vec2 aTexCoord;

out vec2 vUV;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vUV         = aTexCoord;
}
