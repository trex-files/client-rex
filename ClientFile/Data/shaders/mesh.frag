#version 330 core

// Standard textured-lit BMD fragment shader.
// vColor is the engine-prebaked LightTransform value (per-vertex pre-lit).
// Alpha is fully packed into vColor.a (F2B(alpha) per vertex) — no uAlpha uniform.
// Final pixel = texel * vertex_color (matches legacy GL_MODULATE).

in vec2 vUV;
in vec4 vColor;
in vec3 vWorldPos;   // world-space position from vert, used for fog distance

// Fog mirrors legacy fixed-function GL_FOG (glEnable(GL_FOG) + GL_LINEAR mode).
// In legacy GL every triangle drawn got auto-fog; GL3 Core requires each shader
// to compute it manually. The gate (uFogEnabled==0) fast-paths most maps.
uniform int   uFogEnabled;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec4  uFogColor;

uniform sampler2D uTex;

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    // Defensive: discard fragments with both alpha and RGB effectively
    // zero. Effect meshes (ice storm crystals, magic flares, fire) are
    // often JPG (Components=3, alpha=1 hardcoded) authored with black
    // borders that legacy treated as transparent via additive blend.
    // When the same mesh lands on alpha-blend (kSimpleCase / pipeLit),
    // the alpha=1 RGB=0 borders render as opaque BLACK SQUARES around
    // each effect quad — exactly what users see on Ice Storm. Mirror
    // the legacy "near-black is invisible" contract here.
    //
    // Threshold 0.02 (~5/255). Character body textures with truly dark
    // areas (hair shadows, leather) have measurable RGB above this floor;
    // hard-zero borders of effect atlas pages drop out cleanly.
    // Threshold 0.005 (~1.3/255). Real character textures with deliberate
    // dark areas (hair, shadows, leather) have RGB above this floor; only
    // hard pure-black pixels — which always indicate "transparency intent"
    // for additive-authored effect textures — get discarded.
    if (max(texel.r, max(texel.g, texel.b)) < 0.005) discard;
    vec4 c = texel * vColor;
    if (uFogEnabled == 1) {
        float dist = length(vWorldPos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    fragColor = c;
}
