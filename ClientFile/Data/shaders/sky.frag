#version 330 core

// sky.frag — CHEAP night sky backdrop. Replicates the LEGACY MU night sky
// (RenderNightSkyGradient + RenderNightSkyStars + RenderNightSkyClouds, which
// still live in ZzzScene.cpp) but always-on, smoother, and with ZERO per-pixel
// cost beyond cheap FBM.
//
// WHY CHEAP (the prior version halved FPS):
//   The earlier shader ran a 64-step volumetric cloud raymarch (×6 light steps)
//   + a 16/8-step physical Rayleigh+Mie atmosphere PER PIXEL, and produced a
//   bright DAY sky with crepuscular "searchlight" god-rays. This rewrite has NO
//   raymarch and NO fixed N-step marches — the only loops are 5-octave 2D FBM.
//   Clouds are a flat 2D cloud-plane (intersect ray with a horizontal plane,
//   sample FBM), exactly the cheap analogue of the legacy drifting puffs.
//
// LEGACY LOOK PORTED:
//   • Gradient: per-map 3-stop dome (nadir/horizon/zenith). Horizon stop comes
//     from uHorizonColor (= GetFowHorizonColor, same values as the old dome);
//     zenith derived from it with the legacy ratio so each map keeps its hue
//     (Devias blue-cyan, Atlans/Hellas celeste, Tarkan/Aida near-black, default
//     violet-night).
//   • Stars: ~120-star feel — warm-white (1,1,0.92), small, additive glow,
//     VERY slow subtle twinkle, denser near the horizon band.
//   • Clouds: soft cottony puffs drifting slowly, per-map tint via uCloudTint
//     (white default / celeste Atlans-Devias / gray Elbeland), additive, faint.
//   * Moon: procedural disc + one-sided glow, GATED on uMoonVisible (drawn
//     only when the camera is tilted up; offscreen at the default angle).
//
// View ray: from uInvViewProj (= inverse(proj*view), computed once/frame on the
//   CPU — EngineBridge::GetInvViewProj). NO per-pixel inverse().
//
// World: terrain spans X,Y; height is Z (Z-up). Horizon = dir.z≈0, zenith = +Z.
//   The isometric camera sees a NARROW sky band at the top of the frame
//   (dir.z ≈ 0 .. ~0.6); the cloud plane height is tuned low so rays hit it.

#define PI 3.14159265

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------
in  vec2 vUV;
out vec4 fragColor;

// Camera UBO (binding 0) — only uCameraPos is read (ray uses uInvViewProj).
layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;   // .xyz = world position
};

// ---------------------------------------------------------------------------
// Loose uniforms (set per-frame by SkyPass::Render).
// ---------------------------------------------------------------------------
uniform mat4  uInvViewProj;     // inverse(proj*view) — CPU-computed once/frame

uniform vec3  uSunDir;          // moon direction (drives the moonlight glow + disc)
uniform float uSunIntensity;    // global brightness scale for stars/clouds (small)
uniform float uMoonVisible;     // 1 = draw moon (camera tilted up); 0 = skip (offscreen → wasted GPU)

uniform vec3  uHorizonColor;    // per-map HORIZON stop (dark, from GetFowHorizonColor)
uniform vec3  uSkyTint;         // multiplicative overall tint (default 1,1,1)
uniform vec3  uCloudTint;       // per-map cloud colour (white / celeste / gray)

uniform float uTime;            // seconds — cloud drift + star twinkle

uniform float uCloudCoverage;   // [0..1] coverage
uniform vec2  uWindDir;         // horizontal drift direction
uniform float uWindSpeed;       // world units / second

uniform vec3  uFogColor;        // void/ground haze colour (fills Z=0 map holes)
uniform float uFogStrength;     // [0..1] opacity of the void haze
uniform float uFowInner;        // FOW clear-core radius (tiles) — void haze fades from here
uniform float uFowOuter;        // FOW black radius (tiles) — void haze fully hidden at/after

// ===========================================================================
//  VIEW RAY  (no per-pixel inverse())
// ===========================================================================
vec3 viewRay() {
    vec2 ndc = vUV * 2.0 - 1.0;
    vec4 w = uInvViewProj * vec4(ndc, 1.0, 1.0);
    vec3 worldFar = w.xyz / w.w;
    return normalize(worldFar - uCameraPos.xyz);
}

