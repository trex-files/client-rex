// minimap_feather.frag — per-pixel rounded-corner feather for the HUD minimap.
//
// Replaces the legacy 48x48 grid (~4608 quads/frame) with a single quad whose
// soft edge is computed in the fragment stage. vUV carries [0,1] quad-space
// (the caller emits UV corners (0,0)..(1,1)); the scrolled map UV is rebuilt
// as uUVOffset + vUV*uUVSpan. The feather is the same smoothstep-product of
// the per-axis edge distances as the old grid, so the result is 1:1.
//
//   uKFeather  — feather width as a fraction of the quad (0.22 matches legacy)
//   uAlpha     — master alpha applied on top of the feather
//   uUVOffset  — map UV at the quad's top-left (textured variant only)
//   uUVSpan    — map UV window width/height (textured variant only)
//
//   #define BACKDROP  — flat black * feather (no texture sample)
//   (default)         — samples uTex at the scrolled UV window

#version 330 core

in  vec2 vUV;
in  vec4 vColor;

#ifndef BACKDROP
uniform sampler2D uTex;
uniform vec2      uUVOffset;
uniform float     uUVSpan;
#endif

uniform float uKFeather;
uniform float uAlpha;

out vec4 fragColor;

void main() {
    vec2 d = min(vUV, 1.0 - vUV);                 // dist to nearest edge per axis [0..0.5]
    vec2 a = clamp(d / (0.5 * uKFeather), 0.0, 1.0);
    a = a * a * (3.0 - 2.0 * a);                  // cubic smoothstep per axis
    float feather = a.x * a.y;                    // product -> rounded corners (matches legacy)

#ifdef BACKDROP
    fragColor = vec4(0.0, 0.0, 0.0, uAlpha * feather);
#else
    vec2 texUV = uUVOffset + vUV * uUVSpan;
    fragColor  = texture(uTex, texUV) * vec4(1.0, 1.0, 1.0, uAlpha * feather);
#endif
}
