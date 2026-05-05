"use client";

export default function HUD() {
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div className="absolute right-4 top-4 md:right-8 md:top-6">
        <div className="inline-flex items-center gap-2 border border-white/15 bg-black/45 px-4 py-2 text-[10px] tracking-[0.24em] text-white backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          AI ONLINE
        </div>
      </div>

      <p className="absolute bottom-6 left-6 hidden text-[10px] tracking-[0.24em] text-text-secondary md:block">
        GLOBAL MARKET ENGINE / v1.0
      </p>
      <p className="absolute bottom-6 right-6 hidden text-[10px] tracking-[0.24em] text-text-secondary md:block">
        REAL-TIME SIGNAL MONITORING
      </p>
    </div>
  );
}