// ===========================================================================
//  CHEAP 2D VALUE-NOISE + FBM  (the only loops in the shader)
// ===========================================================================
float hash2(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

// Smooth value noise (quintic fade → soft, cottony, no sharp ridges).
// NB: named vnoise2 (NOT noise2) — noise1..4 are reserved GLSL builtin names
// and collide on strict compilers (glslang rejects redefining them).
float vnoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);   // quintic smootherstep
    float a = hash2(i + vec2(0.0, 0.0));
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 5-octave FBM — soft, continuous cloud shape (smoother than the legacy fans).
float fbm2(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 5; ++i) {
        v   += amp * vnoise2(p * freq);
        freq *= 2.0;
        amp  *= 0.5;
    }
    return v;
}

// ===========================================================================
//  GRADIENT  (legacy 3-stop dome: nadir / horizon / zenith)
// ===========================================================================
// uHorizonColor is the per-map horizon stop. CALIBRATION (user, 2026-05-29):
// "MUY AZUL — acercarlo al NEGRO". The target is now NEAR-BLACK with only a
// faint blue tint — the zenith is almost pure black, the horizon a touch less
// dark but still very dark. We keep the angle-consistency (the whole dome is
// this one gradient) but pull the floors WAY down so the sky reads as a dark
// night, not a saturated blue dome.
vec3 nightGradient(vec3 dir) {
    // Near-black floors — only a faint blue tint remains. These are the minimum
    // tone the sky settles to even if a map's uHorizonColor were 0.
    const vec3 kNightFloor  = vec3(0.0030, 0.0050, 0.0110); // horizon floor (darker, less blue)
    const vec3 kZenithFloor = vec3(0.0010, 0.0018, 0.0042); // zenith floor (near pure black)

    // Horizon stop: per-map colour, but the per-map values are themselves now
    // near-black (GetFowHorizonColor), and we clamp UP only to the tiny floor.
    vec3 horizonN = max(uHorizonColor * 0.55, kNightFloor);
    // Zenith stop: much darker than horizon → almost black at the top. Drop the
    // overall level hard (×0.18) and keep a faint blue bias; never below floor.
    vec3 zenithN  = max(uHorizonColor * vec3(0.10, 0.13, 0.20), kZenithFloor);
    vec3 nadirN   = horizonN * vec3(0.60, 0.66, 0.80);

    float z = clamp(dir.z, -1.0, 1.0);
    vec3 sky;
    if (z >= 0.0) {
        // horizon → zenith across the whole upper hemisphere. pow(z,0.45) makes
        // the sky reach the near-black zenith FASTER (so most of the dome is
        // dark, only the thin horizon band carries the faint blue tint).
        sky = mix(horizonN, zenithN, pow(z, 0.45));
    } else {
        sky = mix(horizonN, nadirN, clamp(-z * 2.0, 0.0, 1.0));
    }

    // Very faint cool horizon glow (kept tiny — must not re-introduce a bright
    // blue band). Confined to the lowest few degrees.
    sky += vec3(0.0016, 0.0026, 0.0048) * pow(1.0 - clamp(z, 0.0, 1.0), 8.0);

    sky *= uSkyTint;

    // --- Moon (procedural disc + soft glow) --------------------------------
    // A proper-looking moon instead of a flat bright dot: a pale limb-darkened
    // disc with darker "maria" patches (low-freq noise), a tight corona just
    // outside it, and a broad directional sky-glow (moonlight lighting the sky
    // from one side). Drawn into the backdrop so clouds can pass in front.
    //
    // GATED on uMoonVisible: at the steep default isometric angle the moon sits
    // out of the visible sky band, so computing it is wasted GPU. The gate is a
    // UNIFORM (same value for every pixel) → coherent branch, the whole block is
    // skipped with no divergence cost. ZzzScene sets it from skyTilted.
    if (uMoonVisible > 0.5) {
        vec3  moonDir = normalize(uSunDir);
        float md      = dot(dir, moonDir);
        vec3  moonCol = vec3(0.80, 0.82, 0.88);              // pale moonlight (less blue)

        // Broad moonlight scattered across the sky (skybox-like, one-sided lighting).
        sky += moonCol * pow(max(md, 0.0), 1.8) * 0.09;

        // 2D coords on the moon face via a tangent basis perpendicular to moonDir.
        vec3  mRight = normalize(cross(vec3(0.0, 0.0, 1.0), moonDir));
        vec3  mUp    = cross(moonDir, mRight);
        vec2  mv     = vec2(dot(dir, mRight), dot(dir, mUp));
        float discR  = 0.037;                                // angular radius ~2.1 deg (tune: smaller = smaller moon)
        float r      = length(mv) / discR;                   // 0 = center, 1 = edge
        // md > 0.0 confines the disc to the moon's OWN hemisphere. Without it,
        // the tangent-basis projection (mv) is symmetric about the moon axis, so
        // r is also ~0 at the antipode -moonDir — a phantom "anti-moon" appears
        // downward, in the z=0 void exposed by precipices/cliffs. The glow above
        // already uses max(md,0); the disc needs the same one-sided guard.
        if (md > 0.0 && r < 1.7) {
            float discMask = smoothstep(1.0, 0.86, r);       // soft disc edge
            float limb     = mix(1.0, 0.50, r * r);          // limb darkening (dim rim)
            float maria    = fbm2(mv / discR * 1.3 + 7.0);   // darker surface patches (maria)
            float surf     = mix(0.60, 1.0, smoothstep(0.30, 0.70, maria));
            sky += moonCol * (limb * surf) * discMask * 1.30;                    // moon body
            sky += moonCol * smoothstep(1.7, 1.0, r) * (1.0 - discMask) * 0.25;  // corona
        }
    }

    return max(sky, vec3(0.0));
}

