"use client";

import SectionFX from "@/components/SectionFX";
import { useActiveSection } from "@/hooks/useActiveSection";
import { SECTIONS } from "@/lib/sections";

const sectionIds = SECTIONS.map((section) => section.id);

export default function FXController() {
  const activeSectionId = useActiveSection(sectionIds);
  const activeTheme =
    SECTIONS.find((section) => section.id === activeSectionId)?.themeColor ??
    SECTIONS[0]?.themeColor ??
    "#3b82f6";

  return <SectionFX themeColor={activeTheme} activeSectionId={activeSectionId} />;
}
