#version 330 core

// sky.vert — Fullscreen vertex shader for the volumetric sky backdrop.
//
// Uses the same LayoutPostFullscreen layout as all other fullscreen passes:
//   location 0 → vec2 clip-space position  (aPosition)
//   location 2 → vec2 texcoord             (aTexCoord)
//
// vUV is passed through to sky.frag where it's used to reconstruct the
// per-pixel world-space view ray via the Camera UBO.

layout(location = 0) in vec2 aPosition;   // clip-space [-1, 1]
layout(location = 2) in vec2 aTexCoord;

out vec2 vUV;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vUV         = aTexCoord;
}
