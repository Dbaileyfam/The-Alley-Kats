/**
 * Liquid metal background: Three.js + GLSL full-screen shader.
 * Renders a dark chrome / mercury surface with procedural noise, mouse ripples,
 * and specular highlights. Uses requestAnimationFrame, mouse smoothing,
 * resize handling, and prefers-reduced-motion. Falls back to static gradient
 * if WebGL is unavailable.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('canvas-bg');
  if (!canvas) return;

  // --- Shader source (fallback when fetch fails, e.g. file://) ---
  const vertSrc = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
  const fragSrc = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uReduceMotion;
varying vec2 vUv;
vec3 hash33(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p.zxy, p.yxz + 19.27);
  return fract(p);
}
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = dot(hash33(i), f);
  float b = dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0));
  float c = dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0));
  float d = dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0));
  float e = dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1));
  float f_ = dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1));
  float g = dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1));
  float h = dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1));
  return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,f_,f.x), mix(g,h,f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}
void main() {
  float t = uTime * uReduceMotion;
  vec2 uv = vUv;
  float mouseInfluence = 0.0;
  vec2 rippleOffset = vec2(0.0);
  if (uMouse.x >= 0.0 && uMouse.y >= 0.0) {
    vec2 toMouse = uv - uMouse;
    float dist = length(toMouse);
    float ripple = exp(-dist * 4.0) * sin(dist * 12.0 - t * 3.0) * 0.04;
    rippleOffset = normalize(toMouse + 0.001) * ripple;
    mouseInfluence = exp(-dist * 3.5) * 0.15;
  }
  vec2 sampleUV = uv + rippleOffset;
  vec3 samplePos = vec3(sampleUV * 2.5, t * 0.15);
  float n = fbm(samplePos);
  float n2 = fbm(samplePos + vec3(1.3, 2.1, 0.7));
  float eps = 0.005;
  float nx = fbm(samplePos + vec3(eps, 0, 0)) - n;
  float ny = fbm(samplePos + vec3(0, eps, 0)) - n;
  vec3 normal = normalize(vec3(nx, ny, 0.05));
  vec3 lightDir = normalize(vec3(0.4, 0.5, 0.6));
  float spec = pow(max(0.0, dot(reflect(vec3(0, 0, 1), normal), lightDir)), 48.0);
  spec *= (0.4 + 0.6 * n);
  vec3 gunmetal = vec3(0.18, 0.19, 0.24);
  vec3 graphite = vec3(0.35, 0.37, 0.42);
  vec3 silver = vec3(0.78, 0.80, 0.85);
  float metalMix = n * 0.7 + n2 * 0.3 + mouseInfluence;
  vec3 base = mix(gunmetal, mix(graphite, silver, smoothstep(0.25, 0.65, metalMix)), smoothstep(0.0, 0.75, metalMix));
  vec3 specColor = vec3(0.95, 0.96, 0.98);
  vec3 col = base + specColor * spec;
  float vignette = 1.0 - 0.25 * length(uv - 0.5);
  gl_FragColor = vec4(col * vignette, 1.0);
}
`;

  let scene, camera, renderer, material, mesh;
  let rafId = null;
  let startTime = 0;
  const mouseTarget = { x: -1, y: -1 };
  const mouseSmooth = { x: -1, y: -1 };
  const SMOOTH = 0.08;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function getReduceMotion() {
    return reducedMotion.matches ? 0.0 : 1.0;
  }

  function loadShaders() {
    return Promise.all([
      fetch('shaders/liquid-metal.vert').then(function (r) { return r.text(); }),
      fetch('shaders/liquid-metal.frag').then(function (r) { return r.text(); }),
    ]).then(function (pair) {
      return { vert: pair[0], frag: pair[1] };
    }).catch(function () {
      return { vert: vertSrc, frag: fragSrc };
    });
  }

  function initThree(shaders) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a16, 0);

    material = new THREE.ShaderMaterial({
      uniforms: {
        uResolution: { value: new THREE.Vector2(width, height) },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(-1, -1) },
        uReduceMotion: { value: getReduceMotion() },
      },
      vertexShader: shaders.vert,
      fragmentShader: shaders.frag,
      depthWrite: false,
    });

    const quad = new THREE.PlaneGeometry(2, 2);
    mesh = new THREE.Mesh(quad, material);
    scene.add(mesh);
  }

  function resize() {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (material && material.uniforms && material.uniforms.uResolution) {
      material.uniforms.uResolution.value.set(w, h);
    }
  }

  function tick(now) {
    if (!material || !material.uniforms) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    if (!startTime) startTime = now;
    const t = (now - startTime) * 0.001;
    material.uniforms.uTime.value = t;
    material.uniforms.uReduceMotion.value = getReduceMotion();

    if (mouseTarget.x >= 0 && mouseTarget.y >= 0) {
      if (mouseSmooth.x < 0) {
        mouseSmooth.x = mouseTarget.x;
        mouseSmooth.y = mouseTarget.y;
      }
      mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * SMOOTH;
      mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * SMOOTH;
      material.uniforms.uMouse.value.set(mouseSmooth.x, mouseSmooth.y);
    } else {
      material.uniforms.uMouse.value.set(-1, -1);
      mouseSmooth.x = mouseSmooth.y = -1;
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }

  function onMouseMove(e) {
    mouseTarget.x = e.clientX / window.innerWidth;
    mouseTarget.y = 1.0 - e.clientY / window.innerHeight;
  }

  function onMouseLeave() {
    mouseTarget.x = -1;
    mouseTarget.y = -1;
  }

  function fallback() {
    document.body.classList.add('bg-webgl-fallback');
    var wrap = document.querySelector('.canvas-bg-wrap');
    if (wrap) {
      wrap.style.background = 'radial-gradient(ellipse 100% 100% at 50% 50%, #1a1c24 0%, #0e0f14 50%, #08090c 100%)';
    }
    // Run 2D canvas liquid effect so there is visible motion, not just a dark screen
    var script = document.createElement('script');
    script.src = 'js/background-effect.js';
    script.async = false;
    document.body.appendChild(script);
  }

  function init() {
    if (typeof THREE === 'undefined') {
      fallback();
      return;
    }
    // Always use embedded shaders so the effect works on GitHub Pages / any host (no fetch)
    try {
      initThree({ vert: vertSrc, frag: fragSrc });
      window.addEventListener('resize', resize);
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('mouseleave', onMouseLeave);
      rafId = requestAnimationFrame(tick);
    } catch (e) {
      console.warn('WebGL liquid metal init failed', e);
      fallback();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
