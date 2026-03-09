/**
 * Liquid metal background — WebGL, single file (shaders inlined so one script load).
 * CUSTOMIZATION: config.speed, config.rippleStrength, config.rippleFalloff below.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('canvas-bg');
  if (!canvas) return;

  var config = {
    speed: 0.22,
    rippleStrength: 0.045,
    rippleFalloff: 4.2,
    pixelRatioMax: 2,
    smallScreenWidth: 768,
    smallScreenPixelRatio: 1.25
  };

  var VERT_SRC = 'attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*0.5+0.5;gl_Position=vec4(aPosition,0.0,1.0);}';
  var FRAG_SRC = [
    'precision highp float;',
    'uniform vec2 uResolution;uniform float uTime;uniform vec2 uMouse;uniform float uSpeed;',
    'uniform float uRippleStrength;uniform float uRippleFalloff;uniform float uReduceMotion;varying vec2 vUv;',
    'vec3 hash33(vec3 p){p=fract(p*vec3(443.897,441.423,437.195));p+=dot(p.zxy,p.yxz+19.27);return fract(p);}',
    'float noise3d(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);',
    'float a=dot(hash33(i),f);float b=dot(hash33(i+vec3(1,0,0)),f-vec3(1,0,0));',
    'float c=dot(hash33(i+vec3(0,1,0)),f-vec3(0,1,0));float d=dot(hash33(i+vec3(1,1,0)),f-vec3(1,1,0));',
    'float e=dot(hash33(i+vec3(0,0,1)),f-vec3(0,0,1));float f1=dot(hash33(i+vec3(1,0,1)),f-vec3(1,0,1));',
    'float g=dot(hash33(i+vec3(0,1,1)),f-vec3(0,1,1));float h=dot(hash33(i+vec3(1,1,1)),f-vec3(1,1,1));',
    'return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,h,f.x),f.y),f.z);}',
    'float fbm(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*noise3d(p);p*=2.0;a*=0.5;}return v;}',
    'void main(){float t=uTime*uSpeed*uReduceMotion;vec2 uv=vUv;',
    'if(uMouse.x>=0.0&&uMouse.y>=0.0){vec2 toMouse=uv-uMouse;float dist=length(toMouse);',
    'float ripple=exp(-dist*uRippleFalloff)*sin(dist*14.0-t*4.0)*uRippleStrength;uv+=normalize(toMouse+0.001)*ripple;}',
    'vec3 sp=vec3(uv*2.4,t*0.2);float n=fbm(sp);float n2=fbm(sp+vec3(1.2,1.8,0.5));float eps=0.006;',
    'float nx=fbm(sp+vec3(eps,0,0))-n;float ny=fbm(sp+vec3(0,eps,0))-n;vec3 normal=normalize(vec3(nx,ny,0.06));',
    'vec3 lightDir=normalize(vec3(0.35,0.5,0.6));float spec=pow(max(0.0,dot(reflect(vec3(0,0,1),normal),lightDir)),52.0);spec*=(0.35+0.65*n);',
    'vec3 gunmetal=vec3(0.16,0.17,0.22);vec3 graphite=vec3(0.32,0.34,0.40);vec3 silver=vec3(0.75,0.77,0.82);',
    'float mixVal=n*0.7+n2*0.3;vec3 base=mix(gunmetal,mix(graphite,silver,smoothstep(0.25,0.65,mixVal)),smoothstep(0.0,0.8,mixVal));',
    'vec3 specColor=vec3(0.92,0.94,0.98);vec3 col=base+specColor*spec;float vignette=1.0-0.28*length(uv-0.5);',
    'gl_FragColor=vec4(col*vignette,1.0);}'
  ].join('');

  var gl = canvas.getContext('webgl', { alpha: true, powerPreference: 'low-power' });
  if (!gl) {
    fallback();
    return;
  }

  var program = createProgram(gl, VERT_SRC, FRAG_SRC);
  if (!program) {
    fallback();
    return;
  }

  gl.clearColor(0.06, 0.05, 0.1, 1);
  var buffers = createQuad(gl);
  var mouseTarget = { x: -1, y: -1 };
  var mouseSmooth = { x: -1, y: -1 };
  var smoothFactor = 0.07;
  var startTime = performance.now();
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var uniformLocations = null;

  function createProgram(gl, vertSrc, fragSrc) {
    var vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Liquid metal: link failed', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function compileShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Liquid metal: compile failed', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createQuad(gl) {
    var positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    return { buffer: buf, count: 6 };
  }

  function getPixelRatio() {
    var w = window.innerWidth;
    var ratio = window.devicePixelRatio || 1;
    if (w <= config.smallScreenWidth) ratio = Math.min(ratio, config.smallScreenPixelRatio);
    return Math.min(ratio, config.pixelRatioMax);
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var ratio = getPixelRatio();
    var cw = Math.floor(w * ratio);
    var ch = Math.floor(h * ratio);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }
    gl.viewport(0, 0, cw, ch);
  }

  function getUniformLocations() {
    if (uniformLocations) return uniformLocations;
    uniformLocations = {
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
      uRippleStrength: gl.getUniformLocation(program, 'uRippleStrength'),
      uRippleFalloff: gl.getUniformLocation(program, 'uRippleFalloff'),
      uReduceMotion: gl.getUniformLocation(program, 'uReduceMotion')
    };
    return uniformLocations;
  }

  function draw(now) {
    var t = (now - startTime) * 0.001;
    var reduce = reduceMotion.matches ? 0.0 : 1.0;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    var loc = getUniformLocations();
    gl.uniform2f(loc.uResolution, canvas.width, canvas.height);
    gl.uniform1f(loc.uTime, t);
    gl.uniform1f(loc.uSpeed, config.speed);
    gl.uniform1f(loc.uRippleStrength, config.rippleStrength);
    gl.uniform1f(loc.uRippleFalloff, config.rippleFalloff);
    gl.uniform1f(loc.uReduceMotion, reduce);
    if (mouseTarget.x >= 0 && mouseTarget.y >= 0) {
      if (mouseSmooth.x < 0) { mouseSmooth.x = mouseTarget.x; mouseSmooth.y = mouseTarget.y; }
      mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * smoothFactor;
      mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * smoothFactor;
      gl.uniform2f(loc.uMouse, mouseSmooth.x, mouseSmooth.y);
    } else {
      gl.uniform2f(loc.uMouse, -1.0, -1.0);
      mouseSmooth.x = mouseSmooth.y = -1;
    }
    var aPos = gl.getAttribLocation(program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.buffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, buffers.count);
    requestAnimationFrame(draw);
  }

  function onMouseMove(e) {
    mouseTarget.x = e.clientX / window.innerWidth;
    mouseTarget.y = 1.0 - e.clientY / window.innerHeight;
  }
  function onMouseLeave() { mouseTarget.x = -1; mouseTarget.y = -1; }

  function fallback() {
    document.body.classList.add('bg-webgl-fallback');
    var wrap = document.querySelector('.canvas-bg-wrap');
    if (wrap) wrap.style.background = 'radial-gradient(ellipse 100% 100% at 50% 50%, #1a1c24 0%, #0e0f14 50%, #08090c 100%)';
    var script = document.createElement('script');
    script.src = 'js/background-effect.js';
    script.async = false;
    document.body.appendChild(script);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseleave', onMouseLeave);
  requestAnimationFrame(draw);
})();
