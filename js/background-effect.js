/**
 * Liquid background — one continuous flowing field (no blobs).
 * Soft animated gradients + mouse influence. Reduced-motion aware.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('canvas-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const config = {
    waveCount: 3,
    waveRadius: 1.4,
    waveSpeed: 0.00035,
    waveSpread: 0.45,
    mouseInfluence: 0.0002,
    blur: 40,
  };

  let w = 0, h = 0;
  let time = 0;
  let mouse = { x: -1, y: -1 };
  let rafId = null;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function tick() {
    const slow = reducedMotion.matches ? 0.08 : 1;
    time += config.waveSpeed * slow;
    const minDim = Math.min(w, h);
    const mx = mouse.x >= 0 ? mouse.x / w : 0.5;
    const my = mouse.y >= 0 ? mouse.y / h : 0.5;

    ctx.fillStyle = 'rgb(12, 10, 22)';
    ctx.fillRect(0, 0, w, h);

    const r = config.waveRadius * minDim;

    for (let i = 0; i < config.waveCount; i++) {
      const phase = (i / config.waveCount) * Math.PI * 2;
      const t = time + phase;
      // Slow flowing motion
      let cx = 0.5 + Math.sin(t) * config.waveSpread;
      let cy = 0.5 + Math.cos(t * 0.7) * config.waveSpread;
      // Slight pull toward mouse
      if (mouse.x >= 0 && mouse.y >= 0) {
        cx += (mx - cx) * config.mouseInfluence * 60;
        cy += (my - cy) * config.mouseInfluence * 60;
      }
      const px = cx * w;
      const py = cy * h;

      const gr = ctx.createRadialGradient(px, py, 0, px, py, r);
      gr.addColorStop(0, 'rgba(220, 228, 245, 0.22)');
      gr.addColorStop(0.4, 'rgba(120, 130, 160, 0.12)');
      gr.addColorStop(0.7, 'rgba(40, 45, 65, 0.05)');
      gr.addColorStop(1, 'rgba(12, 10, 22, 0)');

      ctx.save();
      ctx.filter = `blur(${config.blur}px)`;
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    rafId = requestAnimationFrame(tick);
  }

  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onMouseLeave() {
    mouse.x = -1;
    mouse.y = -1;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseleave', onMouseLeave);
  resize();
  rafId = requestAnimationFrame(tick);
})();
