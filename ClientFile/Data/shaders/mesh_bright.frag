#version 330 core

// Mesh fragment shader for the BMD additive (RENDER_BRIGHT) path.
//
// Pipeline state from MakeMeshBright:
//   blend = GL_ONE / GL_ONE additive
//   depthWrite = false
//   cull = none
//
// The legacy effect renderer pairs additive blending with
// glAlphaFunc(GL_GREATER, 0.0) (or sometimes 0.25), which discards the
// fully-transparent border pixels of effect textures. Without that the
// alpha=0 pixels still execute the fragment write, and any color in
// them (even RGB=0) competes with depth/blend in subtle ways. Worse,
// if a state leak elsewhere flips off blending mid-frame, those alpha=0
// pixels render as opaque black squares — which is exactly the symptom
// users see on Ice Storm / aura / glow effects.
//
// Use a low threshold (0.01) so genuine glow tails (alpha=0.05..0.5)
// still contribute additively while only the hard-zero borders are
// clipped.

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

// 2026-05-27: Output RGB multiplier. CPU sets this via SetUniformFloat
// in DrawMesh::Flush — defaults to 1.0 (no change) for world/hero/skill
// bright renders. The inventory grid bumps it to ~1.7 for chrome
// additive contribution that needs to match legacy intensity. GLSL 330
// doesn't allow default uniform initializers; CPU must set every Flush.
uniform float uBrightMult;

// Per-item RGB tint from CEFFECT_RENDER_MESH_INFO (ColorR/G/B).
// CPU sets this every Flush: effect items get their authored tint, all
// other meshes get (1,1,1) → strict no-op. GLSL 330 forbids defaults.
uniform vec3 uTint;

// Kapocha lightning effect overrides. CPU sets g_FxEffectCut=1 + anim params
// before the effect mesh Flush, then resets to 0. Inert for all other meshes.
uniform int   uEffectCut;   // 1 = discard near-black texels (kills dark-bg ghost)
uniform int   uAnimMode;    // 0 off, 1 scrollU, 2 scrollV, 3 both, 4 frameGrid, 5 pulse
uniform float uAnimTime;    // seconds (WorldTime * 0.001)
uniform float uAnimSpeed;   // scroll UV/sec (modes 1-3) OR frame rate (mode 4) OR pulse speed (mode 5)
uniform vec2  uFrameGrid;   // (cols, rows) for frameGrid mode 4; (1,1) = static / other modes
uniform float uFxGlow;      // GlowLevel multiplier (default 1.0 = neutral)

// Kapocha-compatible texture swap (CEFFECT_RENDER_MESH_INFO::SwapMode). Ported
// verbatim from mesh.frag's ApplyTextureSwap (see that file for the opaque-path
// counterpart) so the additive overlay path (BlendMode=66) gets the same
// SwapMode=1 (hardAlternate) / SwapMode=2 (pulseBlend) behavior as the opaque
// base mesh (BlendMode=2), instead of the old CPU-side full-texture toggle.
// uSwapTexMode==0 (default) is a strict no-op — uTexAlt is never sampled.
uniform int       uSwapTexMode;     // 0=disabled (default) 1=hardAlternate 2=pulseBlend
uniform float     uSwapThreshold;   // blend threshold for pulseBlend (default 0.5)
uniform sampler2D uTexAlt;          // alternative texture for swap modes

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};

out vec4 fragColor;

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

