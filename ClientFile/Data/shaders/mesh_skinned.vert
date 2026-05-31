#version 330 core

// GPU-skinned mesh vertex shader (Phase-2 perf path).
//
// aBoneIDs / aBoneWeights drive a 4-bone blend (in practice the engine
// uses 1 bone per vertex, but the shader supports up to 4).
// uBonePalette is laid out as a UBO of mat3x4 to keep the uniform block
// size manageable: 64 bones × 48 bytes = 3 KB.

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec4 aColor;
layout(location = 2) in vec2 aTexCoord;
layout(location = 3) in vec3 aNormal;
layout(location = 6) in uvec4 aBoneIDs;
layout(location = 7) in vec4  aBoneWeights;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

#define MAX_BONES 64

layout(std140) uniform BonePalette {
    mat3x4 uBones[MAX_BONES];   // mat3x4 = 3 cols × 4 rows = 12 floats per bone
};

uniform mat4 uWorld;
uniform vec2 uTexCoordOffset;

out vec3 vViewPos;   // view-space position (camera at origin) for fog distance — legacy GL_FOG parity
out vec3 vWorldPos;  // world-space position for fog-of-war visibility fade
out vec3 vNormal;
out vec4 vColor;
out vec2 vUV;

mat4 boneMatFor(uint id) {
    mat3x4 m = uBones[id];
    return mat4(
        m[0][0], m[0][1], m[0][2], 0.0,
        m[1][0], m[1][1], m[1][2], 0.0,
        m[2][0], m[2][1], m[2][2], 0.0,
        m[0][3], m[1][3], m[2][3], 1.0
    );
}

void main() {
    mat4 skin =
        boneMatFor(aBoneIDs.x) * aBoneWeights.x +
        boneMatFor(aBoneIDs.y) * aBoneWeights.y +
        boneMatFor(aBoneIDs.z) * aBoneWeights.z +
        boneMatFor(aBoneIDs.w) * aBoneWeights.w;

    vec4 localPos = skin * vec4(aPosition, 1.0);
    vec4 worldPos = uWorld * localPos;
    vec4 viewPos  = uView * worldPos;

    gl_Position = uProj * viewPos;
    vViewPos    = viewPos.xyz;
    vWorldPos   = worldPos.xyz;
    vNormal     = mat3(uWorld) * (mat3(skin) * aNormal);
    vColor      = aColor;
    vUV         = aTexCoord + uTexCoordOffset;
}
