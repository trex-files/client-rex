#version 330 core

// Mesh fragment shader with alpha-test discard (legacy
// glAlphaFunc(GL_GREATER, 0.25)). Used by foliage and pierced surfaces.
// Alpha is fully packed into vColor.a — no uAlpha uniform.

in vec2 vUV;
in vec4 vColor;
in vec3 vViewPos;   // view-space position (camera at origin) — fog distance
in vec3 vWorldPos;

#ifdef FOG_ENABLED
layout(std140) uniform FogBlock {
    vec4 uFogColorRGBA;
    vec4 uFogParams;   // x=start, y=end, z=enabled(0|1), w=unused
};
#endif

uniform sampler2D uTex;

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    vec4 c = texel * vColor;
    // 2026-05-15: threshold relaxed from 0.25 → 0.01.
    //
    // Legacy glAlphaFunc(GL_GREATER, 0.25) targeted JPG effect textures
    // with synthetic alpha; for RGBA character textures (Dark Horse
    // barding, dark armour, robes with semi-transparent edges) it was
    // too aggressive. When vColor.a (per-vertex F2B alpha bake) dipped
    // to 0.15-0.24 — which the engine assigns to soft-edge shadow folds
    // and joints — the multiply texel.a * vColor.a fell under 0.25 and
    // entire chest / shoulder / upper-leg geometry was discarded,
    // showing see-through holes to the rider underneath.
    //
    // 0.01 matches sprite3d.frag's contract: discard only fragments
    // whose final alpha is effectively zero. Semi-transparent armour
    // texels still alpha-blend (with depth-write ON so the rider doesn't
    // bleed through fully opaque pixels). Real alpha-cutout textures
    // (wing membrane holes authored as alpha=0) still discard cleanly.
    if (c.a < 0.01) discard;
#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    // FoW radial fade intentionally NOT applied to objects (objects keep full colour).
    fragColor = c;
}
