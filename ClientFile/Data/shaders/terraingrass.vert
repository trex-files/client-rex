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
// [render-port Fase 1.3] Analytic grass wind. When uWindAnalytic != 0 the CPU
// bakes the grass billboard top corners WITHOUT the per-cell wind Y offset, so
// the built geometry is fully static per (camera view, map) and the VBO can be
// cached across frames (the per-frame BuildGrassFrame walk is the biggest CPU
// cost in open scenes). The top corners then sway HERE using the same legacy
// formula:  windY = sin(uTerrainWindP.x + col*uTerrainWindP.y) * uTerrainWindP.z
// keyed off the vertex's source wind column (aMeta.x). When uWindAnalytic == 0
// the CPU bakes the sway as before and this shader does nothing — bit-for-bit
// identical default behaviour. uTerrainWindP: x=WindSpeed, y=xMul, z=scale.
uniform vec3 uTerrainWindP;
uniform int  uWindAnalytic;               // 0 = CPU-baked sway (default), 1 = shader sway

out vec2 vUV;
out vec3 vColor;
out vec3 vWorldPos;  // world-space position for fog-of-war visibility fade
flat out uint vLayer;

void main() {
    vec3 pos = aPosition;
    // [render-port Fase 1.3] Top vertices (V==0, aTexCoord0.y < 0.5) sway with
    // wind in the analytic path; bottom vertices stay pinned to the ground.
    // Matches legacy: only top corners got the wind Y offset, and the legacy
    // "top-right uses the SE/gx+1 wind column" quirk is preserved because TR
    // carries aMeta.x = gx+1 (its source wind column).
    if (uWindAnalytic != 0 && aTexCoord0.y < 0.5) {
        pos.y += sin(uTerrainWindP.x + float(aMeta.x) * uTerrainWindP.y)
               * uTerrainWindP.z;
    }
    gl_Position = uProj * uView * vec4(pos, 1.0);
    vWorldPos   = pos;
    vUV = aTexCoord0;
    // Sample the per-cell baked light. Same texture the base terrain
    // pipeline uses, so grass tints stay consistent with the floor under
    // it (day/night, fire glow, skill cast aura).
    ivec2 cellXY = ivec2(aMeta.xy);
    cellXY = clamp(cellXY, ivec2(0), ivec2(255));
    vColor = texelFetch(uPrimaryLight, cellXY, 0).rgb;
    vLayer = aMeta.z;
}
