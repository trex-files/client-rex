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

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    vec4 c = texel * vColor;
    if (uFogEnabled == 1) {
        float dist = length(vViewPos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    fragColor = c;
}
