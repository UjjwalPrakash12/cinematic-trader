"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { formatPercent, formatPrice } from "@/lib/formatters";
import { useMarketData } from "@/hooks/useMarketData";
import { getAIResponse } from "@/lib/aiResponses";
import { sanitizeText, looksLikeHtmlPayload } from "@/lib/sanitize";
import type { Message } from "@/types/chat";

type AIPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MAX_PROMPT_LENGTH = 1000;
const CLIENT_RATE_WINDOW_MS = 60_000;
const CLIENT_RATE_MAX = 20;

const WELCOME_MESSAGE: Message = {
  id: "ai-welcome",
  role: "ai",
  content:
    "AI Trader online. Ask me about BTC, NVDA, NIFTY, GOLD, TSLA, or the broader market for signal, reasoning, and confidence.",
  createdAt: 0,
};

const MessageBubble = memo(function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[82%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "border-white/20 bg-white/[0.09] text-white"
            : "border-white/10 bg-black/35 text-text-secondary"
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
});

export default function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      ...WELCOME_MESSAGE,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const recentSendsRef = useRef<number[]>([]);
  const { data: marketData } = useMarketData();

  const canSend = useMemo(() => input.trim().length > 0 && !isTyping, [input, isTyping]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      setInput(next.length > MAX_PROMPT_LENGTH ? next.slice(0, MAX_PROMPT_LENGTH) : next);
    },
    []
  );

  const buildAIResponse = useCallback(
    (prompt: string): string => {
      const normalized = prompt.toLowerCase();
      const symbols = ["BTC", "ETH", "AAPL", "NVDA", "TSLA", "NIFTY", "GOLD"] as const;
      const matched = symbols.find((symbol) => normalized.includes(symbol.toLowerCase()));
      if (!matched) return getAIResponse(prompt);

      const live = marketData?.assets.find((asset) => asset.symbol === matched);
      if (!live) return getAIResponse(prompt);

      return `${matched} is currently trading at ${formatPrice(matched, live.price)}.
Change: ${formatPercent(live.changePercent)}.
RSI: ${live.rsi.toFixed(1)}, showing ${live.rsiInterpretation.toLowerCase()} momentum.
MACD trend: ${live.macdTrend}.
Signal: ${live.signal} with ${Math.round(live.confidence)}% confidence.`;
    },
    [marketData]
  );

  useEffect(() => {
    if (!isOpen) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
      listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const pushAiMessage = useCallback((content: string) => {
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      role: "ai",
      content,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, aiMessage]);
  }, []);

  const sendMessage = useCallback(() => {
    if (!canSend) return;

    // Client-side input validation (defense-in-depth — server must validate too).
    const sanitized = sanitizeText(input, {
      maxLength: MAX_PROMPT_LENGTH,
      allowNewlines: true,
    });
    if (sanitized.length === 0) {
      setInput("");
      return;
    }
    if (looksLikeHtmlPayload(sanitized)) {
      setInput("");
      pushAiMessage("That message contains content I can't process. Please rephrase.");
      return;
    }

    // Client-side rate limit to prevent local spamming / accidental loops.
    const now = Date.now();
    const recent = recentSendsRef.current.filter((t) => now - t < CLIENT_RATE_WINDOW_MS);
    if (recent.length >= CLIENT_RATE_MAX) {
      pushAiMessage("You're sending messages too quickly. Please wait a moment and try again.");
      return;
    }
    recent.push(now);
    recentSendsRef.current = recent;

    const userMessage: Message = {
      id: `user-${now}`,
      role: "user",
      content: sanitized,
      createdAt: now,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    typingTimerRef.current = window.setTimeout(() => {
      try {
        pushAiMessage(buildAIResponse(sanitized));
      } catch {
        pushAiMessage("Something went wrong while generating a response. Please try again.");
      } finally {
        setIsTyping(false);
      }
    }, 700);
  }, [buildAIResponse, canSend, input, pushAiMessage]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          id="ai-trader-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-y-0 right-0 z-[90] flex h-[100dvh] w-full flex-col border-l border-white/10 bg-black/70 shadow-[-18px_0_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:w-[380px]"
          role="dialog"
          aria-modal="true"
          aria-label="AI trader panel"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="font-display text-2xl tracking-[0.1em] text-white">AI TRADER</p>
              <p className="mt-1 flex items-center gap-2 text-[10px] tracking-[0.24em] text-text-secondary">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                ONLINE
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 p-2 text-white transition hover:scale-105 hover:bg-white/10"
              aria-label="Close AI panel"
            >
              <X size={16} />
            </button>
          </div>

          <div
            ref={messagesContainerRef}
            className="ai-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-5"
            aria-live="polite"
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-text-secondary">
                  <span>Analyzing market</span>
                  <span className="ml-1 inline-flex">
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ...
                    </motion.span>
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={listEndRef} />
          </div>

          <div className="border-t border-white/10 bg-black/35 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="rounded-2xl border border-white/15 bg-black/40 p-2 focus-within:border-accent-blue/70 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.35)]">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={onKeyDown}
                rows={2}
                maxLength={MAX_PROMPT_LENGTH}
                placeholder="Ask about BTC, NVDA, NIFTY..."
                aria-label="Ask AI trader"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="ai-scrollbar max-h-40 min-h-[44px] w-full resize-none bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-text-secondary"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!canSend}
                  className="rounded-lg border border-white/20 px-4 py-2 text-[11px] tracking-[0.2em] text-white transition hover:scale-105 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  SEND
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
