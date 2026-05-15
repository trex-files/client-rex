#version 330 core

// Untextured colored mesh — used for RENDER_COLOR meshes (no diffuse map,
// just BodyLight tint).

in vec4 vColor;
in vec3 vViewPos;   // view-space position (camera at origin) — fog distance

uniform float uAlpha;

// Fog mirrors legacy fixed-function GL_FOG (glEnable(GL_FOG) + GL_LINEAR mode).
uniform int   uFogEnabled;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec4  uFogColor;

out vec4 fragColor;

void main() {
    vec3 rgb = vColor.rgb;
    if (uFogEnabled == 1) {
        float dist = length(vViewPos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        rgb = mix(uFogColor.rgb, rgb, fogF);
    }
    fragColor = vec4(rgb, vColor.a * uAlpha);
}
