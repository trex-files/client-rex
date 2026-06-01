#version 330 core

// Screen-space fog-of-war vignette: black, with a soft radial alpha gradient.
// Drawn as one fullscreen alpha-blended quad over the finished world (before
// the UI). All tuning lives in the constants below so it can be dialled in at
// RUNTIME — shaders are loaded from Data/shaders at startup, so edit this file
// and restart the client; no rebuild needed.

in vec2 vUV;                 // 0..1 across the screen (fullscreen quad)
uniform float uAspect;       // width/height (from C++) — keeps the clear area circular

out vec4 fragColor;

// ----------------------- TUNING KNOBS (runtime) -----------------------
const vec2  kCenter   = vec2(0.5, 0.5);  // ring center in screen UV (0.5,0.5 = middle)
const float kInner    = 0.25;            // clear INSIDE this radius (no darkening)
const float kOuter    = 0.60;            // fully dark AT/BEYOND this radius
const float kMaxAlpha = 0.80;            // max darkness: 1.0 = pure black, lower = world still faintly visible
// ----------------------------------------------------------------------
// Radius units: 0.5 = half the screen HEIGHT (top/bottom edge). The screen
// corners sit at ~0.71. So kOuter < 0.5 darkens the whole edge; 0.5..0.71
// leaves the corners as the last dark part.

void main() {
    float aspect = (uAspect > 0.001) ? uAspect : 1.7777;  // safe fallback (16:9)
    vec2  d = vUV - kCenter;
    d.x *= aspect;                       // pixel-space distance → round clear area, not a UV ellipse
    float dist = length(d);
    float a = smoothstep(kInner, kOuter, dist) * kMaxAlpha;
    fragColor = vec4(0.0, 0.0, 0.0, a);
}
