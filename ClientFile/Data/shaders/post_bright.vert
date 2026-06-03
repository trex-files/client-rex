#version 330 core

// Fullscreen-quad vertex shader for the bright-extract pass.
// Shares the same LayoutPostFullscreen layout as post_blur.vert:
//   location 0 → vec2 clip-space position
//   location 2 → vec2 texcoord (matches VertexAttribKind::TexCoord0 slot)

layout(location = 0) in vec2 aPosition;   // clip-space [-1, 1]
layout(location = 2) in vec2 aTexCoord;

out vec2 vUV;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vUV         = aTexCoord;
}
