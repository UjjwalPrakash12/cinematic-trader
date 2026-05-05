"use client";

import { motion } from "framer-motion";
import DepthBackground from "@/components/DepthBackground";

type CinematicSectionProps = {
  id: string;
  index: number;
  total: number;
  title: string;
  subtitle: string;
  meta: string;
  themeColor: string;
  children?: React.ReactNode;
};

const sectionTransition = {
  duration: 1.1,
  ease: [0.22, 1, 0.36, 1] as const,
};

const titleContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const titleWord = {
  hidden: { y: 80, opacity: 0, filter: "blur(12px)" },
  show: { y: 0, opacity: 1, filter: "blur(0px)" },
};

export default function CinematicSection({
  id,
  index,
  total,
  title,
  subtitle,
  meta,
  themeColor,
  children,
}: CinematicSectionProps) {
  const words = title.split(" ");
  const sectionNumber = String(index + 1).padStart(2, "0");
  const totalNumber = String(total).padStart(2, "0");

  return (
    <motion.section
      id={id}
      className="snap-section flex items-center px-6 md:px-12"
      initial={{ opacity: 0, scale: 1.06, filter: "blur(18px)" }}
      whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      viewport={{ amount: 0.45, once: false }}
      transition={sectionTransition}
    >
      <DepthBackground themeColor={themeColor} />

      <div className="relative mx-auto w-full max-w-[1100px] pt-8 md:pt-0">
        <motion.div
          className="mb-6 inline-flex items-center gap-3 text-[10px] tracking-[0.3em] text-text-secondary"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.45, once: false }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: themeColor }}
          />
          <span>{meta}</span>
        </motion.div>

        <motion.h1
          className="max-w-5xl font-display text-[52px] uppercase leading-[0.92] tracking-[0.08em] text-white sm:text-[72px] lg:text-[96px] xl:text-[132px]"
          variants={titleContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ amount: 0.45, once: false }}
        >
          {words.map((word, wordIndex) => (
            <motion.span
              key={`${id}-${word}-${wordIndex}`}
              variants={titleWord}
              transition={{ duration: 0.75, ease: "easeOut" }}
              className="mr-[0.28em] inline-block"
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          className="mt-7 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-[17px]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.45, once: false }}
          transition={{ delay: 0.45, duration: 0.8 }}
        >
          {subtitle}
        </motion.p>

        {children && (
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.45, once: false }}
            transition={{ delay: 0.65, duration: 0.8 }}
          >
            {children}
          </motion.div>
        )}
      </div>

      <motion.div
        className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 text-[42px] font-thin tracking-[0.18em] text-white/20 md:block xl:text-[56px]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ amount: 0.45, once: false }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        {sectionNumber} / {totalNumber}
      </motion.div>
    </motion.section>
  );
}
