#version 330 core

// Terrain chunk vertex shader.
// Vertex layout: position, color (legacy baked light, now unused but kept
// for layout stability), texcoord0 (base layer), texcoord1 (alphamap u/v),
// and a Custom0 attribute (location 14) carrying per-tile texture-array
// layer indices packed as uvec4 (.x = layer0, .y = layer1).
//
// vColor is now sampled per-vertex from uPrimaryLight (a 256x256 RGB8 texture
// uploaded each frame from the legacy PrimaryTerrainLight global, NEAREST
// filter). This restores the per-frame dynamic lighting contract that
// glColor3fv(PrimaryTerrainLight[Index]) gave the immediate-mode pipeline:
// fire glow, skill cast tint, monster aura darkening, and day/night cycle
// all flow through this sampler instead of being frozen at chunk-build time.

layout(location = 0) in vec3  aPosition;
layout(location = 1) in vec4  aColor;     // legacy baked light — unused, kept for layout
layout(location = 2) in vec2  aTexCoord0;
layout(location = 4) in vec2  aTexCoord1;
layout(location = 14) in uvec4 aLayerSlots;  // .x = layer0, .y = layer1, .z = isWater (0/1)

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

uniform sampler2D uPrimaryLight;  // dynamic per-frame terrain light (slot 2)
uniform sampler2D uTerrainWind;   // dynamic per-frame TerrainGrassWind (slot 3)
                                  // R8, encoded signed [-64..+64] biased into u8

out vec4 vColor;
out vec2 vUV0;       // RAW world cell coords (gx..gx+1, gy..gy+1).
                     // Fragment shader multiplies by uTileUVScale[layer]
                     // to apply legacy `xf * (64/srcW)` per-source spread.
out vec2 vUV1;       // alpha-map UV (normalised 0..1 over full terrain)
out vec3 vViewPos;   // view-space position for fog distance
out vec3 vWorldPos;  // world-space position for fog-of-war visibility fade
flat out uint vLayer0;
flat out uint vLayer1;
flat out uint vIsWater;  // 1 on TW_WATER cells, 0 otherwise
flat out float vWindV;   // V-axis water wobble, decoded from uTerrainWind in
                         // the same units as TerrainGrassWind (~[-64..+64])

void main() {
    vec4 viewPos  = uView * vec4(aPosition, 1.0);
    gl_Position   = uProj * viewPos;
    vViewPos      = viewPos.xyz;
    vWorldPos     = aPosition;
    // aTexCoord1 carries the alpha-map UV which BuildTerrainGPU shifts by
    // +0.5/256 so the fragment shader's LINEAR sampler lands at TEXEL
    // CENTER (see project_terrain_alphamap_half_texel_offset). That offset
    // means `aTexCoord1 * 256 == gx + 0.5` for every corner — and `round`
    // of a half-integer is implementation-defined in GLSL (banker's rounding
    // on some drivers, round-half-up on others), so the recovered cell
    // index was off-by-one-or-zero per GPU. On Select Server (World94)
    // the playable boat sits in the centre of a 256-cell map and the cells
    // past the visible perimeter have PrimaryTerrainLight ≈ 0; with a
    // shifted cellXY the water cells sampled primary-light from those
    // dark border cells → vColor.rgb ≈ 0 → entire ocean rendered black.
    //
    // Use `floor` instead. For aTexCoord1 = (gx + 0.5)/256:
    //   floor(aTexCoord1 * 256) = floor(gx + 0.5) = gx (deterministic on
    //   every GLSL implementation, no half-integer ambiguity).
    // Restores the legacy per-vertex contract `glColor3fv(PrimaryTerrainLight[
    // gx + gy*256])` exactly.
    ivec2 cellXY  = ivec2(floor(aTexCoord1 * 256.0));
    cellXY        = clamp(cellXY, ivec2(0), ivec2(255));
    vec3 light    = texelFetch(uPrimaryLight, cellXY, 0).rgb;
    // Decode the biased u8 wind sample back to a signed float in the
    // same units as TerrainGrassWind. Encoding (DrawTerrain.cpp
    // UploadTerrainGrassWindTexture):
    //   byte = ((clamp(w, -64, +64) / 64) * 0.5 + 0.5) * 255
    // → decode: (byte/255 - 0.5) * 2 * 64. flat-interpolated so every
    // vertex of a tile sees the same per-cell amplitude (legacy applies
    // it per-tile in the immediate-mode loop).
    float windRaw = texelFetch(uTerrainWind, cellXY, 0).r;
    vWindV        = (windRaw - 0.5) * 2.0 * 64.0;
    // aColor is left wired through the layout for binding stability but
    // multiplied by zero so the optimiser cannot strip it (some drivers
    // disable the attribute slot when the shader has no live read,
    // which can mismatch the host-side VertexArray layout).
    vColor        = vec4(light, 1.0) + aColor * 0.0;
    vUV0          = aTexCoord0;
    vUV1          = aTexCoord1;
    vLayer0       = aLayerSlots.x;
    vLayer1       = aLayerSlots.y;
    vIsWater      = aLayerSlots.z;
}
