#version 330 core

// Terrain grass billboard vertex shader.
//
// Each cell with TerrainMappingLayer1 in [0, kGrassLayers) produces one
// billboard quad standing UPRIGHT from the ground plane. The CPU side
// (BuildGrassFrame in DrawTerrain.cpp) bakes the swayed/leaned position
// directly into aPosition for each vertex — top corners already include
// the per-cell TerrainGrassWind Y offset and the legacy -50 X lean. This
// keeps the shader stupid simple and avoids needing a per-cell wind
// texture upload (the wind data is rebuilt on CPU each frame inside
// InitTerrainLight, so we read it inline at VBO build time).
//
// aMeta carries the cell index (.xy) used for primary-light sampling and
// the grass texture-array layer (.z) chosen from TerrainMappingLayer1.

layout(location = 0)  in vec3  aPosition;
layout(location = 2)  in vec2  aTexCoord0;
layout(location = 14) in uvec4 aMeta;     // .x=cellX, .y=cellY, .z=layer, .w=pad

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

uniform sampler2D uPrimaryLight;          // 256x256 RGB8, dynamic

out vec2 vUV;
out vec3 vColor;
out vec3 vWorldPos;  // world-space position for fog-of-war visibility fade
flat out uint vLayer;

void main() {
    gl_Position = uProj * uView * vec4(aPosition, 1.0);
    vWorldPos   = aPosition;
    vUV = aTexCoord0;
    // Sample the per-cell baked light. Same texture the base terrain
    // pipeline uses, so grass tints stay consistent with the floor under
    // it (day/night, fire glow, skill cast aura).
    ivec2 cellXY = ivec2(aMeta.xy);
    cellXY = clamp(cellXY, ivec2(0), ivec2(255));
    vColor = texelFetch(uPrimaryLight, cellXY, 0).rgb;
    vLayer = aMeta.z;
}
