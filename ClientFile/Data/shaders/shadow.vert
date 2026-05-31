#version 330 core

// Projected-quad shadow. Same as static mesh shader but world matrix
// pre-flattens onto the ground plane.

layout(location = 0) in vec3 aPosition;
layout(location = 2) in vec2 aTexCoord;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

uniform mat4 uWorld;

out vec2 vUV;

void main() {
    gl_Position = uProj * uView * uWorld * vec4(aPosition, 1.0);
    vUV         = aTexCoord;
}
