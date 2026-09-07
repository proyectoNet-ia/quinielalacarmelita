/**
 * Motor de Confeti Patrio Ligero (Zero-Dependency)
 * Colores de la Bandera de México + Dorado Carmelita
 */

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  shape: 'rect' | 'circle' | 'ribbon';
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
}

const PATRIOTIC_COLORS = [
  '#006847', // Verde Bandera
  '#009c5a', // Verde Esmeralda
  '#FFFFFF', // Blanco Puro
  '#CE1126', // Rojo Patrio
  '#ff4d5e', // Rojo Fuego
  '#E0B828', // Dorado Carmelita
  '#F59E0B'  // Oro Intenso
];

export function triggerPatrioticConfetti(originX?: number, originY?: number, count = 55) {
  if (typeof window === 'undefined' || !document.body) return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const startX = originX ?? width / 2;
  const startY = originY ?? height * 0.35;

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: startX,
      y: startY,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      color: PATRIOTIC_COLORS[Math.floor(Math.random() * PATRIOTIC_COLORS.length)],
      shape: Math.random() < 0.25 ? 'circle' : 'rect',
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      wobble: Math.random() * Math.PI,
      wobbleSpeed: 0.05 + Math.random() * 0.08,
      opacity: 1
    });
  }

  let animationId: number;
  const startTime = performance.now();
  const duration = 1800; // 1.8 segundos

  function animate(now: number) {
    const elapsed = now - startTime;
    if (elapsed > duration) {
      cancelAnimationFrame(animationId);
      canvas.remove();
      return;
    }

    ctx?.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // Gravedad
      p.vx *= 0.98; // Resistencia
      p.rotation += p.vRot;
      p.wobble += p.wobbleSpeed;
      p.opacity = Math.max(0, 1 - elapsed / duration);

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.globalAlpha = p.opacity;
      ctx!.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        const scaleX = Math.cos(p.wobble);
        ctx!.scale(scaleX, 1);
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx!.restore();
    });

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
}

/**
 * Gran Celebración en Pantalla Completa:
 * Cañones cruzados desde las esquinas inferiores + ráfaga central + lluvia superior
 */
export function triggerFullScreenConfetti() {
  if (typeof window === 'undefined' || !document.body) return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];

  // 1. Cañón Izquierdo Inferior (dispara hacia arriba a la derecha)
  for (let i = 0; i < 70; i++) {
    const angle = -(Math.PI * 0.22 + Math.random() * Math.PI * 0.28); // -40° a -90°
    const speed = 12 + Math.random() * 16;
    particles.push({
      x: width * 0.05,
      y: height * 0.95,
      w: 8 + Math.random() * 7,
      h: 5 + Math.random() * 5,
      color: PATRIOTIC_COLORS[Math.floor(Math.random() * PATRIOTIC_COLORS.length)],
      shape: Math.random() < 0.2 ? 'circle' : Math.random() < 0.3 ? 'ribbon' : 'rect',
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.25,
      wobble: Math.random() * Math.PI,
      wobbleSpeed: 0.06 + Math.random() * 0.08,
      opacity: 1
    });
  }

  // 2. Cañón Derecho Inferior (dispara hacia arriba a la izquierda)
  for (let i = 0; i < 70; i++) {
    const angle = -(Math.PI * 0.50 + Math.random() * Math.PI * 0.28); // -90° a -140°
    const speed = 12 + Math.random() * 16;
    particles.push({
      x: width * 0.95,
      y: height * 0.95,
      w: 8 + Math.random() * 7,
      h: 5 + Math.random() * 5,
      color: PATRIOTIC_COLORS[Math.floor(Math.random() * PATRIOTIC_COLORS.length)],
      shape: Math.random() < 0.2 ? 'circle' : Math.random() < 0.3 ? 'ribbon' : 'rect',
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.25,
      wobble: Math.random() * Math.PI,
      wobbleSpeed: 0.06 + Math.random() * 0.08,
      opacity: 1
    });
  }

  // 3. Lluvia y explosión superior/central
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * width,
      y: -10 - Math.random() * 80,
      w: 7 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      color: PATRIOTIC_COLORS[Math.floor(Math.random() * PATRIOTIC_COLORS.length)],
      shape: Math.random() < 0.3 ? 'circle' : 'rect',
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 5,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      wobble: Math.random() * Math.PI,
      wobbleSpeed: 0.04 + Math.random() * 0.06,
      opacity: 1
    });
  }

  let animationId: number;
  const startTime = performance.now();
  const duration = 3500; // 3.5 segundos de celebración inmersiva

  function animate(now: number) {
    const elapsed = now - startTime;
    if (elapsed > duration) {
      cancelAnimationFrame(animationId);
      canvas.remove();
      return;
    }

    ctx?.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28; // Gravedad
      p.vx *= 0.985; // Fricción de aire
      p.rotation += p.vRot;
      p.wobble += p.wobbleSpeed;
      p.opacity = Math.max(0, 1 - (elapsed / duration) ** 1.3);

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.globalAlpha = p.opacity;
      ctx!.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx!.fill();
      } else if (p.shape === 'ribbon') {
        const scaleX = Math.cos(p.wobble);
        ctx!.scale(scaleX, 1);
        ctx!.fillRect(-p.w, -p.h / 3, p.w * 2, p.h * 0.7);
      } else {
        const scaleX = Math.cos(p.wobble);
        ctx!.scale(scaleX, 1);
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx!.restore();
    });

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
}
