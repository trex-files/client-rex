#version 330 core

// 3D camera-space billboard. The CPU pre-rotated the corners to face the
// camera and packed them as 4 vertices in eye-space coordinates (the legacy
// code does VectorTransform(Position, CameraMatrix, p2) before glVertex3fv).
// We keep that convention: aPosition is already in eye-space.
//
// Projection is uProj alone — view is identity.

layout(location = 0) in vec3 aPosition;     // eye-space
layout(location = 1) in vec4 aColor;
layout(location = 2) in vec2 aTexCoord;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

out vec2 vUV;
out vec4 vColor;
out vec3 vEyePos;   // eye-space position for fog distance (legacy GL_FOG parity)

void main() {
    gl_Position = uProj * vec4(aPosition, 1.0);
    vUV     = aTexCoord;
    vColor  = aColor;
    vEyePos = aPosition;   // already in eye-space; length() = distance from camera
}
