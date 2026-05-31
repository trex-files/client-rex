#version 330 core

// Static / pre-skinned mesh vertex shader. Used for:
//   - decoration meshes (no skeleton)
//   - characters where skinning was already done CPU-side (parity-first
//     migration path described in research §4.1).
//
// aColor carries the engine's pre-baked LightTransform[i][j] values
// (lighting is fully CPU-baked — no normal attribute needed here).
// aTexCoord is the texture UV with optional Wave offset applied per draw.
//
// uWorld is the per-draw world matrix.

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec4 aColor;
layout(location = 2) in vec2 aTexCoord;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

uniform mat4 uWorld;
uniform vec2 uTexCoordOffset;   // for RENDER_WAVE textures

out vec4 vColor;
out vec2 vUV;
out vec3 vViewPos;   // view-space position (camera at origin) for fog distance — legacy GL_FOG parity
out vec3 vWorldPos;  // world-space position for fog-of-war visibility fade

void main() {
    vec4 worldPos = uWorld * vec4(aPosition, 1.0);
    vec4 viewPos  = uView * worldPos;
    gl_Position   = uProj * viewPos;
    vColor        = aColor;
    vUV           = aTexCoord + uTexCoordOffset;
    vViewPos      = viewPos.xyz;
    vWorldPos     = worldPos.xyz;
}