// ===========================================================================
//  STARS  (legacy feel: ~120, warm-white, slow subtle twinkle, additive glow)
// ===========================================================================
// One hashed cell lookup per pixel (NO loop). Cell grid in azimuth/elevation;
// only the top fraction of cells host a star. Concentrated in the low-elevation
// band (legacy stars sit 0..20° above the horizon).
vec3 stars(vec3 dir) {
    float az = atan(dir.y, dir.x);
    float el = asin(clamp(dir.z, -1.0, 1.0));

    // Coarse cells → sparse stars (legacy used 120 over the band).
    const float kCells = 160.0;
    vec2 cell = vec2(az / (2.0 * PI) + 0.5, el / PI + 0.5) * kCells;
    vec2 id = floor(cell);
    vec2 f  = fract(cell);

    float r = hash2(id);
    if (r < 0.978) return vec3(0.0);                 // top ~2.2% of cells

    vec2 sp = vec2(hash2(id + 3.7), hash2(id + 8.1));
    float d = length(f - sp);

    // Core + soft additive glow halo (legacy: dim large halo + bright core).
    float core = smoothstep(0.06, 0.0, d);
    float glow = smoothstep(0.22, 0.0, d) * 0.18;
    float point = core * core + glow;

    // VERY slow, subtle twinkle (legacy kFreq 0.00015 on WorldTime ms, ±10%).
    float phase = hash2(id + 1.3) * 6.2831;
    float tw = 0.90 + 0.10 * sin(uTime * 0.15 + phase);

    // Brightness 0.20..0.95 like the legacy distribution.
    float bright = 0.20 + 0.75 * hash2(id + 11.2);

    // Stars sit in the low band: brighten just above the horizon, fade higher
    // (legacy elevation 0..20°) and fade right at the horizon line.
    float lowBand = smoothstep(0.0, 0.04, dir.z) * (1.0 - smoothstep(0.20, 0.55, dir.z));

    vec3 col = vec3(1.0, 1.0, 0.92);                 // legacy warm-white
    return col * (point * tw * bright * lowBand);
}

// ===========================================================================
//  CLOUDS  (procedural dome-projected FBM - soft broken masses, slow drift)
// ===========================================================================

// Composite two slow-drifting cloud layers over the sky. Clouds are faint,
// soft, BROKEN (with gaps), and concentrated in the mid/low band — NOT a moving
// ceiling overhead. Per-map tint via uCloudTint.
vec3 clouds(vec3 camPos, vec3 dir, vec3 skyBehind) {
    // Clouds on the SKY DOME, mapped by view AZIMUTH/ELEVATION — NOT a
    // horizontal plane. Under MU's steep camera the visible sky is the LOW
    // horizon band; a horizontal cloud plane aliases there (t -> inf as
    // dir.z -> 0) and pushes the clouds up out of view, which is why they were
    // invisible. Dome mapping distributes clouds across ALL elevations
    // including the horizon band the camera actually sees, with no aliasing.
    // Two slow-drifting octaves give broken, wispy masses (gaps show stars).
    vec3 cloudCol = uCloudTint * (0.24 + 0.11 * max(uSunIntensity, 0.0));

    // Seamless dome projection — project the view direction onto a plane via
    // dir.xy/(dir.z+C). Continuous across ALL azimuths (NO atan2 branch cut), so
    // there is no hard "cut line" in the sky where the azimuth would wrap. C
    // keeps the divide safe and bounded for the whole visible band (dir.z>0).
    vec2  proj  = dir.xy / (dir.z + 0.6);
    float drift = uWindSpeed * uTime;

    // SOFT, low-frequency cloud field. Lower sample scale = bigger masses (less
    // grain); a base-dominant blend of two octaves keeps shape without the
    // high-freq speckle. (fbm2 is ~0..0.97, mean ~0.48 — threshold must sit
    // near/below that or clouds vanish.)
    // Cloud field coords = pure DOME PROJECTION (proj = dir.xy/(dir.z+C)): an
    // injective gnomonic map of the visible hemisphere, so no two rays sample
    // the same point -> no mirror/fold. The old "+ dir.z*1.6" Y dispersion BROKE
    // this: proj.y SHRINKS with elevation while dir.z*1.6 GROWS -> the Y coord
    // went non-monotonic on the +Y (moon) side -> the cloud field folded back on
    // itself = "clouds reflected from the horizon" lit by the moon glow.
    vec2  cuv = proj;
    float n1 = fbm2(cuv * 1.2 + uWindDir * (drift * 0.0020));
    float n2 = fbm2(cuv * 2.3 + normalize(uWindDir + vec2(0.4, -0.2)) * (drift * 0.0032));
    float n  = n1 * 0.70 + n2 * 0.30;                    // base-dominant → soft masses

    // BROKEN clouds with real clear gaps (not a dense overcast); ONE WIDE
    // smoothstep → soft edges, no speckle. Higher threshold = MORE scattered
    // (more sky between masses, top to bottom).
    float thr = 0.63 - uCloudCoverage * 0.28;            // coverage 0.35 -> ~0.53
    float density = smoothstep(thr, thr + 0.34, n);

    // Cover the WHOLE visible sky band: fade in right at the horizon (so it
    // meets the void haze below cleanly) and stay full up to high elevation —
    // the LOW band, what the camera sees, is full of cloud.
    float band = smoothstep(0.01, 0.07, dir.z) * (1.0 - smoothstep(0.78, 1.05, dir.z));

    return mix(skyBehind, cloudCol, clamp(density * band, 0.0, 1.0));
}

