"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPercent, formatPrice } from "@/lib/formatters";
import { usePrevious } from "@/hooks/usePrevious";
import { useMarketAsset } from "@/hooks/useMarketData";
import Sparkline from "@/components/Sparkline";
import type { Asset } from "@/lib/marketData";
import { getSignalStyles } from "@/lib/signalStyles";

type MarketCardProps = {
  asset: Asset;
  isPrimary?: boolean;
};

export default function MarketCard({ asset, isPrimary = false }: MarketCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileMode, setMobileMode] = useState(false);
  const [valueFlash, setValueFlash] = useState<"up" | "down" | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const { asset: liveAsset, isLoading, error } = useMarketAsset(asset.symbol);

  const rawTiltX = useMotionValue(0);
  const rawTiltY = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const rotateX = useSpring(rawTiltX, { stiffness: 120, damping: 14 });
  const rotateY = useSpring(rawTiltY, { stiffness: 120, damping: 14 });
  const liftY = useTransform(rotateY, [-6, 0, 6], [-1.5, 0, 1.5]);
  const sheenX = useTransform(rotateY, [-6, 6], [-10, 10]);
  const glowOpacity = useSpring(0, { stiffness: 110, damping: 18 });
  const effectiveSignal = liveAsset?.signal ?? asset.signal;
  const styleSet = useMemo(() => getSignalStyles(effectiveSignal), [effectiveSignal]);
  const radialLight = useMotionTemplate`radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.2), rgba(255,255,255,0.04) 26%, transparent 62%)`;
  const effectivePrice = liveAsset?.price ?? asset.price;
  const effectiveChange = liveAsset?.change ?? asset.change;
  const effectiveChangePercent = liveAsset?.changePercent ?? asset.changePercent;
  const effectiveConfidence = liveAsset?.confidence ?? asset.confidence;
  const effectiveRSI = liveAsset?.rsi ?? asset.rsi;
  const effectiveMACD = liveAsset?.macdTrend ?? asset.macd;
  const effectiveIsUp = effectiveChangePercent >= 0;
  const prevPrice = usePrevious(effectivePrice);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMedia = window.matchMedia("(max-width: 768px)");
    const update = () => {
      setReducedMotion(motionMedia.matches);
      setMobileMode(mobileMedia.matches);
    };
    update();
    motionMedia.addEventListener("change", update);
    mobileMedia.addEventListener("change", update);
    return () => {
      motionMedia.removeEventListener("change", update);
      mobileMedia.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(prevPrice) || !Number.isFinite(effectivePrice)) return;
    if (prevPrice === undefined || prevPrice === effectivePrice) return;
    setValueFlash(effectivePrice > prevPrice ? "up" : "down");
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setValueFlash(null), 700);
  }, [effectivePrice, prevPrice]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  const tiltEnabled = !mobileMode && !reducedMotion;
  const glowStrength = isPrimary ? 0.3 : 0.18;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    glowX.set(px * 100);
    glowY.set(py * 100);
    if (tiltEnabled) {
      rawTiltY.set((px - 0.5) * 12);
      rawTiltX.set((py - 0.5) * -12);
      glowOpacity.set(1);
    } else {
      glowOpacity.set(0.45);
    }
  };

  const handleMouseLeave = () => {
    rawTiltX.set(0);
    rawTiltY.set(0);
    glowX.set(50);
    glowY.set(50);
    glowOpacity.set(0);
  };

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative w-full overflow-hidden rounded-2xl border bg-black/40 p-5 text-white backdrop-blur-sm will-change-transform md:p-6"
      style={{
        borderColor: styleSet.border,
        rotateX: tiltEnabled ? rotateX : 0,
        rotateY: tiltEnabled ? rotateY : 0,
        transformPerspective: 1000,
        y: liftY,
        transform: "translate3d(0,0,0)",
      }}
      whileHover={
        reducedMotion
          ? undefined
          : {
              scale: 1.03,
              boxShadow: `0 14px 30px rgba(0,0,0,0.36), 0 0 18px ${styleSet.glow}`,
            }
      }
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: styleSet.gradientOverlay, opacity: glowStrength }}
      />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: valueFlash ? 0.15 : 0,
          background:
            valueFlash === "up"
              ? "rgba(74,222,128,0.18)"
              : valueFlash === "down"
              ? "rgba(248,113,113,0.18)"
              : "transparent",
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: glowOpacity,
          background: radialLight,
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: glowOpacity,
          background:
            "linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.12) 48%, transparent 66%)",
          x: sheenX,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          boxShadow: `inset 0 0 0 1px ${styleSet.border}, 0 0 20px ${styleSet.glow}`,
          opacity: isPrimary ? 0.75 : 0.55,
        }}
      />
      <div
        className="scan-line pointer-events-none absolute left-0 w-full"
        style={{ opacity: 0.2, animationDuration: "4s" }}
      />

      <div className="relative z-10">
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-text-secondary">{asset.symbol}</p>
            <p className="mt-1 font-display text-3xl uppercase leading-none tracking-[0.08em]">
              {asset.name}
            </p>
          </div>
          <div className="text-right">
            <span
              className="inline-flex rounded-full border px-3 py-1 text-[10px] tracking-[0.2em]"
              style={{ borderColor: styleSet.border, color: styleSet.text }}
            >
              {effectiveSignal}
            </span>
            <p className="mt-2 text-[11px] tracking-[0.2em] text-text-secondary">
              CONFIDENCE{" "}
              <span className="text-white">
                {isLoading && !liveAsset ? "..." : `${Math.round(effectiveConfidence)}%`}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-4">
          <div>
            <p className="font-mono text-[34px] leading-none md:text-[38px]">
              {isLoading && !liveAsset ? "Loading..." : formatPrice(asset.symbol, effectivePrice)}
            </p>
            <p
              className="mt-2 text-sm tracking-[0.12em]"
              style={{ color: effectiveIsUp ? "rgb(74,222,128)" : "rgb(248,113,113)" }}
            >
              {isLoading && !liveAsset
                ? "SYNCING..."
                : `${effectiveChange >= 0 ? "+" : ""}${effectiveChange.toFixed(2)} (${formatPercent(
                    effectiveChangePercent
                  )})`}
            </p>
          </div>
          <div className="self-end text-right text-[11px] tracking-[0.2em] text-text-secondary">
            <p>RSI {isLoading && !liveAsset ? "..." : effectiveRSI.toFixed(1)}</p>
            <p className="mt-1">{effectiveMACD}</p>
            <p className="mt-1">VOL {asset.volume}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[1.1fr_0.9fr] items-end gap-4">
          <p
            className="text-sm leading-relaxed text-text-secondary"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {asset.reasoning}
          </p>
          <Sparkline points={asset.sparkline} className="h-[72px] w-full" />
        </div>
        {error && (
          <p className="mt-3 text-[10px] tracking-[0.18em] text-red-300/80">DATA UNAVAILABLE</p>
        )}
      </div>
    </motion.article>
  );
}
