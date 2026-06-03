#version 330 core

// SSAO bilateral blur pass — separable Gaussian with depth edge-stopping.
// Run twice: horizontal (uDirection = 1,0) then vertical (uDirection = 0,1).
// Depth edge-stopping prevents AO from bleeding across depth discontinuities
// (e.g., character silhouette against wall).

in vec2 vUV;

uniform sampler2D uAO;          // AO texture from sample pass (half-res)
uniform sampler2D uDepth;       // scene depth (half-res — same size as uAO)
uniform vec2      uTexelSize;   // 1/halfW, 1/halfH
uniform vec2      uDirection;   // (1,0) horizontal or (0,1) vertical

out vec4 fragColor;

// 5-tap Gaussian kernel weights (sigma=1.4).
const float kWeights[5] = float[](0.0625, 0.25, 0.375, 0.25, 0.0625);

void main() {
    float centerAO    = texture(uAO,    vUV).r;
    float centerDepth = texture(uDepth, vUV).r;

    float weightSum = kWeights[2];  // center weight
    float aoSum     = centerAO * weightSum;

    for (int i = 0; i < 5; ++i) {
        if (i == 2) continue;  // skip center
        vec2  uv      = vUV + uDirection * uTexelSize * float(i - 2);
        uv             = clamp(uv, vec2(0.0), vec2(1.0));
        float sDepth  = texture(uDepth, uv).r;
        float sAO     = texture(uAO,    uv).r;

        // Bilateral weight: down-weight samples where depth differs significantly.
        float depthDiff = abs(sDepth - centerDepth);
        float bilateral = exp(-depthDiff * 50.0);  // 50 = sharpness of edge stop

        float w   = kWeights[i] * bilateral;
        aoSum    += sAO * w;
        weightSum += w;
    }

    float ao = aoSum / weightSum;
    fragColor = vec4(ao, ao, ao, 1.0);
}
