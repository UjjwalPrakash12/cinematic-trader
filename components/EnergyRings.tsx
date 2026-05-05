"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type EnergyRingsProps = {
  themeColor: string;
};

const DESKTOP_RINGS = [
  { size: "58vw", duration: 8.5, delay: 0 },
  { size: "70vw", duration: 10.2, delay: 0.7 },
  { size: "82vw", duration: 11.6, delay: 1.3 },
];

export default function EnergyRings({ themeColor }: EnergyRingsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobileMedia = window.matchMedia("(max-width: 768px)");
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setIsMobile(mobileMedia.matches);
      setReducedMotion(motionMedia.matches);
    };
    update();
    mobileMedia.addEventListener("change", update);
    motionMedia.addEventListener("change", update);
    return () => {
      mobileMedia.removeEventListener("change", update);
      motionMedia.removeEventListener("change", update);
    };
  }, []);

  const rings = isMobile ? DESKTOP_RINGS.slice(0, 1) : DESKTOP_RINGS;

  return (
    <div className="pointer-events-none fixed inset-0 z-[7] overflow-hidden">
      {rings.map((ring, index) => (
        <motion.div
          key={`${ring.size}-${index}`}
          className="absolute left-1/2 top-1/2 rounded-full border"
          style={{
            width: ring.size,
            height: ring.size,
            borderColor: `${themeColor}44`,
            boxShadow: isMobile ? "none" : `0 0 12px ${themeColor}1f`,
            filter: isMobile ? "none" : "blur(0.7px)",
            transform: "translate(-50%, -50%)",
          }}
          animate={
            reducedMotion
              ? { opacity: 0.12, scale: 1, rotate: 0 }
              : {
                  scale: [1, 1.08, 1],
                  opacity: [0.08, 0.16, 0.08],
                  rotate: [0, 6, 0],
                }
          }
          transition={{
            duration: ring.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: ring.delay,
          }}
        />
      ))}
    </div>
  );
}
