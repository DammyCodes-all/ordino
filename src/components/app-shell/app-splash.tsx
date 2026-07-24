"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const SPLASH_MS = 2000;
const STORAGE_KEY = "ordino-splash-seen-session";

export function AppSplash({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(STORAGE_KEY) !== "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!visible) {
      onDone?.();
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }
      setVisible(false);
      onDone?.();
    }, SPLASH_MS);

    return () => window.clearTimeout(timer);
  }, [onDone, visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="ordino-splash"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden={!visible}
        >
          <div className="flex flex-col items-center gap-6 px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.82, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="size-28 overflow-hidden rounded-[1.75rem] bg-black sm:size-36"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ordino-logo.png"
                alt=""
                width={144}
                height={144}
                className="size-full object-cover"
                draggable={false}
              />
            </motion.div>

            <motion.p
              className="brand-wordmark-solid text-5xl text-[#c6a68a] sm:text-6xl"
              style={{
                backgroundColor: "#c6a68a",
              }}
              initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: 0.28,
                duration: 0.65,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              ordino
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
