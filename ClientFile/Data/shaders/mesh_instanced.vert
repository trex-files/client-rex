#version 330 core

// Instanced static-mesh vertex shader.
//
// Renders N copies of the same object-space mesh with a single
// glDrawElementsInstanced call.  The per-instance world matrix is passed
// as four vec4 vertex attributes (locations 8-11, divisor=1) rather than a
// per-draw uniform — no glUniformMatrix4fv overhead per object.
//
// Per-vertex attributes (same as mesh_static.vert):
//   location 0 — position  (object-space vec3)
//   location 1 — color     (pre-lit, ubyte4 → vec4)
//   location 2 — texcoord  (vec2)
//
// Per-instance attributes (divisor=1, slot 1):
//   location 8  — row 0 of world matrix (vec4)
//   location 9  — row 1 of world matrix (vec4)
//   location 10 — row 2 of world matrix (vec4)
//   location 11 — row 3 of world matrix (vec4)
//   location 12 — per-instance body light (vec4 RGBA); (1,1,1,1) = pass-through
//
// The four rows are assembled into a column-major mat4 exactly as
// glm::mat4 or glGetFloatv(GL_MODELVIEW_MATRIX) produces.

layout(location = 0) in vec3  aPosition;
layout(location = 1) in vec4  aColor;
layout(location = 2) in vec2  aTexCoord;

// Per-instance world matrix encoded as 4 consecutive vec4 column vectors.
// GL stores matrices column-major, so col0..col3 map directly to mat4 ctor.
layout(location = 8)  in vec4 aInstWorldCol0;
layout(location = 9)  in vec4 aInstWorldCol1;
layout(location = 10) in vec4 aInstWorldCol2;
layout(location = 11) in vec4 aInstWorldCol3;

// Per-instance body light (RGB tint, A unused). Default (1,1,1,1) = pass-through:
// vColor.rgb = aColor.rgb * (1,1,1) = aColor.rgb — no visual change.
layout(location = 12) in vec4 aInstBodyLight;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

// No per-draw uWorld uniform — the instance attribute replaces it.

out vec4 vColor;
out vec2 vUV;
out vec3 vViewPos;   // view-space position (camera at origin) for fog distance — legacy GL_FOG parity

void main() {
    mat4 uWorld = mat4(aInstWorldCol0, aInstWorldCol1, aInstWorldCol2, aInstWorldCol3);
    vec4 worldPos  = uWorld * vec4(aPosition, 1.0);
    vec4 viewPos   = uView * worldPos;
    gl_Position    = uProj * viewPos;
    vColor         = vec4(aColor.rgb * aInstBodyLight.rgb, aColor.a);
    vUV            = aTexCoord;
    vViewPos       = viewPos.xyz;
}
