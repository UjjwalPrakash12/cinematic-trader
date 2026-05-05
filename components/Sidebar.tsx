"use client";

import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import AIPanel from "@/components/AIPanel";
import { scrollToSection } from "@/components/SmoothScroll";
import { useActiveSection } from "@/hooks/useActiveSection";
import { SECTIONS } from "@/lib/sections";

const sectionIds = SECTIONS.map((section) => section.id);

export default function Sidebar() {
  const activeId = useActiveSection(sectionIds);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <AIPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[220px] border-r border-white/10 bg-black/35 px-8 py-8 backdrop-blur-xl md:flex md:flex-col">
        <div>
          <p className="font-display text-2xl tracking-[0.14em] text-white">
            GENIUS TRADER
          </p>
          <p className="mt-8 text-[10px] tracking-[0.24em] text-text-secondary">
            WHAT ARE YOU LOOKING FOR?
          </p>
        </div>

        <nav className="mt-8 flex flex-1 flex-col justify-center gap-5">
          {SECTIONS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={clsx(
                  "group flex items-center gap-2 text-left text-[11px] uppercase tracking-[0.26em] text-text-secondary transition-all duration-200 hover:translate-x-1 hover:text-white",
                  isActive && "text-white"
                )}
              >
                {isActive ? (
                  <ChevronRight size={13} className="text-white" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-white/25 transition-colors group-hover:bg-white/50" />
                )}
                <span>{item.navLabel}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            className="w-full border border-white/20 px-4 py-3 text-left text-[11px] tracking-[0.22em] text-white transition-colors hover:bg-white/10"
            aria-expanded={isPanelOpen}
            aria-controls="ai-trader-panel"
          >
            ASK AI TRADER
          </button>
          <p className="text-[10px] tracking-[0.2em] text-text-secondary">
            GLOBAL MARKET ENGINE / v1.0
          </p>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/45 px-5 py-4 backdrop-blur-lg md:hidden">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl tracking-[0.12em] text-white">GENIUS TRADER</p>
          <button
            type="button"
            onClick={() => setIsPanelOpen(true)}
            className="border border-white/20 px-3 py-2 text-[10px] tracking-[0.2em] text-white"
            aria-expanded={isPanelOpen}
            aria-controls="ai-trader-panel"
          >
            ASK AI
          </button>
        </div>
      </div>
    </>
  );
}