// ===========================================================================
//  MAIN
// ===========================================================================
void main() {
    vec3 dir    = viewRay();
    vec3 camPos = uCameraPos.xyz;

    vec3 sky = nightGradient(dir);
    sky += stars(dir);                 // additive, behind clouds

    vec3 col = clouds(camPos, dir, sky);

    // ---- Void / below-horizon HAZE (smooth atmosphere — NO noise/pattern) ----
    // Map holes between walls (Arena etc.) expose the Z=0 void. Fill it with a
    // SMOOTH atmospheric haze (no FBM → no junk/sheet pattern, nothing busy at
    // the horizon line). It HIDES UNDER THE FOW: faded out by the SAME
    // camera-centred radial falloff the world uses (innerR..outerR tiles, live
    // from GetFowInnerTiles/OuterTiles), so where the terrain has gone FOW-black
    // at distance the void haze is gone too — no grey mist poking through the
    // dark horizon. Within the clear zone it reads as soft hazy depth.
    float below = smoothstep(0.05, -0.36, dir.z);     // 0 at/above horizon -> 1 straight down
    if (below > 0.001) {
        // World-XY of the ray's Z=0 crossing → tile distance from the camera,
        // matching the terrain FOW metric (worldXY*0.01 vs camXY tiles).
        float tf       = -camPos.z / min(dir.z, -0.0015);   // guard the divide
        vec2  hitTiles = (camPos.xy + dir.xy * tf) * 0.01;
        float distT    = length(hitTiles - camPos.xy * 0.01);
        float fowVis   = (uFowOuter > 0.0)
                       ? 1.0 - smoothstep(uFowInner, uFowOuter, distT)
                       : 1.0;
        vec3  haze     = uFogColor * mix(1.0, 0.6, below); // a hair lighter at the rim, deeper down
        col = mix(col, haze, clamp(below * uFogStrength * fowVis, 0.0, 1.0));
    }

    // Dark output. NaN-safe + clamp.
    col = max(col, vec3(0.0));
    if (!(col.x == col.x)) col.x = 0.0;
    if (!(col.y == col.y)) col.y = 0.0;
    if (!(col.z == col.z)) col.z = 0.0;

    // Gentle soft-clip — only the rare bright pixel (star core) is affected;
    // the dark range stays essentially linear.
    col = col / (col + vec3(1.0));

    // Dither — kills 8-bit banding ("franjas") on the near-black gradient. The
    // visible sky band spans only ~3-12 integer 8-bit levels, so the smooth
    // gradient quantises into wide horizontal contour bands. A triangular-PDF
    // hash dither (~1.5/255) applied AFTER tonemap perturbs the final 8-bit
    // quantisation and breaks the bands WITHOUT lifting the black level (the
    // dark night look is preserved). hash2() is defined above.
    float dnoise = (hash2(gl_FragCoord.xy) + hash2(gl_FragCoord.yx + 17.13) - 1.0) * (1.5 / 255.0);
    col += vec3(dnoise);
    col = max(col, vec3(0.0));

    fragColor = vec4(col, 1.0);
}
