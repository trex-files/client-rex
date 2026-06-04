#version 330 core

// Untextured colored mesh — used for RENDER_COLOR meshes (no diffuse map,
// just BodyLight tint).

in vec4 vColor;
in vec3 vViewPos;   // view-space position (camera at origin) — fog distance
in vec3 vWorldPos;

uniform float uAlpha;

#ifdef FOG_ENABLED
layout(std140) uniform FogBlock {
    vec4 uFogColorRGBA;
    vec4 uFogParams;   // x=start, y=end, z=enabled(0|1), w=unused
};
#endif

layout(std140) uniform VisibilityBlock {
    vec4 uVisibility;  // xy=cameraXY tiles, z=innerR tiles, w=outerR tiles
    vec4 uVisFade;     // rgb = horizon mist colour distant objects fade into
};

out vec4 fragColor;

void main() {
    vec3 rgb = vColor.rgb;
#ifdef FOG_ENABLED
    float dist = -vViewPos.z;
    float fogF = clamp((uFogParams.y - dist) / (uFogParams.y - uFogParams.x), 0.0, 1.0);
    rgb = mix(uFogColorRGBA.rgb, rgb, fogF);
#endif
    vec4 c = vec4(rgb, vColor.a * uAlpha);
    // FoW radial fade intentionally NOT applied to objects (objects keep full colour).
    fragColor = c;
}
