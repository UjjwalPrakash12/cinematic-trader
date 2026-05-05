"use client";

import { motion } from "framer-motion";

type DepthBackgroundProps = {
  themeColor: string;
};

export default function DepthBackground({ themeColor }: DepthBackgroundProps) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
      <div
        className="absolute inset-0 opacity-35"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${themeColor}33 0%, transparent 55%)`,
        }}
      />

      <motion.div
        className="absolute -left-20 top-20 h-80 w-80 rounded-full blur-[120px]"
        style={{ backgroundColor: `${themeColor}40` }}
        animate={{ x: [-60, 60, -60], y: [-40, 40, -40], scale: [1, 1.15, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute bottom-10 right-0 h-72 w-72 rounded-full blur-[130px]"
        style={{ backgroundColor: `${themeColor}33` }}
        animate={{ x: [-60, 60, -60], y: [-40, 40, -40], scale: [1, 1.15, 1] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -left-1/3 top-1/4 h-24 w-[160%] rotate-[-22deg] bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl"
        animate={{ x: ["-10%", "12%", "-10%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="grid-overlay" />
      <div className="noise-overlay" />
      <div className="scan-line" />
    </div>
  );
}
