#version 330 core

// World-space 3D geometry — used by DrawDynamicMesh and DrawRibbons.
// Positions arrive in world space; this shader applies the full
// view+projection from the Camera UBO (same binding point 0 as
// all other scene shaders).

layout(location = 0) in vec3 aPosition;   // world-space
layout(location = 1) in vec4 aColor;      // ubyte4-normalized
layout(location = 2) in vec2 aTexCoord;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

out vec2 vUV;
out vec4 vColor;
out vec3 vViewPos;   // view-space position (camera at origin) for fog distance — legacy GL_FOG parity

void main() {
    vec4 viewPos = uView * vec4(aPosition, 1.0);
    gl_Position  = uProj * viewPos;
    vUV          = aTexCoord;
    vColor       = aColor;
    vViewPos     = viewPos.xyz;
}
