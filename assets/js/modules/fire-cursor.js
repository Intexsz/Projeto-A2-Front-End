/**
 * Cursor de fogo com rastro curto e rajadas ao clicar.
 * A camada é pequena, não captura eventos e respeita movimento reduzido.
 */
import { clamp } from './utils.js';
import { motionEnabled } from './particles.js';

const COLORS = [
  [255, 54, 5],
  [255, 91, 8],
  [255, 133, 20],
  [255, 181, 55],
  [255, 223, 132],
];
const TAU = Math.PI * 2;
const CANVAS_SIZE = 440;
const MAX_PARTICLES = 72;
const TRAIL_MS = 260;

function rgba(color, alpha) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function makeGlowSprite(color, size = 48) {
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const spriteContext = sprite.getContext('2d');
  if (!spriteContext) return sprite;

  const center = size / 2;
  const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 244, 196, 0.96)');
  gradient.addColorStop(0.12, rgba(color, 0.96));
  gradient.addColorStop(0.38, rgba(color, 0.62));
  gradient.addColorStop(0.72, rgba(color, 0.18));
  gradient.addColorStop(1, rgba(color, 0));
  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, size, size);
  return sprite;
}

export function initFireCursor() {
  const canvas = document.createElement('canvas');
  canvas.className = 'fire-cursor-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  document.body.append(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return { destroy() { canvas.remove(); } };

  const sparkSprites = COLORS.map((color) => makeGlowSprite(color));
  const auraSprite = makeGlowSprite(COLORS[2], 80);
  let viewportWidth = 0;
  let viewportHeight = 0;
  let originX = 0;
  let originY = 0;
  let dpr = 1;
  let frameId = 0;
  let lastFrame = 0;
  let emissionProgress = 0;
  let running = false;
  let destroyed = false;
  let particles = [];
  const pool = [];
  const trail = [];
  const pointer = {
    x: -1000,
    y: -1000,
    visible: false,
    active: false,
    type: 'mouse',
    lastMove: 0,
  };
  const reducedMotionQuery = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function moveLayer(x = pointer.x, y = pointer.y) {
    originX = clamp(x - CANVAS_SIZE / 2, 0, Math.max(0, viewportWidth - CANVAS_SIZE));
    originY = clamp(y - CANVAS_SIZE / 2, 0, Math.max(0, viewportHeight - CANVAS_SIZE));
    canvas.style.transform = `translate3d(${Math.round(originX)}px, ${Math.round(originY)}px, 0)`;
  }

  function resize() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    moveLayer();
  }

  function colorIndexForParticle() {
    const roll = Math.random();
    if (roll < 0.48) return 1;
    if (roll < 0.77) return 2;
    if (roll < 0.94) return 3;
    return 4;
  }

  function addParticle(x, y, vx, vy, burst = false) {
    if (particles.length >= MAX_PARTICLES) return;
    const particle = pool.pop() || {};
    const colorIndex = colorIndexForParticle();
    particle.x = x;
    particle.y = y;
    particle.previousX = x;
    particle.previousY = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.size = burst ? 0.9 + Math.random() * 1.9 : 0.65 + Math.random() * 1.2;
    particle.life = 0;
    particle.maxLife = burst ? 430 + Math.random() * 540 : 300 + Math.random() * 460;
    particle.color = COLORS[colorIndex];
    particle.sprite = sparkSprites[colorIndex];
    particle.glow = 3 + Math.random() * (burst ? 10 : 7);
    particle.core = Math.random() < 0.48;
    particle.streak = Math.random() < (burst ? 0.72 : 0.55);
    particles.push(particle);
  }

  function emitAlong(x0, y0, x1, y1, distance, amount) {
    if (amount <= 0) return;
    const directionX = distance > 0 ? (x1 - x0) / distance : 0;
    const directionY = distance > 0 ? (y1 - y0) / distance : 0;
    for (let i = 0; i < amount; i++) {
      const t = (i + 1) / (amount + 1);
      const x = x0 + (x1 - x0) * t + (Math.random() - 0.5) * 5;
      const y = y0 + (y1 - y0) * t + (Math.random() - 0.5) * 5;
      const backwash = 18 + Math.random() * (pointer.active ? 76 : 48);
      const vx = -directionX * backwash + (Math.random() - 0.5) * 68;
      const vy = -directionY * backwash - 26 - Math.random() * (pointer.active ? 88 : 58);
      addParticle(x, y, vx, vy);
    }
  }

  function burst(x, y) {
    const count = pointer.type === 'touch' ? 18 : 22;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.45;
      const speed = 58 + Math.random() * 178;
      addParticle(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8,
        Math.cos(angle) * speed, Math.sin(angle) * speed, true);
    }
  }

  function wake() {
    if (destroyed || running || !motionEnabled() || document.hidden) return;
    resize();
    canvas.hidden = false;
    running = true;
    lastFrame = 0;
    frameId = requestAnimationFrame(tick);
  }

  function release(index) {
    const particle = particles[index];
    particle.life = particle.maxLife;
    pool.push(particle);
    particles[index] = particles[particles.length - 1];
    particles.pop();
  }

  function drawTrail(now) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < trail.length - 1; i++) {
      const a = trail[i];
      const b = trail[i + 1];
      const fade = clamp(1 - (now - a.time) / TRAIL_MS, 0, 1);
      if (fade <= 0) continue;
      const previous = trail[i - 1] || a;
      const x0 = ((previous.x + a.x) / 2) - originX;
      const y0 = ((previous.y + a.y) / 2) - originY;
      const controlX = a.x - originX;
      const controlY = a.y - originY;
      const x1 = ((a.x + b.x) / 2) - originX;
      const y1 = ((a.y + b.y) / 2) - originY;
      const baseWidth = (2.5 + 8 * fade) * (a.active ? 1 : 0.72);

      ctx.strokeStyle = `rgba(255, 67, 6, ${fade * 0.48})`;
      ctx.lineWidth = baseWidth;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(controlX, controlY, x1, y1);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 162, 38, ${fade * 0.76})`;
      ctx.lineWidth = Math.max(1.2, baseWidth * 0.42);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(controlX, controlY, x1, y1);
      ctx.stroke();

      if (a.active || pointer.active) {
        ctx.strokeStyle = `rgba(255, 235, 166, ${fade * 0.56})`;
        ctx.lineWidth = Math.max(0.8, baseWidth * 0.15);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(controlX, controlY, x1, y1);
        ctx.stroke();
      }
    }
  }

  function drawPointerAura(now) {
    if (!pointer.visible) return;
    const fade = clamp(1 - (now - pointer.lastMove) / 260, 0, 1);
    if (fade <= 0) return;
    const radius = pointer.active ? 30 : 19;
    const strength = fade * (pointer.active ? 1 : 0.48);
    ctx.globalAlpha = strength;
    ctx.drawImage(auraSprite, pointer.x - originX - radius, pointer.y - originY - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  }

  function drawParticles(delta) {
    const seconds = delta / 1000;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.previousX = p.x;
      p.previousY = p.y;
      p.vy += 26 * seconds;
      p.vx *= Math.pow(0.986, delta / 16.67);
      p.x += p.vx * seconds;
      p.y += p.vy * seconds;
      p.life += delta;

      if (p.life >= p.maxLife) {
        release(i);
        continue;
      }

      const progress = p.life / p.maxLife;
      const fadeIn = clamp(p.life / 32, 0, 1);
      const fadeOut = clamp((1 - progress) / 0.4, 0, 1);
      const alpha = fadeIn * fadeOut;
      if (alpha < 0.015) continue;
      const x = p.x - originX;
      const y = p.y - originY;
      const spriteSize = p.size * (4.5 + p.glow * 0.28);

      if (p.streak) {
        ctx.strokeStyle = rgba(p.color, alpha * 0.6);
        ctx.lineWidth = Math.max(0.55, p.size * 0.62);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(p.previousX - originX, p.previousY - originY);
        ctx.stroke();
      }

      ctx.globalAlpha = alpha;
      ctx.drawImage(p.sprite, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
      ctx.globalAlpha = 1;
      if (p.core) {
        ctx.fillStyle = `rgba(255, 225, 150, ${alpha * 0.72})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.4, p.size * 0.26), 0, TAU);
        ctx.fill();
      }
    }
  }

  function tick(now) {
    if (!running) return;
    const delta = lastFrame ? Math.min(now - lastFrame, 50) : 16.7;
    lastFrame = now;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.globalCompositeOperation = 'lighter';

    let firstActive = 0;
    while (firstActive < trail.length && now - trail[firstActive].time > TRAIL_MS) firstActive++;
    if (firstActive) trail.splice(0, firstActive);
    drawTrail(now);
    drawParticles(delta);
    drawPointerAura(now);
    ctx.globalCompositeOperation = 'source-over';

    const auraAlive = pointer.visible && now - pointer.lastMove < 270;
    if (!particles.length && trail.length < 2 && !auraAlive) {
      running = false;
      lastFrame = 0;
      pointer.visible = false;
      pointer.x = -1000;
      pointer.y = -1000;
      canvas.hidden = true;
      return;
    }
    frameId = requestAnimationFrame(tick);
  }

  function onPointerMove(event) {
    if (!motionEnabled() || document.hidden || event.pointerType === 'touch') return;
    const now = performance.now();
    const x = event.clientX;
    const y = event.clientY;
    pointer.type = event.pointerType || 'mouse';
    pointer.visible = true;
    pointer.lastMove = now;

    if (pointer.x < 0) {
      trail.length = 0;
      pointer.x = x;
      pointer.y = y;
      trail.push({ x, y, time: now, active: pointer.active });
      moveLayer(x, y);
      wake();
      return;
    }

    const x0 = pointer.x;
    const y0 = pointer.y;
    const dx = x - x0;
    const dy = y - y0;
    const distance = Math.hypot(dx, dy);
    pointer.x = x;
    pointer.y = y;
    trail.push({ x, y, time: now, active: pointer.active });
    if (trail.length > 24) trail.shift();
    moveLayer(x, y);

    emissionProgress += distance * (pointer.active ? 0.13 : 0.075);
    const count = Math.min(10, Math.floor(emissionProgress));
    if (count > 0) {
      emissionProgress -= count;
      emitAlong(x0, y0, x, y, distance, count);
    }
    wake();
  }

  function onPointerDown(event) {
    if (!motionEnabled() || document.hidden) return;
    pointer.type = event.pointerType || 'mouse';
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.visible = true;
    pointer.active = true;
    pointer.lastMove = performance.now();
    trail.length = 0;
    trail.push({ x: pointer.x, y: pointer.y, time: pointer.lastMove, active: true });
    moveLayer(pointer.x, pointer.y);
    burst(pointer.x, pointer.y);
    document.body.classList.add('aura-active');
    wake();
  }

  function onPointerUp() {
    pointer.active = false;
    document.body.classList.remove('aura-active');
  }

  function onPointerOut(event) {
    if (event.relatedTarget) return;
    pointer.active = false;
    pointer.visible = false;
    pointer.x = -1000;
    pointer.y = -1000;
    document.body.classList.remove('aura-active');
  }

  function clear() {
    running = false;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
    particles.forEach((p) => pool.push(p));
    particles = [];
    trail.length = 0;
    pointer.visible = false;
    pointer.active = false;
    pointer.x = -1000;
    pointer.y = -1000;
    pointer.lastMove = 0;
    emissionProgress = 0;
    document.body.classList.remove('aura-active');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    canvas.hidden = true;
  }

  function refresh() {
    if (!motionEnabled() || document.hidden) clear();
  }

  function destroy() {
    clear();
    destroyed = true;
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('pointerout', onPointerOut);
    window.removeEventListener('blur', onPointerUp);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('projeto-fenix:prefs-changed', refresh);
    reducedMotionQuery?.removeEventListener?.('change', refresh);
    canvas.remove();
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  window.addEventListener('pointerout', onPointerOut, { passive: true });
  window.addEventListener('blur', onPointerUp);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('projeto-fenix:prefs-changed', refresh);
  reducedMotionQuery?.addEventListener?.('change', refresh);
  resize();

  return { refresh, destroy };
}
