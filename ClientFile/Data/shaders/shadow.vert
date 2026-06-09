// SPDX-License-Identifier: Proprietary
// shadow.vert — position-only pass-through for CPU-projected shadow geometry.
// Vertices arrive already projected onto the ground plane by DrawShadowMesh().

#version 330 core

layout(location = 0) in vec3 aPosition;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

void main() {
    gl_Position = uProj * uView * vec4(aPosition, 1.0);
}
