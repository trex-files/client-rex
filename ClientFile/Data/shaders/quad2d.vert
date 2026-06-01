#version 330 core

// Pipeline2DTextured / Pipeline2DColor / PipelineText
//
// Vertex inputs are screen-space pixel coordinates (origin top-left,
// matches engine convention WindowHeight - y in legacy code).
// uOrtho converts pixel coords to NDC.

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec4 aColor;     // 0..1 RGBA, normalized from UByte4
layout(location = 2) in vec2 aTexCoord;

layout(std140) uniform UIBlock {
    mat4 uOrtho;
};

out vec2 vUV;
out vec4 vColor;

void main() {
    gl_Position = uOrtho * vec4(aPosition, 0.0, 1.0);
    vUV    = aTexCoord;
    vColor = aColor;
}
