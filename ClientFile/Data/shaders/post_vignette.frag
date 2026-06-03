#version 330 core

// Radial vignette — darkens screen edges with a smooth falloff.
//
// uVignetteRadius   controls where darkening starts (0.5 = tight, 1.5 = wide).
// uVignetteSoftness controls the feather width of the transition zone.
// uVignetteDarkness scales the maximum darkening (0 = none, 1 = black edges).

in vec2 vUV;

uniform sampler2D uSrc;
uniform float     uVignetteRadius;    // 0.5–1.5
uniform float     uVignetteSoftness;  // 0.1–0.5
uniform float     uVignetteDarkness;  // 0.0–1.0

out vec4 fragColor;

void main() {
    vec3 color = texture(uSrc, vUV).rgb;

    // Distance from screen centre, remapped so corners sit at sqrt(2)*0.5 ≈ 0.707.
    vec2 fromCenter = (vUV - 0.5) * 2.0;
    float dist = length(fromCenter);

    // Clamp softness so edge0 < edge1 — smoothstep(e,e,x) is undefined behavior.
    float softness = max(uVignetteSoftness, 0.01);
    // smoothstep: 1.0 at centre, 0.0 beyond radius.
    float vignette = 1.0 - smoothstep(
        uVignetteRadius - softness,
        uVignetteRadius,
        dist
    );

    // darken = lerp(1-darkness, 1, vignette): centre untouched, edges darkened.
    float darken = mix(1.0 - uVignetteDarkness, 1.0, vignette);
    color *= darken;

    fragColor = vec4(color, 1.0);
}
