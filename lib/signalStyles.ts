import type { Signal } from "@/lib/marketData";

type SignalStyle = {
  border: string;
  glow: string;
  text: string;
  gradientOverlay: string;
};

const SIGNAL_STYLES: Record<Signal, SignalStyle> = {
  "STRONG BUY": {
    border: "rgba(34,197,94,0.5)",
    glow: "rgba(34,197,94,0.45)",
    text: "rgb(134,239,172)",
    gradientOverlay:
      "linear-gradient(140deg, rgba(34,197,94,0.2), rgba(34,197,94,0.04) 45%, rgba(0,0,0,0))",
  },
  BUY: {
    border: "rgba(34,197,94,0.3)",
    glow: "rgba(34,197,94,0.3)",
    text: "rgb(134,239,172)",
    gradientOverlay:
      "linear-gradient(140deg, rgba(34,197,94,0.14), rgba(34,197,94,0.03) 45%, rgba(0,0,0,0))",
  },
  HOLD: {
    border: "rgba(245,158,11,0.3)",
    glow: "rgba(245,158,11,0.28)",
    text: "rgb(253,186,116)",
    gradientOverlay:
      "linear-gradient(140deg, rgba(245,158,11,0.14), rgba(245,158,11,0.03) 45%, rgba(0,0,0,0))",
  },
  SELL: {
    border: "rgba(239,68,68,0.3)",
    glow: "rgba(239,68,68,0.3)",
    text: "rgb(252,165,165)",
    gradientOverlay:
      "linear-gradient(140deg, rgba(239,68,68,0.14), rgba(239,68,68,0.03) 45%, rgba(0,0,0,0))",
  },
  AVOID: {
    border: "rgba(239,68,68,0.5)",
    glow: "rgba(239,68,68,0.45)",
    text: "rgb(252,165,165)",
    gradientOverlay:
      "linear-gradient(140deg, rgba(239,68,68,0.2), rgba(239,68,68,0.04) 45%, rgba(0,0,0,0))",
  },
};

export function getSignalStyles(signal: Signal): SignalStyle {
  return SIGNAL_STYLES[signal];
}
