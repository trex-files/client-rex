#version 330 core

// Subtractive-blend variant of mesh.frag.
// Used exclusively by PipelineMeshAlphaMinus (GL_ZERO / GL_ONE_MINUS_SRC_COLOR).
//
// 2026-05-27: c.rgb is halved before output. Legacy fixed-function matched
// glBlendFunc(GL_ZERO, GL_ONE_MINUS_SRC_COLOR) exactly, but on dark maps
// (Lost Tower, Dungeon, etc.) the full-strength subtract drives the
// framebuffer to absolute black around skills that use RENDER_DARK —
// most visibly Rageful Blow (Blade Knight FURY_STRIKE sub-effects with
// SubType==1). Halving c.rgb keeps the soft falloff gradient but caps
// how dark the effect can push surrounding pixels. The standard opaque
// BMD render keeps using mesh.frag at full strength.

in vec2 vUV;
in vec4 vColor;
in vec3 vViewPos;

uniform int   uFogEnabled;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec4  uFogColor;

uniform sampler2D uTex;

// Kept as a NOOP to match the mesh.frag uniform set (DrawMesh.cpp sets it).
uniform int uSkipRgbCut;

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    vec4 c = texel * vColor;
    if (uFogEnabled == 1) {
        float dist = length(vViewPos);
        float fogF = clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
        c.rgb = mix(uFogColor.rgb, c.rgb, fogF);
    }
    // Soften the subtractive payload — see file header.
    c.rgb *= 0.5;
    fragColor = c;
}
