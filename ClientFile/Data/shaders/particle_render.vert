#version 330 core

// GPU particle render pass — point sprites.
// Each live particle is one point; gl_PointSize sets the screen-space size.
// The fragment shader samples the texture at gl_PointCoord.
//
// No geometry shader is used — point sprites are GLES 3.0 compatible.

layout(location = 0) in vec3  a_position;
layout(location = 1) in vec3  a_velocity;  // unused in render pass
layout(location = 2) in float a_lifetime;
layout(location = 3) in float a_scale;

layout(std140) uniform Camera {
    mat4 uProj;
    mat4 uView;
    vec4 uCameraPos;
};

uniform vec4 uColor;        // global tint (from legacy o->Light)

out vec4 vColor;

void main() {
    // Dead particles — move them to clip-space far plane so they're trivially
    // clipped and produce no visible pixels.
    if (a_lifetime <= 0.0) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0); // behind far plane
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
    }

    vec4 eyePos = uView * vec4(a_position, 1.0);
    gl_Position  = uProj * eyePos;

    // Project scale to screen pixels: scale is a world-unit half-size.
    // We approximate by dividing by the eye-space Z distance.
    // uProj[1][1] = (2*near)/(top-bottom) ≈ 1/tan(fovy/2).
    // This gives a point size in viewport pixels consistent with the
    // instanced-quad path at the same distance.
    float eyeDist = max(-eyePos.z, 0.01);
    gl_PointSize = clamp(a_scale * uProj[1][1] / eyeDist * 0.5, 1.0, 128.0);

    vColor = uColor;
}
