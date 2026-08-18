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

// Phase B: CPU-driven alpha-test threshold. 0 (default) → fall back to 0.01 (the
// historical "drop only authored alpha=0 holes" behavior for case-0 translucent and
// g_bForceAlphaTestMesh draws). DrawMesh sets 0.25 for case-2 (legacy EnableAlphaTest)
// so the hard cutout (World95 atmospherics, foliage) survives the Core flip where FF
// glAlphaFunc(GL_GREATER,0.25) disappears. GLSL 330 forbids initializers; CPU sets it
// every Flush (location -1 = safe no-op on shaders that lack it).
uniform float uAlphaTestRef;

// ---------------------------------------------------------------------------
// Kapocha-compatible texture animation (CEFFECT_RENDER_MESH_INFO). Ported
// verbatim from mesh.frag — see that file for the full rationale. This shader
// (pipeAlpha, legacyBlend 0/2 with an RGBA/translucent texture) is the pipe
// most opaque CEffect base meshes actually land on in practice (DrawSimpleMesh
// routes any alphaTexture==true draw here instead of to mesh.frag/pipeLit), so
// without this block a CEffect weapon's data-authored AnimType/tint/SwapMode
// was silently invisible whenever its base texture had an alpha channel —
// which is the common case, not the exception.
//
// uAnimMode: 0=off 1=scrollU 2=scrollV 3=scrollBoth 4=frameGrid 5=pulse
// uSwapTexMode: 0=off 1=hardAlternate 2=pulseBlend
uniform int       uAnimMode;        // 0=disabled (default)
uniform float     uAnimTime;        // [0,∞) running seconds; set from gCurTime
uniform float     uAnimSpeed;       // speed multiplier (default 1.0)
uniform vec2      uFrameGrid;       // (cols, rows) for frameGrid; default (1,1)
uniform int       uSwapTexMode;     // 0=disabled (default)
uniform float     uSwapThreshold;   // blend threshold for pulseBlend (default 0.5)
uniform sampler2D uTexAlt;          // alternative texture for swap modes

// Per-item RGB tint from CEFFECT_RENDER_MESH_INFO (ColorR/G/B). CPU sets this
// every Flush; (1,1,1) for meshes without an effect entry → strict no-op.
uniform vec3 uTint;

vec2 ApplyUVAnimation(vec2 texCoord) {
    if (uAnimMode == 0) return texCoord;

    vec2 offset = vec2(0.0);

    if (uAnimMode == 1) {
        offset.x = mod(uAnimTime * uAnimSpeed, 1.0);
    } else if (uAnimMode == 2) {
        offset.y = mod(uAnimTime * uAnimSpeed, 1.0);
    } else if (uAnimMode == 3) {
        offset = mod(uAnimTime * uAnimSpeed * vec2(1.0, 0.5), 1.0);
    } else if (uAnimMode == 4) {
        float frameIndex = mod(floor(uAnimTime * uAnimSpeed * 30.0),
                               uFrameGrid.x * uFrameGrid.y);
        float row = floor(frameIndex / uFrameGrid.x);
        float col = mod(frameIndex, uFrameGrid.x);
        offset = vec2(col / uFrameGrid.x, row / uFrameGrid.y);
    }
    // Mode 5 (pulse): brightness-only, no UV change — see ApplyPulseBrightness().

    return fract(texCoord + offset);
}

// Mode 5 (pulse): spec formula, 0.2 + 0.7*sin(t*speed), range 0.2..0.9. 1.0
// (no-op) for every other uAnimMode. Matches mesh.frag.
//
// DELIBERATE DIVERGENCE FROM mesh_bright.frag -- DO NOT "UNIFY" THIS. The
// additive path (BlendMode=66) uses a different, conscious "electric
// crackle" reinterpretation there instead of this formula -- already
// shipped, already audited as intentional, not a bug. See that file's
// AnimMode==5 branch for the full rationale.
float ApplyPulseBrightness() {
    if (uAnimMode != 5) return 1.0;
    return 0.2 + 0.7 * sin(uAnimTime * uAnimSpeed);
}

// Blend between primary texture (color0) and uTexAlt based on swap mode.
vec4 ApplyTextureSwap(vec2 texCoord, vec4 color0) {
    if (uSwapTexMode == 0) return color0;

    vec4 color1 = texture(uTexAlt, texCoord);

    if (uSwapTexMode == 1) {
        float phase = mod(uAnimTime * uAnimSpeed, 2.0);
        return mix(color0, color1, step(1.0, phase));
    } else if (uSwapTexMode == 2) {
        float blend = (sin(uAnimTime * uAnimSpeed * 6.2831853) + 1.0) * 0.5;
        return mix(color0, color1, blend);
    }

    return color0;
}

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};

out vec4 fragColor;

void main() {
    vec2 animUV = ApplyUVAnimation(vUV);
    vec4 texel = texture(uTex, animUV);
    texel = ApplyTextureSwap(animUV, texel);
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
    // Phase B: case-2 cutout uses 0.25 (FF match); everything else keeps the 0.01 floor.
    float alphaRef = (uAlphaTestRef > 0.0) ? uAlphaTestRef : 0.01;
    if (c.a < alphaRef) discard;
    // Apply per-item RGB tint (Kapocha ColorR/G/B) and mode-5 pulse brightness.
    // Both are strict no-ops ((1,1,1) / 1.0) for every mesh without an effect
    // entry, so this is unchanged behavior for all non-CEffect alpha-test draws.
    c.rgb *= uTint;
    c.rgb *= ApplyPulseBrightness();
#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    // FoW radial fade intentionally NOT applied to objects (objects keep full colour).
    fragColor = c;
}
