// Liquid metal fragment shader: dark chrome / mercury with procedural noise,
// mouse ripples, and metallic specular highlights. Uses time + mouse uniforms.

precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;        // normalized 0-1, or (-1,-1) when off screen
uniform float uReduceMotion; // 1.0 = full, 0.0 = no animation

varying vec2 vUv;

// Hash for procedural noise (value noise lattice)
vec3 hash33(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p.zxy, p.yxz + 19.27);
  return fract(p);
}

// Smooth value noise (3D for time-based flow)
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  vec3 u = f * f * (3.0 - 2.0 * f);

  float n = mix(
    mix(mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)),
            dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
        mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)),
            dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
    mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)),
            dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
        mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)),
            dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z
  );
  return n;
}

// Fractal Brownian motion for organic fluid movement
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
  vec2 px = uv * uResolution;

  // Mouse ripple: distort sampling position when mouse is on screen
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

  // Procedural fluid: 3D noise with time so it flows
  vec3 samplePos = vec3(sampleUV * 2.5, t * 0.15);
  float n = fbm(samplePos);
  float n2 = fbm(samplePos + vec3(1.3, 2.1, 0.7));

  // Fake normal from noise gradient for specular
  float eps = 0.005;
  float nx = fbm(samplePos + vec3(eps, 0, 0)) - n;
  float ny = fbm(samplePos + vec3(0, eps, 0)) - n;
  vec3 normal = normalize(vec3(nx, ny, 0.05));

  // Light from top-left (view is straight down, so we fake a view dir)
  vec3 lightDir = normalize(vec3(0.4, 0.5, 0.6));
  float spec = pow(max(0.0, dot(reflect(vec3(0, 0, 1), normal), lightDir)), 48.0);
  spec *= (0.4 + 0.6 * n);

  // Metallic gradient: gunmetal -> graphite -> silver by noise + mouse highlight
  vec3 gunmetal = vec3(0.18, 0.19, 0.24);
  vec3 graphite = vec3(0.35, 0.37, 0.42);
  vec3 silver = vec3(0.78, 0.80, 0.85);
  float metalMix = n * 0.7 + n2 * 0.3 + mouseInfluence;
  vec3 base = mix(gunmetal, mix(graphite, silver, smoothstep(0.25, 0.65, metalMix)), smoothstep(0.0, 0.75, metalMix));
  vec3 specColor = vec3(0.95, 0.96, 0.98);
  vec3 col = base + specColor * spec;
  float vignette = 1.0 - 0.25 * length(uv - 0.5);
  col *= vignette;
  gl_FragColor = vec4(col, 1.0);
}
