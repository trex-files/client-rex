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

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    // Suppress hard-black border pixels from effect-atlas JPG textures
    // (Components==3, alpha forced to 1) that land on pipeLit instead of the
    // additive pipeline. The 0.005 threshold (~1.3/255) matches the authored
    // pure-black border pixels without cutting legitimately-dark armor texels
    // (which stay above ~0.02). Dark Horse RGBA cutouts must use pipeAlphaTest
    // (mesh_alphatest.frag) so their barding shadow pixels aren't killed here.
    if (max(texel.r, max(texel.g, texel.b)) < 0.005) discard;
    vec4 c = texel * vColor;
    if (uFogEnabled == 1) {
        float dist = length(vViewPos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    fragColor = c;
}
