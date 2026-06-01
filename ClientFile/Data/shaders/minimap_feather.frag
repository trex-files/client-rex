#version 330 core
// minimap_feather.frag — per-pixel rounded-corner feather for the HUD minimap.
//
// NOTE: #version MUST be the very first line. CompileStage only skips leading
// whitespace (not comments) when detecting an existing #version; if it sat
// below this comment block the prelude's #version would be prepended too,
// giving a duplicate-#version compile error (the feather silently fell back to
// the hard-edged standard pipeline). Keep this directive at line 1.
// Replaces the legacy 48x48 grid (~4608 quads/frame) with a single quad whose
// soft edge is computed in the fragment stage. vUV carries [0,1] quad-space
// (the caller emits UV corners (0,0)..(1,1)); the scrolled map UV is rebuilt
// as uUVOffset + vUV*uUVSpan. Feather = the legacy smoothstep-product of the
// per-axis edge distances, now per-pixel, so the result is 1:1 with the grid.
//
//   uKFeather  — feather width as a fraction of the quad (0.22 matches legacy)
//   uAlpha     — master alpha applied on top of the feather
//   uUVOffset  — map UV at the quad's top-left (textured variant only)
//   uUVSpan    — map UV window width/height (textured variant only)
//   #define BACKDROP — flat black * feather (no texture sample)

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
    float feather = a.x * a.y;                    // product -> rounded corners

#ifdef BACKDROP
    // backdrop tint: #1c1c1c (28/255) dark grey instead of pure black [TUNE]
    fragColor = vec4(0.109804, 0.109804, 0.109804, uAlpha * feather);
#else
    vec2 texUV = uUVOffset + vUV * uUVSpan;
    fragColor  = texture(uTex, texUV) * vec4(1.0, 1.0, 1.0, uAlpha * feather);
#endif
}
