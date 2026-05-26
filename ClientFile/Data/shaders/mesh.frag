#version 330 core

// Standard textured-lit BMD fragment shader.
// vColor is the engine-prebaked LightTransform value (per-vertex pre-lit).
// Alpha is fully packed into vColor.a (F2B(alpha) per vertex) — no uAlpha uniform.
// Final pixel = texel * vertex_color (matches legacy GL_MODULATE).

in vec2 vUV;
in vec4 vColor;
in vec3 vViewPos;   // view-space position from vert (camera at origin) — fog distance

// Fog mirrors legacy fixed-function GL_FOG (glEnable(GL_FOG) + GL_LINEAR mode).
// In legacy GL every triangle drawn got auto-fog; GL3 Core requires each shader
// to compute it manually. The gate (uFogEnabled==0) fast-paths most maps.
uniform int   uFogEnabled;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec4  uFogColor;

uniform sampler2D uTex;

// 0 (default): suppress hard-black border pixels from effect-atlas JPG textures
// (Components==3, alpha forced to 1) that land on pipeLit instead of the additive
// pipeline. 1: skip that cut — set only for the Dark Horse forced-opaque body,
// whose black-leather barding is authored as pure-black (RGB<=1) and must render
// solid (near-black) like legacy GL_MODULATE instead of being discarded into
// see-through holes. See DrawMesh.cpp skipRgbCut.
uniform int uSkipRgbCut;

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    // Threshold 0.04 (~byte 10) catches most JPEG anti-alias dark border
    // texels (decoded byte 0–10, RGB ≈ 0–0.04) without eating authored
    // dark content (byte 11+, RGB ≥ 0.04).
    // History: 0.005 (~byte 1.3) caught only pure black and let the entire
    // anti-alias band through as opaque dark = "first-load black halo" on
    // Tarkan WD_8 lava chunks. Bumped to 0.04 in 3630dfb2f.
    // Then escalated to 0.10 in 5d458f39c trying to kill the residual
    // first-load halo — that ate authored dark content across many
    // textures (bright crystals, cannon barrels, dark armor trim, etc.)
    // User reverted: "empezamos a recortar muchos puntos negros que NO
    // habia que recortar". Back to 0.04 as the prior known-safe value.
    // The first-load residual halo is being attacked from a different
    // layer (per-Type render handler in GM_PK_Field.cpp + lava tint
    // diagnostic 406039905), not by escalating the shader cut.
    // Dark Horse / cannon dark texels still protected via uSkipRgbCut=1
    // set by DrawMesh.cpp when g_bForceOpaqueMesh is true.
    if (uSkipRgbCut == 0 && max(texel.r, max(texel.g, texel.b)) < 0.04) discard;
    vec4 c = texel * vColor;
    if (uFogEnabled == 1) {
        float dist = length(vViewPos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    fragColor = c;
}
