#version 330 core
// SPDX-License-Identifier: Proprietary
// shadow.frag — outputs solid translucent black for CPU-projected shadows.
// Alpha is driven by the uniform uAlpha; no texture sampling required.


uniform float uAlpha;

out vec4 fragColor;

void main() {
    fragColor = vec4(0.0, 0.0, 0.0, uAlpha);
}
