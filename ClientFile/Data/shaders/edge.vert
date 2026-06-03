#version 330 core

// Stencil-based outline pass (vertex). Draws the silhouette mesh expanded
// outward along its normal by a per-mesh distance.

layout(location = 0) in vec3 aPosition;
layout(location = 3) in vec3 aNormal;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

uniform mat4  uWorld;
uniform float uExpand;    // edge thickness in world units

void main() {
    vec3 expanded = aPosition + aNormal * uExpand;
    gl_Position   = uProj * uView * uWorld * vec4(expanded, 1.0);
}
