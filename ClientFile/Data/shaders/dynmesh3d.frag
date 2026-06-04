#version 330 core

// Standard textured fragment for world-space dynamic geometry
// (RenderCircle3D, ribbons, dynamic effect meshes).
// Multiplies texel RGBA by per-vertex color (light * alpha in w).
//
// Defensive low-threshold discard so alpha-near-zero pixels never reach
// the blend stage. Same rationale as sprite3d.frag — paired with multiple
// blend variants and we don't want alpha-blend pipelines to render
// alpha=1 RGB=0 noise as opaque black.

in vec2 vUV;
in vec4 vColor;
in vec3 vViewPos;   // view-space position (camera at origin) — fog distance
in vec3 vWorldPos;

// Fog mirrors legacy fixed-function GL_FOG (glEnable(GL_FOG) + GL_LINEAR mode).
uniform int   uFogEnabled;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec4  uFogColor;

uniform sampler2D uTex;

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
    vec4 uVisFade;     // rgb = horizon mist colour distant objects fade into
};

out vec4 fragColor;

void main() {
    vec4 sampled = texture(uTex, vUV);
    vec4 c = sampled * vColor;
    if (c.a < 0.01) discard;
    // LEGACY MATCH 2026-05-26: RGB-cut removed. Legacy has NO RGB threshold.
    if (uFogEnabled == 1) {
        float dist = -vViewPos.z;
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    // FoW radial fade intentionally NOT applied to objects (objects keep full colour).
    fragColor = c;
}
