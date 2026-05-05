"use client";

import { useEffect, useRef } from "react";

type ParticleFieldProps = {
  themeColor: string;
  activeSectionId: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  depth: number;
  colorIndex: number;
};

type RGB = { r: number; g: number; b: number };

const BASE_WHITE: RGB = { r: 255, g: 255, b: 255 };
const BASE_CYAN: RGB = { r: 56, g: 189, b: 248 };
const BASE_PURPLE: RGB = { r: 168, g: 85, b: 247 };

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return { r: 59, g: 130, b: 246 };
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function getParticleCount(width: number) {
  if (width < 768) return 15;
  if (width < 1024) return 30;
  return 70;
}

export default function ParticleField({ themeColor, activeSectionId }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const themeTargetRef = useRef<RGB>(hexToRgb(themeColor));
  const themeCurrentRef = useRef<RGB>(hexToRgb(themeColor));
  const boostUntilRef = useRef(0);
  const visibleRef = useRef(true);

  useEffect(() => {
    themeTargetRef.current = hexToRgb(themeColor);
    boostUntilRef.current = performance.now() + 500;
  }, [themeColor, activeSectionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    const createParticles = (width: number, height: number) => {
      const count = getParticleCount(width);
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: 1 + Math.random() * 2.4,
        alpha: 0.12 + Math.random() * 0.28,
        depth: 0.7 + Math.random() * 0.8,
        colorIndex: Math.floor(Math.random() * 4),
      }));
    };

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { width, height, dpr };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createParticles(width, height);
    };

    const onPointerMove = (event: PointerEvent) => {
      const { width, height } = sizeRef.current;
      if (!width || !height) return;
      mouseRef.current.x = event.clientX / width;
      mouseRef.current.y = event.clientY / height;
    };

    const drawStaticFrame = () => {
      const { width, height } = sizeRef.current;
      if (!width || !height) return;
      const current = themeCurrentRef.current;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${current.r.toFixed(0)}, ${current.g.toFixed(0)}, ${current.b.toFixed(
        0
      )}, 0.08)`;
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.5, Math.min(width, height) * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    };

    const draw = (time: number) => {
      const { width, height } = sizeRef.current;
      if (!width || !height) return;
      if (!visibleRef.current) {
        rafRef.current = window.requestAnimationFrame(draw);
        return;
      }

      const target = themeTargetRef.current;
      const current = themeCurrentRef.current;
      current.r += (target.r - current.r) * 0.05;
      current.g += (target.g - current.g) * 0.05;
      current.b += (target.b - current.b) * 0.05;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const boosting = time < boostUntilRef.current ? 1.8 : 1;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      const colors = [
        `rgba(${current.r.toFixed(0)}, ${current.g.toFixed(0)}, ${current.b.toFixed(0)}, 0.35)`,
        `rgba(${BASE_WHITE.r}, ${BASE_WHITE.g}, ${BASE_WHITE.b}, 0.35)`,
        `rgba(${BASE_CYAN.r}, ${BASE_CYAN.g}, ${BASE_CYAN.b}, 0.35)`,
        `rgba(${BASE_PURPLE.r}, ${BASE_PURPLE.g}, ${BASE_PURPLE.b}, 0.25)`,
      ];

      for (const p of particlesRef.current) {
        const influenceX = (mx - p.x / width) * 0.02 * p.depth;
        const influenceY = (my - p.y / height) * 0.02 * p.depth;
        p.x += (p.vx + influenceX) * boosting;
        p.y += (p.vy + influenceY) * boosting;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        ctx.beginPath();
        ctx.fillStyle = colors[p.colorIndex];
        ctx.globalAlpha = p.alpha;
        ctx.arc(p.x, p.y, p.radius * p.depth, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      rafRef.current = window.requestAnimationFrame(draw);
    };

    const restartLoop = () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (!reducedMotionRef.current) {
        rafRef.current = window.requestAnimationFrame(draw);
      } else {
        drawStaticFrame();
      }
    };

    const onVisibilityChange = () => {
      visibleRef.current = document.visibilityState === "visible";
    };

    const updateMotionPref = () => {
      reducedMotionRef.current = motionMedia.matches;
      restartLoop();
    };

    resize();
    updateMotionPref();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionMedia.addEventListener("change", updateMotionPref);

    return () => {
      motionMedia.removeEventListener("change", updateMotionPref);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[8]"
      aria-hidden="true"
    />
  );
}
