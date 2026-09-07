/**
 * Motor de Confeti Patrio Ligero (Zero-Dependency)
 * Colores de la Bandera de México + Dorado Carmelita
 */

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  opacity: number;
}

const PATRIOTIC_COLORS = [
  '#006847', // Verde Bandera
  '#009c5a', // Verde Claro
  '#FFFFFF', // Blanco
  '#CE1126', // Rojo Patrio
  '#ff4d5e', // Rojo Claro
  '#E0B828'  // Dorado Carmelita
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
      size: 5 + Math.random() * 6,
      color: PATRIOTIC_COLORS[Math.floor(Math.random() * PATRIOTIC_COLORS.length)],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
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
      p.opacity = Math.max(0, 1 - elapsed / duration);

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.globalAlpha = p.opacity;
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx!.restore();
    });

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
}
