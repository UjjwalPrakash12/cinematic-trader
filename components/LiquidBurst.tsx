"use client";

import { useEffect, useRef } from "react";

type LiquidBurstProps = {
  themeColor: string;
  activeSectionId: string;
};

type BurstParticle = {
  angle: number;
  speed: number;
  radius: number;
  life: number;
  maxLife: number;
  alpha: number;
};

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return { r: 59, g: 130, b: 246 };
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

export default function LiquidBurst({ themeColor, activeSectionId }: LiquidBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    if (reducedMotion) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = isMobile ? 8 : Math.floor(18 + Math.random() * 10);
    const particles: BurstParticle[] = Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: (isMobile ? 45 : 70) + Math.random() * (isMobile ? 35 : 70),
      radius: 2 + Math.random() * (isMobile ? 6 : 10),
      life: 0,
      maxLife: 900,
      alpha: 0.45 + Math.random() * 0.25,
    }));

    const color = hexToRgb(themeColor);
    const start = performance.now();
    const cx = width / 2;
    const cy = height / 2;

    const draw = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      for (const particle of particles) {
        particle.life = Math.min(particle.maxLife, elapsed);
        const t = particle.life / particle.maxLife;
        const eased = 1 - (1 - t) * (1 - t);
        const dist = particle.speed * eased;
        const x = cx + Math.cos(particle.angle) * dist;
        const y = cy + Math.sin(particle.angle) * dist;
        const alpha = particle.alpha * (1 - t);
        const radius = particle.radius * (1 + t * 0.5);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha.toFixed(3)})`;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (elapsed < 900) {
        rafRef.current = window.requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
      }
    };

    rafRef.current = window.requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      ctx.clearRect(0, 0, width, height);
    };
  }, [activeSectionId, themeColor]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9]"
      aria-hidden="true"
    />
  );
}
