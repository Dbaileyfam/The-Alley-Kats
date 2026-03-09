/**
 * Liquid metal background — GLSL shaders
 * Exposes vertex and fragment shader source for the WebGL effect.
 *
 * CUSTOMIZATION (fragment shader):
 * - uSpeed: flow speed (try 0.1–0.3)
 * - Ripple: exp(-dist * uRippleFalloff) * sin(...) * uRippleStrength
 * - Colors: gunmetal, graphite, silver, specColor at bottom of main()
 */
(function (global) {
  'use strict';

  var vertexSource = [
    'attribute vec2 aPosition;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = aPosition * 0.5 + 0.5;',
    '  gl_Position = vec4(aPosition, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Fragment: procedural 3D noise for flow, mouse ripple distortion, metallic shading.
  // How the shader works:
  // 1. vUv is used as base XY; we add a ripple offset (from uMouse) so the surface distorts near the cursor.
  // 2. 3D value noise (smoothstep interpolated) is sampled at (xy * scale, time * uSpeed) so the liquid flows over time.
  // 3. FBM (multiple octaves) gives organic, flowing variation.
  // 4. A fake normal from the noise gradient drives a specular term (chrome-like highlight).
  // 5. Base color is a mix of gunmetal/graphite/silver by noise value; specular adds the reflective highlight.
  var fragmentSource = [
    'precision highp float;',
    'uniform vec2 uResolution;',
    'uniform float uTime;',
    'uniform vec2 uMouse;',
    'uniform float uSpeed;',
    'uniform float uRippleStrength;',
    'uniform float uRippleFalloff;',
    'uniform float uReduceMotion;',
    'varying vec2 vUv;',
    '',
    '// 3D value noise (lattice + smoothstep) for smooth flowing motion',
    'vec3 hash33(vec3 p) {',
    '  p = fract(p * vec3(443.897, 441.423, 437.195));',
    '  p += dot(p.zxy, p.yxz + 19.27);',
    '  return fract(p);',
    '}',
    'float noise3d(vec3 p) {',
    '  vec3 i = floor(p);',
    '  vec3 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = dot(hash33(i), f);',
    '  float b = dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0));',
    '  float c = dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0));',
    '  float d = dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0));',
    '  float e = dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1));',
    '  float f1 = dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1));',
    '  float g = dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1));',
    '  float h = dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1));',
    '  return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,f1,f.x), mix(g,h,f.x), f.y), f.z);',
    '}',
    '// Fractal Brownian motion: several octaves for organic liquid flow',
    'float fbm(vec3 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  for (int i = 0; i < 4; i++) {',
    '    v += a * noise3d(p);',
    '    p *= 2.0;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  float t = uTime * uSpeed * uReduceMotion;',
    '  vec2 uv = vUv;',
    '',
    '  // Mouse interaction: ripple distorts the sampling position so the surface bends under the cursor.',
    '  // Strength and falloff control how far the ripple reaches and how strong it is.',
    '  if (uMouse.x >= 0.0 && uMouse.y >= 0.0) {',
    '    vec2 toMouse = uv - uMouse;',
    '    float dist = length(toMouse);',
    '    float ripple = exp(-dist * uRippleFalloff) * sin(dist * 14.0 - t * 4.0) * uRippleStrength;',
    '    uv += normalize(toMouse + 0.001) * ripple;',
    '  }',
    '',
    '  vec3 samplePos = vec3(uv * 2.4, t * 0.2);',
    '  float n = fbm(samplePos);',
    '  float n2 = fbm(samplePos + vec3(1.2, 1.8, 0.5));',
    '  float eps = 0.006;',
    '  float nx = fbm(samplePos + vec3(eps, 0, 0)) - n;',
    '  float ny = fbm(samplePos + vec3(0, eps, 0)) - n;',
    '  vec3 normal = normalize(vec3(nx, ny, 0.06));',
    '',
    '  vec3 lightDir = normalize(vec3(0.35, 0.5, 0.6));',
    '  float spec = pow(max(0.0, dot(reflect(vec3(0, 0, 1), normal), lightDir)), 52.0);',
    '  spec *= (0.35 + 0.65 * n);',
    '',
    '  // Metallic gradient: dark base -> silver highlights. Tweak these for different metal look.',
    '  vec3 gunmetal = vec3(0.16, 0.17, 0.22);',
    '  vec3 graphite = vec3(0.32, 0.34, 0.40);',
    '  vec3 silver = vec3(0.75, 0.77, 0.82);',
    '  float mixVal = n * 0.7 + n2 * 0.3;',
    '  vec3 base = mix(gunmetal, mix(graphite, silver, smoothstep(0.25, 0.65, mixVal)), smoothstep(0.0, 0.8, mixVal));',
    '  vec3 specColor = vec3(0.92, 0.94, 0.98);',
    '  vec3 col = base + specColor * spec;',
    '  float vignette = 1.0 - 0.28 * length(uv - 0.5);',
    '  gl_FragColor = vec4(col * vignette, 1.0);',
    '}'
  ].join('\n');

  global.LiquidMetalShaders = {
    vertex: vertexSource,
    fragment: fragmentSource
  };
})(typeof window !== 'undefined' ? window : this);
