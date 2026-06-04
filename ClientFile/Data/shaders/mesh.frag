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

// ---------------------------------------------------------------------------
// Kapocha-compatible texture animation (CEFFECT_RENDER_MESH_INFO)
// ---------------------------------------------------------------------------
// These uniforms are set per-draw by the Kapocha mesh effect renderer when
// AnimType != 0 or SwapMode != 0. All default to "disabled" values so every
// non-effect draw is a strict no-op (uAnimMode==0 → ApplyUVAnimation returns
// texCoord unchanged; uSwapTexMode==0 → ApplyTextureSwap returns color0).
//
// CPU-side counterpart: CEffectRenderMeshAnim.h::ComputeUv() computes
// uTexCoordOffset / uTexScale (fed to the vertex shader) for the testable
// scroll/frame-grid path. This GPU path is the in-shader fallback; both work.
//
// Mode encoding mirrors CEFFECT_RENDER_MESH_INFO::AnimType:
//   uAnimMode: 0=off 1=scrollU 2=scrollV 3=scrollBoth 4=frameGrid 5=pulse
//   uSwapTexMode: 0=off 1=hardAlternate 2=pulseBlend
uniform int       uAnimMode;        // 0=disabled (default)
uniform float     uAnimTime;        // [0,∞) running seconds; set from gCurTime
uniform float     uAnimSpeed;       // speed multiplier (default 1.0)
uniform vec2      uFrameGrid;       // (cols, rows) for frameGrid; default (1,1)
uniform int       uSwapTexMode;     // 0=disabled (default)
uniform float     uSwapThreshold;   // blend threshold for pulseBlend (default 0.5)
uniform sampler2D uTexAlt;          // alternative texture for swap modes

// Compute animated UV offset for the five animation modes.
// Returns texCoord unchanged when uAnimMode == 0 (backward-compat guarantee).
vec2 ApplyUVAnimation(vec2 texCoord) {
    if (uAnimMode == 0) return texCoord;

    vec2 offset = vec2(0.0);

    if (uAnimMode == 1) {
        // Scroll U (horizontal)
        offset.x = mod(uAnimTime * uAnimSpeed, 1.0);
    } else if (uAnimMode == 2) {
        // Scroll V (vertical)
        offset.y = mod(uAnimTime * uAnimSpeed, 1.0);
    } else if (uAnimMode == 3) {
        // Scroll both (diagonal — U full speed, V half speed)
        offset = mod(uAnimTime * uAnimSpeed * vec2(1.0, 0.5), 1.0);
    } else if (uAnimMode == 4) {
        // Frame-grid: sprite sheet advancing at uAnimSpeed frames/sec.
        // uFrameGrid.x = cols, uFrameGrid.y = rows.
        float frameIndex = mod(floor(uAnimTime * uAnimSpeed),
                               uFrameGrid.x * uFrameGrid.y);
        float row = floor(frameIndex / uFrameGrid.x);
        float col = mod(frameIndex, uFrameGrid.x);
        offset = vec2(col / uFrameGrid.x, row / uFrameGrid.y);
    }
    // Mode 5 (pulse): UV unchanged — only color/alpha is modulated; handled
    // via vColor.a on the CPU side; no UV offset needed here.

    return fract(texCoord + offset);
}

// Blend between primary texture (color0) and uTexAlt based on swap mode.
// Returns color0 unchanged when uSwapTexMode == 0.
vec4 ApplyTextureSwap(vec2 texCoord, vec4 color0) {
    if (uSwapTexMode == 0) return color0;

    vec4 color1 = texture(uTexAlt, texCoord);

    if (uSwapTexMode == 1) {
        // Hard alternate: toggle every 1/uAnimSpeed seconds.
        float phase = mod(uAnimTime * uAnimSpeed, 2.0);
        return mix(color0, color1, step(1.0, phase));
    } else if (uSwapTexMode == 2) {
        // Pulse blend: smooth sine cross-fade.
        float blend = (sin(uAnimTime * uAnimSpeed * 6.2831853) + 1.0) * 0.5;
        return mix(color0, color1, blend);
    }

    return color0;
}

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

// Per-item RGB tint from CEFFECT_RENDER_MESH_INFO (ColorR/G/B).
// CPU side sets this every Flush (GLSL 330 forbids default initializers).
// When no effect is registered the CPU writes (1,1,1) → strict no-op.
// Meshes that don't declare this uniform get location -1 on CPU side →
// SetUniformVec3 is a safe no-op (identical to uSkipRgbCut pattern above).
uniform vec3 uTint;

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};

out vec4 fragColor;

void main() {
    // Apply GPU-side UV animation (no-op when uAnimMode==0).
    vec2 animUV = ApplyUVAnimation(vUV);
    vec4 texel = texture(uTex, animUV);
    // Apply texture swap blend between primary and alternate texture (no-op
    // when uSwapTexMode==0 — returns texel unchanged).
    texel = ApplyTextureSwap(animUV, texel);
    vec4 c = texel * vColor;
    // Apply per-item RGB tint (Kapocha ColorR/G/B). CPU sets uTint=(1,1,1)
    // for meshes without an effect entry → strict no-op for all other meshes.
    c.rgb *= uTint;
#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    // FoW radial fade intentionally NOT applied to objects (objects keep full colour).
    fragColor = c;
}
