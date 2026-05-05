"use client";

import Lenis from "lenis";
import { useEffect } from "react";

let lenisInstance: Lenis | null = null;

export function scrollToSection(id: string) {
  if (typeof window === "undefined") return;
  const element = document.getElementById(id);
  if (!element) return;

  if (lenisInstance) {
    lenisInstance.scrollTo(element, { duration: 1.1, lock: true });
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

type SmoothScrollProps = {
  children: React.ReactNode;
};

export default function SmoothScroll({ children }: SmoothScrollProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.08,
      duration: 1.2,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
    });

    if (lenisInstance && lenisInstance !== lenis) {
      lenisInstance.destroy();
    }
    lenisInstance = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
      if (lenisInstance === lenis) {
        lenisInstance = null;
      }
    };
  }, []);

  return <>{children}</>;
}
