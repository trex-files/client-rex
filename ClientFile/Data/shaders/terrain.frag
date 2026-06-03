#version 330 core

// Terrain fragment shader — per-tile texture variety via sampler2DArray.
//
// uTileArray   — 2D texture array (depth=32), each layer is one tile texture.
// uAlphaMap    — 256x256 R8 splat weight; alpha=0 → base, alpha=1 → overlay.
//
// uWaterMove   — UV scroll offset; the fragment shader applies it per-cell
//                using vIsWater. vIsWater is a 2-bit field set CPU-side from
//                the RAW tile mapping (legacy parity, ZzzLodTerrain.cpp:
//                1546-1573):
//                  bit 0  → TerrainMappingLayer1[i] == 5 (water on BASE)
//                  bit 1  → TerrainMappingLayer2[i] == 5 (water on OVERLAY)
//                The two are independent so each layer's UV scrolls only if
//                that specific layer is water. Used to be `TerrainWall &
//                TW_WATER`, but that's a separate .att-file collision flag
//                that doesn't track tile mapping — Select Server (World94)
//                cells with Layer1==5 had no TW_WATER bit set, so water
//                rendered static (root-cause fix 2026-05-08).
// uAlphaTestEnabled — 1 only for map-specific alpha-test textures (e.g. Kanturu).

in vec4 vColor;
in vec2 vUV0;
in vec2 vUV1;
in vec3 vViewPos;
in vec3 vWorldPos;
flat in uint vLayer0;
flat in uint vLayer1;
flat in uint vIsWater;  // bit 0 = base layer is water, bit 1 = overlay is water
                        // (raw TerrainMappingLayer1/2 == 5; see header comment)
flat in float vWindV;   // per-cell TerrainGrassWind sample for V-axis wobble

uniform sampler2DArray uTileArray;
uniform sampler2D      uAlphaMap;

// Per-layer UV scale packed into TerrainBlock UBO (binding=3).
// std140 packs vec2 at vec4 stride — shader reads .xy only.
layout(std140) uniform TerrainBlock {
    vec4 uTileUVScale[32];   // .xy = scaleX/scaleY, .zw = padding
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

// uWaterMove is the legacy `WaterMove` global animated by ProcessTerrain
// (sin-driven UV offset; ZzzLodTerrain.cpp updates it every frame). The
// shader now applies it per-cell instead of per-pass: water cells get the
// scrolling overlay (matches legacy RenderTerrainTile logic at line 1559),
// non-water cells use static UVs. This means the additive water pass is
// no longer needed — single solid pass renders both correctly.
uniform float uWaterMove;
uniform int   uAlphaTestEnabled;

out vec4 fragColor;

void main() {
    // 2026-05-08: per-layer UV scale for legacy parity.
    // vUV0 is RAW world cell coords (gx..gx+1, gy..gy+1). The legacy
    // FaceTexture builds UV = (xf * Width, yf * Height) where Width =
    // 64/srcW per source bitmap. Scale base and overlay independently
    // because they can pick different layers with different source sizes.
    vec2 uvBase    = vUV0 * uTileUVScale[vLayer0].xy;
    vec2 uvOverlay = vUV0 * uTileUVScale[vLayer1].xy;

    // Per-layer water UV scroll. Legacy ZzzLodTerrain.cpp:1502-1521 adds
    // WaterMove to U and (TerrainGrassWind * 0.002) to V on each water
    // tile. The 0.008 multiplier from the legacy `Scale` branch only
    // fires for CTerrain::CalcUV(..., Scale=true) callers — none of the
    // standard RenderTerrainTile / RenderFaceAlpha paths reach the
    // chunked GL3 stream, so we use 0.002 to match the visible gameplay
    // path. Restores Atlans/Tarkan/PKField surface ripple V-axis
    // component (Gap #2 in the GL3 terrain audit).
    //
    // 2026-05-08: previously this gated on `vIsWater == 1u` and applied
    // the scroll to BOTH layers together. That broke Select Server water:
    // a cell with Layer1==5 (water) and Layer2==<dirt> would either get
    // no scroll (when the old TW_WATER check missed) or scroll the
    // overlay's dirt UV uselessly. The bitfield split lets each layer
    // animate only when it IS water — base scrolls when bit 0 is set,
    // overlay scrolls when bit 1 is set, and a base-water + overlay-water
    // cell gets both, identical to the legacy two-pass behaviour.
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

    // 2026-05-08: continuous-weight Layer-2 overlay blend (legacy parity).
    //
    // Legacy renders the overlay in a SECOND pass via RenderFaceAlpha
    // (ZzzLodTerrain.cpp:1439) → EnableAlphaTest() → glBlendFunc(GL_SRC_ALPHA,
    // GL_ONE_MINUS_SRC_ALPHA). The vertex_alpha is TerrainMappingAlpha
    // (per-vertex via VertexAlpha0..3 → glColor4f). Under default GL_MODULATE
    // texture combiner, the FRAGMENT'S effective alpha is
    //     fragAlpha = overlay.a * vertex.a = overlay.a * TerrainMappingAlpha
    // and the alpha-test (glAlphaFunc(GL_GREATER, 0.25), see
    // ZzzOpenglUtil.cpp:796) discards pixels with `fragAlpha <= 0.25`.
    // Surviving pixels then alpha-blend with weight = fragAlpha:
    //     final = base * (1 - fragAlpha) + overlay * fragAlpha
    //
    // The previous `step(0.25, overlay.a)` made the OVERLAY alpha BINARY
    // (1 or 0) and weighted only by the alphaMap → overlay rendered ~2x
    // heavier than legacy. Most visible on Stadium/Arena dirt-stone path
    // boundaries: the stone overlay drowned the dirt base, paths read as
    // a single flat slab instead of legacy's softer transition.
    //
    // Fix: take the modulated alpha CONTINUOUSLY and gate via the
    // legacy 0.25 threshold AFTER modulation, not before.
    float fragAlpha = overlay.a * alpha;          // modulated alpha
    if (fragAlpha <= 0.25) fragAlpha = 0.0;       // legacy alpha-test discard

    // Splat blend: fragAlpha=0 → base only, fragAlpha=1 → overlay only.
    vec3 splat = mix(base.rgb, overlay.rgb, fragAlpha);

    // Apply pre-baked vertex light (PrimaryTerrainLight).
    vec3 color = splat * vColor.rgb;

#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    color = mix(uFogColorRGBA.rgb, color, fogF);
#endif

    vec4 c = vec4(color, 1.0);
    // Fog of war: radial darken to black beyond the entity visibility radius.
    // Terrain stays OPAQUE (alpha=1) — only rgb is darkened — so the ground
    // reads solid black at the edge regardless of the per-map clear colour
    // (several maps clear to dark blue/purple, not black). Guard: w<=0 means
    // the UBO hasn't been uploaded (or was disabled for this phase) → no fade.
    if (uVisibility.w > 0.0) {
        // Gradual world-space depth fade: clear near the camera, darkening
        // SMOOTHLY to black at the far edge (uVisibility.w = horizon / terrain
        // render radius). The wide inner..outer band (set in DrawTerrain) makes
        // the whole visible range dim little by little so the horizon is smooth.
        vec2  worldXYTiles = vWorldPos.xy * 0.01;
        float distTiles    = length(worldXYTiles - uVisibility.xy);
        float visFactor    = 1.0 - smoothstep(uVisibility.z, uVisibility.w, distTiles);
        c.rgb *= visFactor;
    }
    fragColor = c;
}
