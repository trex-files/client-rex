#version 330 core

// Mesh fragment shader with alpha-test discard (legacy
// glAlphaFunc(GL_GREATER, 0.25)). Used by foliage and pierced surfaces.
// Alpha is fully packed into vColor.a — no uAlpha uniform.

in vec2 vUV;
in vec4 vColor;

uniform sampler2D uTex;

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    vec4 c = texel * vColor;
    if (c.a < 0.25) discard;
    fragColor = c;
}
