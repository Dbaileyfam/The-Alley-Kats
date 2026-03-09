/**
 * Liquid metal background — WebGL driver
 *
 * Uses raw WebGL (no Three.js). Runs the fullscreen shader from shader.js,
 * updates uTime every frame, passes smoothed mouse position for ripple distortion,
 * and respects prefers-reduced-motion. On small screens, renders at lower resolution
 * for performance.
 *
 * CUSTOMIZATION (config below):
 * - speed: flow animation speed (0.1–0.4)
 * - rippleStrength: how strong the mouse ripple is (0.02–0.08)
 * - rippleFalloff: how quickly ripple fades with distance (3–6)
 * - pixelRatioMax: cap device pixel ratio for performance (1–2)
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

  var gl = canvas.getContext('webgl', { alpha: true, powerPreference: 'low-power' });
  if (!gl) {
    fallback();
    return;
  }

  var program = createProgram(gl);
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

  function createProgram(gl) {
    if (typeof LiquidMetalShaders === 'undefined') return null;
    var vs = compileShader(gl, gl.VERTEX_SHADER, LiquidMetalShaders.vertex);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, LiquidMetalShaders.fragment);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Liquid metal: program link failed', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function compileShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Liquid metal: shader compile failed', gl.getShaderInfoLog(shader));
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
    if (w <= config.smallScreenWidth) {
      ratio = Math.min(ratio, config.smallScreenPixelRatio);
    }
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
    var w = window.innerWidth;
    var h = window.innerHeight;
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
      if (mouseSmooth.x < 0) {
        mouseSmooth.x = mouseTarget.x;
        mouseSmooth.y = mouseTarget.y;
      }
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
