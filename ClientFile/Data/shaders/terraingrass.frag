#version 330 core

// Terrain grass billboard fragment shader.
//
// One sampled tap per fragment from a 3-layer GL_TEXTURE_2D_ARRAY built
// in BuildTerrainGPU (BITMAP_MAPGRASS+0/1/2). Alpha-test discard at the
// legacy 0.25 threshold (matches BMD/sprite paths). Output colour is
// the texture pre-multiplied by the per-cell PrimaryTerrainLight
// (sampled in the vertex shader and interpolated as vColor).

in vec2 vUV;
in vec3 vColor;
in vec3 vWorldPos;
flat in uint vLayer;

uniform sampler2DArray uGrass;

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};

out vec4 fragColor;

void main() {
    vec4 tex = texture(uGrass, vec3(vUV, float(vLayer)));
    if (tex.a < 0.25) discard;
    vec4 c = vec4(tex.rgb * vColor, tex.a);
    // Fog of war: radial darken to black beyond the entity visibility radius.
    // Keep the blade alpha (its shape) and only darken rgb so blades read as
    // black against the (also-darkened) terrain. Guard: w<=0 → no fade.
    if (uVisibility.w > 0.0) {
        vec2  worldXYTiles = vWorldPos.xy * 0.01;
        float distTiles    = length(worldXYTiles - uVisibility.xy);
        float visFactor    = 1.0 - smoothstep(uVisibility.z, uVisibility.w, distTiles);
        c.rgb *= visFactor;
    }
    fragColor = c;
}
