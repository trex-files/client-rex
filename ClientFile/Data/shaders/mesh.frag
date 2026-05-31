#version 330 core

// Standard textured-lit BMD fragment shader.
// vColor is the engine-prebaked LightTransform value (per-vertex pre-lit).
// Alpha is fully packed into vColor.a (F2B(alpha) per vertex) — no uAlpha uniform.
// Final pixel = texel * vertex_color (matches legacy GL_MODULATE).

in vec2 vUV;
in vec4 vColor;
in vec3 vViewPos;   // view-space position from vert (camera at origin) — fog distance
in vec3 vWorldPos;

#ifdef FOG_ENABLED
layout(std140) uniform FogBlock {
    vec4 uFogColorRGBA;
    vec4 uFogParams;   // x=start, y=end, z=enabled(0|1), w=unused
};
#endif

uniform sampler2D uTex;

// LEGACY MATCH 2026-05-26: RGB-cut removed entirely per user request.
// Legacy fixed-function pipeline has NO RGB threshold — only alpha
// (via glAlphaFunc). The previous GL3 RGB-cut was a defensive workaround
// for JPG-additive sprites that got misrouted onto an alpha-blend
// pipeline (showed black borders as opaque squares). The correct fix is
// pipeline routing (additive sprites → additive pipeline) NOT a shader
// cut that ate authored dark content from random meshes.
//
// uSkipRgbCut is kept as a NOOP uniform so DrawMesh.cpp can keep setting
// it without compiler warnings; it has no effect now that the cut is gone.
uniform int uSkipRgbCut;

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    vec4 c = texel * vColor;
#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    // Fog of war: radial fade to black beyond the entity visibility radius.
    // Guard: w<=0 means the UBO hasn't been uploaded yet → full visibility.
    if (uVisibility.w > 0.0) {
        // Structures fade with the world-space depth fog (gradual to black at
        // the horizon), staying opaque (no alpha fade) so they read as dark
        // silhouettes, not transparent holes. Per-entity fade-out for moving
        // chars/npcs is handled CPU-side via o->Alpha (see ZzzCharacter).
        vec2  worldXYTiles = vWorldPos.xy * 0.01;
        float distTiles    = length(worldXYTiles - uVisibility.xy);
        float visFactor    = 1.0 - smoothstep(uVisibility.z, uVisibility.w, distTiles);
        c.rgb *= visFactor;
    }
    fragColor = c;
}
