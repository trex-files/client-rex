#version 330 core

// GPU particle render fragment — samples texture via gl_PointCoord.
// Mirrors particle_instanced.frag alpha/RGB discard logic.

in vec4 vColor;

uniform sampler2D uTexture;

out vec4 fragColor;

void main() {
    vec4 sampled = texture(uTexture, gl_PointCoord);
    vec4 c = sampled * vColor;

    // Discard near-zero alpha so JPEG noise doesn't accumulate under additive blend.
    if (c.a < 0.01) discard;
    // LEGACY MATCH 2026-05-26: RGB-cut removed. Legacy has NO RGB threshold.

    fragColor = c;
}
