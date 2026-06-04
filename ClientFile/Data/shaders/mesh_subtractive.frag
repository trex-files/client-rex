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
in vec3 vWorldPos;

#ifdef FOG_ENABLED
layout(std140) uniform FogBlock {
    vec4 uFogColorRGBA;
    vec4 uFogParams;   // x=start, y=end, z=enabled(0|1), w=unused
};
#endif

uniform sampler2D uTex;

// Kept as a NOOP to match the mesh.frag uniform set (DrawMesh.cpp sets it).
uniform int uSkipRgbCut;

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
};

out vec4 fragColor;

void main() {
    vec4 texel = texture(uTex, vUV);
    vec4 c = texel * vColor;
#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    c.rgb = mix(uFogColorRGBA.rgb, c.rgb, fogF);
#endif
    // Soften the subtractive payload — see file header.
    c.rgb *= 0.5;
    // FoW radial fade intentionally NOT applied to objects (objects keep full colour).
    fragColor = c;
}
