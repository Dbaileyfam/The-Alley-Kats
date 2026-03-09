/**
 * Reggae-style background — warm flowing blobs (green, gold, red, orange).
 * Canvas 2D only, no WebGL. Works everywhere. Respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('canvas-bg');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Reggae / Rasta inspired: green, gold, red, plus warm orange and deep tones
  var colors = [
    { r: 20, g: 120, b: 60 },   // green
    { r: 220, g: 165, b: 35 },  // gold
    { r: 200, g: 50, b: 40 },   // red
    { r: 230, g: 120, b: 50 },  // orange
    { r: 80, g: 40, b: 80 },    // deep purple
  ];

  var blobs = [];
  var w = 0, h = 0;
  var time = 0;
  var mouse = { x: -1, y: -1 };

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    if (blobs.length === 0) initBlobs();
  }

  function initBlobs() {
    blobs = [];
    for (var i = 0; i < 8; i++) {
      blobs.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0004,
        vy: (Math.random() - 0.5) * 0.0004,
        r: 0.25 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
        color: colors[i % colors.length],
      });
    }
  }

  function tick() {
    var speed = reduced.matches ? 0.12 : 1;
    time += 0.002 * speed;

    ctx.fillStyle = 'rgb(18, 12, 28)';
    ctx.fillRect(0, 0, w, h);

    var mx = mouse.x >= 0 ? mouse.x / w : null;
    var my = mouse.y >= 0 ? mouse.y / h : null;
    var minD = Math.min(w, h);

    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      if (mx != null && my != null) {
        var dx = mx - b.x, dy = my - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        var pull = 0.00015 * speed * (1 - Math.min(1, dist / 0.4));
        b.vx += (dx / dist) * pull;
        b.vy += (dy / dist) * pull;
      }
      b.vx *= 0.98;
      b.vy *= 0.98;
      b.x += b.vx * 60;
      b.y += b.vy * 60;
      b.phase += 0.008 * speed;
      b.x = (b.x + 1) % 1;
      b.y = (b.y + 1) % 1;

      var radius = b.r * minD * (1 + 0.12 * Math.sin(b.phase));
      var x = b.x * w;
      var y = b.y * h;
      var g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',0.55)');
      g.addColorStop(0.45, 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',0.25)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.filter = 'blur(25px)';
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  window.addEventListener('mouseleave', function () { mouse.x = -1; mouse.y = -1; });

  resize();
  requestAnimationFrame(tick);
})();
