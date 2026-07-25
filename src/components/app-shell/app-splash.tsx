"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

const SPLASH_KEY = "ordino-splash-seen";
const SPLASH_MS = 2200;

export function AppSplash({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SPLASH_KEY) === "1") return;
    } catch {
      // still show splash if storage is blocked
    }

    setVisible(true);
    const finish = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_KEY, "1");
      } catch {
        // ignore
      }
      setVisible(false);
    }, SPLASH_MS);

    return () => window.clearTimeout(finish);
  }, []);

  return (
    <>
      <AnimatePresence>
        {visible ? (
          <motion.div
            key="ordino-splash"
            className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden"
            style={{
              backgroundColor: "var(--background)",
              backgroundImage: "var(--paper-grain)",
              backgroundSize: "var(--paper-grain-size)",
              backgroundRepeat: "repeat",
              backgroundBlendMode: "multiply",
            }}
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
            }}
            aria-hidden
          >
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{
                background:
                  "radial-gradient(ellipse 70% 50% at 50% 48%, color-mix(in oklab, white 55%, transparent), transparent 70%)",
              }}
            />

            <div className="relative flex flex-col items-center gap-5 px-8">
              <motion.img
                src="/ordino-logo.png"
                alt=""
                width={96}
                height={96}
                className="size-20 object-contain sm:size-24"
                initial={{ opacity: 0, scale: 0.72, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />

              <motion.p
                className="brand-wordmark text-5xl sm:text-6xl"
                initial={{ opacity: 0, y: 14, letterSpacing: "0.18em" }}
                animate={{ opacity: 1, y: 0, letterSpacing: "-0.03em" }}
                transition={{
                  delay: 0.28,
                  duration: 0.75,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                ordino
              </motion.p>

              <motion.span
                className="mt-1 h-px w-16 origin-center bg-border"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{
                  delay: 0.55,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {children}
    </>
  );
}
