"use client";

import { motion } from "framer-motion";
import EnergyRings from "@/components/EnergyRings";
import LiquidBurst from "@/components/LiquidBurst";
import ParticleField from "@/components/ParticleField";

type SectionFXProps = {
  themeColor: string;
  activeSectionId: string;
};

export default function SectionFX({ themeColor, activeSectionId }: SectionFXProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[6]" aria-hidden="true">
      <motion.div
        key={activeSectionId}
        className="absolute inset-0"
        initial={{ opacity: 0.1, scale: 1.008, filter: "blur(20px)" }}
        animate={{ opacity: 0.16, scale: 1, filter: "blur(14px)" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{
          background: `radial-gradient(circle at 50% 48%, ${themeColor}1a 0%, transparent 62%)`,
        }}
      />
      <EnergyRings themeColor={themeColor} />
      <ParticleField themeColor={themeColor} activeSectionId={activeSectionId} />
      <LiquidBurst themeColor={themeColor} activeSectionId={activeSectionId} />
    </div>
  );
}
