"use client";

import { useEffect, useMemo, useState } from "react";

export function useActiveSection(sectionIds: string[]): string {
  const sectionKey = sectionIds.join("|");
  const fallback = useMemo(() => sectionIds[0] ?? "", [sectionKey]);
  const [activeSectionId, setActiveSectionId] = useState<string>(fallback);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.45)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries[0]?.target?.id) {
          setActiveSectionId(visibleEntries[0].target.id);
          return;
        }

        setActiveSectionId((current) => current || fallback);
      },
      {
        threshold: [0.25, 0.45, 0.6, 0.8],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [fallback, sectionKey]);

  return activeSectionId || fallback;
}
