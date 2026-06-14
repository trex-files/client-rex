#version 330 core

// Flat black ground shadow — matches legacy shadow.frag for the 1x1 white-tex
// case: color black, alpha = uAlpha, discard below the legacy threshold.

uniform float uAlpha;

out vec4 fragColor;

void main() {
    if (uAlpha < 0.02) discard;
    fragColor = vec4(0.0, 0.0, 0.0, uAlpha);
}
