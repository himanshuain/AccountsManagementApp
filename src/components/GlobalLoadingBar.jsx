"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";

/**
 * Global loading bar that appears at the top of the app
 * Shows when any data is being fetched or mutations are in progress
 */
export function GlobalLoadingBar() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  
  const isLoading = isFetching > 0 || isMutating > 0;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] h-1 overflow-hidden"
          style={{ background: 'hsl(var(--muted) / 0.3)' }}
        >
          <motion.div
            className="h-full bg-primary"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1,
              ease: "easeInOut",
            }}
            style={{ width: "40%" }}
          />
          {/* Secondary bar for smoother effect */}
          <motion.div
            className="absolute top-0 h-full bg-primary/50"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
              delay: 0.3,
            }}
            style={{ width: "30%" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GlobalLoadingBar;