void main() {
    vec2  _uv     = vUV;
    float _bright = 1.0;

    if (uAnimMode == 1) {
        _uv.x = fract(_uv.x + mod(uAnimTime * uAnimSpeed, 1.0));
    } else if (uAnimMode == 2) {
        _uv.y = fract(_uv.y + mod(uAnimTime * uAnimSpeed, 1.0));
    } else if (uAnimMode == 3) {
        _uv.x = fract(_uv.x + mod(uAnimTime * uAnimSpeed,       1.0));
        _uv.y = fract(_uv.y + mod(uAnimTime * uAnimSpeed * 0.5, 1.0));
    } else if (uAnimMode == 4) {
        // Frame-grid animation: advance through a sprite sheet.
        // Frame index: floor(t * speed * 30) mod (cols * rows).
        // t * speed * 30 converts speed (frames/sec in the DLL) to our time base.
        float total = max(uFrameGrid.x * uFrameGrid.y, 1.0);
        float idx   = mod(floor(uAnimTime * uAnimSpeed * 30.0), total);
        float col   = mod(idx, uFrameGrid.x);
        float row   = floor(idx / uFrameGrid.x);
        _uv = vUV / uFrameGrid + vec2(col / uFrameGrid.x, row / uFrameGrid.y);
    } else if (uAnimMode == 5) {
        // AnimType=5 = brillo pulsante, sin cambio de UV (para que el envoltorio
        // con forma de arma nunca "resbale" como un fantasma). Tres sinusoides a
        // frecuencias inconmensurables dan un parpadeo erratico y vivo, en vez de
        // la respiracion regular de un seno unico.
        //
        // 2026-08-18: LA FRECUENCIA AHORA ES UN DATO (uAnimSpeed = FrameRate de la
        // fila), no una constante. Antes estaba fija en 9/23/53 rad/s -- el termino
        // dominante son ~8,4 Hz -- y se documento como divergencia DELIBERADA frente
        // a la formula spec del camino opaco, con esta justificacion textual:
        // "todas las filas AnimType=5 son BlendMode=66 y son todas armas electricas".
        // ESA PREMISA CADUCO: al dar de alta las alas nuevas, 29 de las 41 filas
        // AnimType=5 del catalogo son ALAS. A 8,4 Hz un ala no lee como electricidad,
        // lee como un estrobo -- que es justo lo que reporto el dueño
        // ("parpadeantes, rapidamente").
        //
        // Las frecuencias base son las originales divididas por 20, escaladas por
        // uAnimSpeed. Asi:
        //   FrameRate = 20.0 -> 9 / 23 / 53 rad/s = EXACTAMENTE el crackle de antes.
        //                       Es el valor que llevan ahora las 12 filas de arma.
        //   FrameRate =  1.0 -> 20x mas lento (dominante ~0,42 Hz) = pulso calmado.
        //                       Es el valor que llevan las 29 filas de ala.
        // Cada fila se ajusta sola desde CEffectRenderMesh.txt sin tocar el shader.
        float _s = max(uAnimSpeed, 0.0001);   // guarda: FrameRate 0 congelaria el pulso
        float _f = sin(uAnimTime * 0.45 * _s)        * 0.5
                 + sin(uAnimTime * 1.15 * _s + 1.7)  * 0.3
                 + sin(uAnimTime * 2.65 * _s + 0.5)  * 0.2;
        _bright = 0.40 + 0.60 * clamp(_f * 0.5 + 0.5, 0.0, 1.0);
    }

    vec4 texel = texture(uTex, _uv);
    // Apply texture swap blend between primary and alternate texture (no-op
    // when uSwapTexMode==0 — returns texel unchanged).
    texel = ApplyTextureSwap(_uv, texel);
    if (uEffectCut == 1 && max(max(texel.r, texel.g), texel.b) < 0.06) discard;
    vec4 c = texel * vColor;
    // 2026-05-27: Lowered discard threshold 0.01 → 0.001 for smooth particle
    // edges (Flame skill, Doorkeeper Titus fire). Hard 0.01 cutoff produced a
    // visible noisy boundary between "barely visible" and "discarded" pixels.
    if (c.a < 0.001) discard;
#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    c.rgb *= uBrightMult;
    // GlowLevel multiplier * pulse envelope (both are 1.0 for non-effect meshes).
    // Kapocha effect meshes (uEffectCut==1): GlowLevel up to 2.0 over-saturates
    // the GL_ONE/GL_ONE additive pass under GL3 ("dense burned light of rays").
    // Tame with an intensity factor, gated so non-effect bright meshes
    // (excellent/chrome/skills) are untouched. TUNABLE: lower if still too
    // bright, raise toward 1.0 if too dim.
    float _glow = uFxGlow;
    if (uEffectCut == 1) {
        const float uFxIntensity = 0.6;   // <-- tune kapocha effect brightness here
        _glow = uFxGlow * uFxIntensity;
    }
    c.rgb *= _glow * _bright;
    // Apply per-item RGB tint (Kapocha ColorR/G/B). CPU writes (1,1,1) for
    // meshes without an effect entry → strict no-op for all other bright meshes.
    c.rgb *= uTint;
    // FoW radial fade intentionally NOT applied to objects (objects keep full colour).
    fragColor = c;
}
