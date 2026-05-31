#version 330 core

// GPU particle simulation via transform feedback.
// Runs in rasterizer-discard mode — no fragments are produced.
// Each invocation advances one particle by dt and writes the result
// back via transform feedback varyings.
//
// Lifetime==0 means "dead/inactive" — the particle is not re-emitted
// here; new particles are injected on the CPU side via Emit() which
// writes fresh data into the TF buffer before Tick().

layout(location = 0) in vec3  a_position;
layout(location = 1) in vec3  a_velocity;
layout(location = 2) in float a_lifetime;
layout(location = 3) in float a_scale;

// Gravity acceleration (world-space, typically -Z for MU Online).
uniform float uDt;          // seconds elapsed this frame
uniform vec3  uGravity;     // world-space acceleration (e.g. 0, 0, -200)

// Transform feedback outputs — must match the varyings registered in
// GpuParticles.cpp via glTransformFeedbackVaryings().
out vec3  out_position;
out vec3  out_velocity;
out float out_lifetime;
out float out_scale;

void main() {
    if (a_lifetime <= 0.0) {
        // Dead particle — pass through unchanged so the slot can be recycled
        // without a CPU readback.
        out_position = a_position;
        out_velocity = a_velocity;
        out_lifetime = 0.0;
        out_scale    = a_scale;
    } else {
        out_velocity = a_velocity + uGravity * uDt;
        out_position = a_position + out_velocity * uDt;
        out_lifetime = a_lifetime - uDt;
        out_scale    = a_scale;
    }

    // gl_Position is unused (rasterizer discard), but must be written.
    gl_Position = vec4(0.0);
}
