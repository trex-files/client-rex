#version 330 core

// Instanced particle quad. One unit-quad VBO + per-instance attributes.
// Each instance carries: world-space position, scale, color, atlas UV.
// The vertex shader builds a camera-aligned quad from cameraRight/Up
// extracted from uView's transpose.

// Per-vertex (unit quad):
layout(location = 0) in vec2  aCorner;     // (-1,-1) (1,-1) (1,1) (-1,1)   — Position slot
layout(location = 2) in vec2  aCornerUV;   // (0,1) (1,1) (1,0) (0,0)       — TexCoord0 slot

// Per-instance (slot assignments match VertexAttribLocation in GL3Backend):
// InstanceWorld0 (loc 8) packs pos(xyz) + scale(w) as one vec4.
layout(location = 8)  in vec4  aInstancePosScale; // InstanceWorld0 slot: xyz=pos, w=scale
layout(location = 12) in vec4  aInstanceColor;    // InstanceColor slot
layout(location = 13) in vec4  aInstanceUVRect;   // InstanceData slot — (u, v, uw, vh)

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

out vec2 vUV;
out vec4 vColor;

void main() {
    // Extract camera right/up from view matrix (rows 0 and 1 of inverse view = cols 0,1 of view^T)
    vec3 cameraRight = vec3(uView[0][0], uView[1][0], uView[2][0]);
    vec3 cameraUp    = vec3(uView[0][1], uView[1][1], uView[2][1]);

    vec3 worldPos = aInstancePosScale.xyz
        + cameraRight * (aCorner.x * aInstancePosScale.w)
        + cameraUp    * (aCorner.y * aInstancePosScale.w);

    gl_Position = uProj * uView * vec4(worldPos, 1.0);
    vUV    = aInstanceUVRect.xy + aCornerUV * aInstanceUVRect.zw;
    vColor = aInstanceColor;
}
