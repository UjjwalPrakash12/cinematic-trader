"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import MarketCard from "@/components/MarketCard";
import type { Asset } from "@/lib/marketData";

type FloatingCardsProps = {
  main: Asset;
  secondary: Asset[];
};

type LayerConfig = {
  xRange: number;
  yRange: number;
  className: string;
  rotate: number;
  scale: number;
};

const LAYERS: LayerConfig[] = [
  {
    xRange: 8,
    yRange: 8,
    className:
      "left-[-10%] top-[-8%] hidden w-[62%] opacity-80 blur-[2px] md:block",
    rotate: -6,
    scale: 0.92,
  },
  {
    xRange: 6,
    yRange: 6,
    className: "right-[-10%] top-[2%] hidden w-[58%] opacity-75 blur-[3px] lg:block",
    rotate: 7,
    scale: 0.9,
  },
  {
    xRange: 7,
    yRange: 7,
    className: "left-[4%] bottom-[-14%] hidden w-[56%] opacity-75 blur-[2px] lg:block",
    rotate: -4,
    scale: 0.91,
  },
  {
    xRange: 8,
    yRange: 8,
    className: "right-[6%] bottom-[-16%] hidden w-[55%] opacity-70 blur-[3px] xl:block",
    rotate: 5,
    scale: 0.9,
  },
];

function FloatingLayer({
  asset,
  config,
  index,
  x,
  y,
  reducedMotion,
  isMobile,
}: {
  asset: Asset;
  config: LayerConfig;
  index: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
  reducedMotion: boolean;
  isMobile: boolean;
}) {
  const px = useTransform(x, [-1, 1], [-config.xRange, config.xRange]);
  const py = useTransform(y, [-1, 1], [-config.yRange, config.yRange]);
  const floatDistance = isMobile ? 5 : 12;
  const rotateSwing = isMobile ? 1 : 2;

  return (
    <motion.div
      className={`absolute ${config.className}`}
      style={{
        x: px,
        y: py,
        transform: "translate3d(0,0,0)",
      }}
    >
      <motion.div
        className="will-change-transform"
        style={{ rotate: config.rotate, scale: config.scale, transform: "translate3d(0,0,0)" }}
        animate={
          reducedMotion
            ? undefined
            : {
                y: [-floatDistance, floatDistance],
                rotate: [config.rotate - rotateSwing, config.rotate + rotateSwing],
              }
        }
        transition={{
          duration: 4.4 + index * 0.73,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      >
        <MarketCard asset={asset} />
      </motion.div>
    </motion.div>
  );
}

export default function FloatingCards({ main, secondary }: FloatingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 80, damping: 20 });
  const springY = useSpring(pointerY, { stiffness: 80, damping: 20 });

  const mainX = useTransform(springX, [-1, 1], [-14, 14]);
  const mainY = useTransform(springY, [-1, 1], [-14, 14]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMedia = window.matchMedia("(max-width: 768px)");
    const update = () => {
      setReducedMotion(motionMedia.matches);
      setIsMobile(mobileMedia.matches);
    };
    update();
    motionMedia.addEventListener("change", update);
    mobileMedia.addEventListener("change", update);
    return () => {
      motionMedia.removeEventListener("change", update);
      mobileMedia.removeEventListener("change", update);
    };
  }, []);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || isMobile || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const normalizedX = Math.max(-1, Math.min(1, (px - 0.5) * 2));
    const normalizedY = Math.max(-1, Math.min(1, (py - 0.5) * 2));
    pointerX.set(normalizedX);
    pointerY.set(normalizedY);
  };

  const handleLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative mx-auto w-full max-w-5xl py-2"
    >
      {secondary.slice(0, 4).map((asset, index) => (
        <FloatingLayer
          key={`${asset.symbol}-${index}`}
          asset={asset}
          config={LAYERS[index]}
          index={index}
          x={springX}
          y={springY}
          reducedMotion={reducedMotion}
          isMobile={isMobile}
        />
      ))}

      <motion.div
        className="relative z-20 mx-auto w-full max-w-2xl"
        style={{ x: mainX, y: mainY, transform: "translate3d(0,0,0)" }}
      >
        <motion.div
          className="will-change-transform"
          style={{ transform: "translate3d(0,0,0)" }}
          animate={
            reducedMotion
              ? undefined
              : { y: [isMobile ? -5 : -12, isMobile ? 5 : 12], rotate: [-1.6, 1.6] }
          }
          transition={{
            duration: 5.35,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        >
          <MarketCard asset={main} isPrimary />
        </motion.div>
      </motion.div>
    </div>
  );
}
