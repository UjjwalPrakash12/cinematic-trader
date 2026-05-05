"use client";

import clsx from "clsx";
import { scrollToSection } from "@/components/SmoothScroll";
import { useActiveSection } from "@/hooks/useActiveSection";
import { SECTIONS } from "@/lib/sections";

const sectionIds = SECTIONS.map((section) => section.id);

export default function ScrollIndicator() {
  const activeId = useActiveSection(sectionIds);
  const activeIndex = Math.max(
    0,
    SECTIONS.findIndex((section) => section.id === activeId)
  );

  return (
    <div className="fixed right-8 top-1/2 z-40 hidden -translate-y-1/2 md:block">
      <div className="flex flex-col items-center gap-3">
        {SECTIONS.map((section) => {
          const isActive = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              aria-label={`Go to ${section.navLabel}`}
              onClick={() => scrollToSection(section.id)}
              className={clsx(
                "h-2.5 w-2.5 rounded-full border border-white/35 bg-transparent transition-all duration-250",
                isActive && "h-4 w-4 border-transparent"
              )}
              style={{
                backgroundColor: isActive ? section.themeColor : "transparent",
                boxShadow: isActive ? `0 0 16px ${section.themeColor}99` : "none",
              }}
            />
          );
        })}
      </div>
      <p className="mt-4 text-center text-[10px] tracking-[0.28em] text-text-secondary">
        {String(activeIndex + 1).padStart(2, "0")} / {String(SECTIONS.length).padStart(2, "0")}
      </p>
    </div>
  );
}
