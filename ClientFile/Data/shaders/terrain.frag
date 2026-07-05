#version 330 core

// Terrain fragment shader — per-tile texture variety via sampler2DArray.
//
// uTileArray   — 2D texture array (depth=64), each layer is one tile texture.
// uAlphaMap    — 256x256 R8 splat weight; alpha=0 → base, alpha=1 → overlay.
// uWaterMove   — UV scroll offset; applied per-cell using vIsWater.
// uAlphaTestEnabled — 1 only for map-specific alpha-test textures (e.g. Kanturu).
//
// Legacy terrain shading only: diffuse tile * baked vertex light (vColor), with the
// Layer-2 overlay alpha-blended over the base. (The opt-in per-tile PBR path was
// removed — terrain renders the classic MU look.)

in vec4 vColor;
in vec2 vUV0;
in vec2 vUV1;
in vec3 vViewPos;
in vec3 vWorldPos;
flat in uint vLayer0;
flat in uint vLayer1;
flat in uint vIsWater;  // bit 0 = base layer is water, bit 1 = overlay is water
flat in float vWindV;   // per-cell TerrainGrassWind sample for V-axis wobble

uniform sampler2DArray uTileArray;
uniform sampler2D      uAlphaMap;

// Per-layer UV scale packed into TerrainBlock UBO (binding=3). .xy = scaleX/scaleY.
layout(std140) uniform TerrainBlock {
    vec4 uTileUVScale[64];   // must match TerrainBlockGPU / kMaxTileArrayLayers
};

#ifdef FOG_ENABLED
layout(std140) uniform FogBlock {
    vec4 uFogColorRGBA;
    vec4 uFogParams;   // x=start, y=end, z=enabled(0|1), w=unused
};
#endif

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};

uniform float uWaterMove;
uniform int   uAlphaTestEnabled;

out vec4 fragColor;

void main() {
    vec2 uvBase    = vUV0 * uTileUVScale[vLayer0].xy;
    vec2 uvOverlay = vUV0 * uTileUVScale[vLayer1].xy;

    // Per-layer water UV scroll (legacy parity; see git history for rationale).
    if ((vIsWater & 1u) != 0u) {
        uvBase.x += uWaterMove;
        uvBase.y += vWindV * 0.002;
    }
    if ((vIsWater & 2u) != 0u) {
        uvOverlay.x += uWaterMove;
        uvOverlay.y += vWindV * 0.002;
    }

    vec4 base    = texture(uTileArray, vec3(uvBase,    float(vLayer0)));
    vec4 overlay = texture(uTileArray, vec3(uvOverlay, float(vLayer1)));
    float alpha  = texture(uAlphaMap, vUV1).r;

    if (uAlphaTestEnabled == 1 && base.a < 0.25) discard;

    // Continuous-weight Layer-2 overlay blend with soft alpha-test (legacy parity).
    float fragAlpha = overlay.a * alpha;
    fragAlpha *= smoothstep(0.0, 0.15, fragAlpha);

    vec3 colBase    = base.rgb    * vColor.rgb;
    vec3 colOverlay = overlay.rgb * vColor.rgb;

    vec3 color = mix(colBase, colOverlay, fragAlpha);

#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    color = mix(uFogColorRGBA.rgb, color, fogF);
#endif

    vec4 c = vec4(color, 1.0);
    // Fog of war: radial darken to black beyond the entity visibility radius.
    if (uVisibility.w > 0.0) {
        vec2  worldXYTiles = vWorldPos.xy * 0.01;
        float distTiles    = length(worldXYTiles - uVisibility.xy);
        float visFactor    = 1.0 - smoothstep(uVisibility.z, uVisibility.w, distTiles);
        c.rgb *= visFactor;
    }
    fragColor = c;
}
