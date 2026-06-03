#version 330 core

// Post composite pass: additive blend the bloom FBO onto the back buffer.

in vec2 vUV;

uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float     uBloomStrength;

out vec4 fragColor;

void main() {
    vec3 scene = texture(uScene, vUV).rgb;
    vec3 bloom = texture(uBloom, vUV).rgb;
    fragColor = vec4(scene + bloom * uBloomStrength, 1.0);
}
