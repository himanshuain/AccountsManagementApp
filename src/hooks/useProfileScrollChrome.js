"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TOP_SHOW_Y = 16;
/** Px of downward scroll to fully hide chrome (after leaving top) */
const HIDE_SCROLL_PX = 140;
/** Px of upward scroll to fully show chrome */
const SHOW_SCROLL_PX = 90;
/** Summary block max height for collapse (px) — matches tallest summary card */
const SUMMARY_MAX_HEIGHT_PX = 160;

/**
 * Scroll-linked chrome: 0 = fully visible, 1 = summary + footer hidden.
 * DOM updates are imperative during scroll — no React re-renders per frame.
 */
export function useProfileScrollChrome(scrollRef, { enabled = true, layoutKey = "default" } = {}) {
  const [scrollEl, setScrollEl] = useState(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const summaryChromeRef = useRef(null);

  const expandedHeaderH = useRef(0);
  const compactHeaderH = useRef(0);
  const expandedFooterH = useRef(88);
  const lastScrollY = useRef(0);
  const rafRef = useRef(null);
  const chromeShiftRef = useRef(0);

  const bindScrollRef = useCallback(
    node => {
      scrollRef.current = node;
      setScrollEl(node);
    },
    [scrollRef]
  );

  const paintChrome = useCallback(shift => {
    const clamped = Math.min(1, Math.max(0, shift));
    chromeShiftRef.current = clamped;

    const summaryEl = summaryChromeRef.current;
    if (summaryEl) {
      summaryEl.style.opacity = String(1 - clamped);
      summaryEl.style.maxHeight = `${Math.max(0, 1 - clamped) * SUMMARY_MAX_HEIGHT_PX}px`;
      summaryEl.style.pointerEvents = clamped >= 0.92 ? "none" : "";
    }

    const footerEl = footerRef.current;
    if (footerEl) {
      footerEl.style.transform = `translate3d(0, ${clamped * 100}%, 0)`;
      footerEl.style.pointerEvents = clamped >= 0.92 ? "none" : "";
    }

    const compactH = compactHeaderH.current || expandedHeaderH.current;
    const expandedH = expandedHeaderH.current || compactH;
    const footH = expandedFooterH.current;
    const minPad = 12;
    const paddingTop = Math.max(minPad, expandedH - (expandedH - compactH) * clamped);
    const paddingBottom = Math.max(minPad, footH - (footH - minPad) * clamped);

    const listEl = scrollRef.current;
    if (listEl) {
      listEl.style.paddingTop = `${paddingTop}px`;
      listEl.style.paddingBottom = `${paddingBottom}px`;
    }
  }, [scrollRef]);

  const measureHeights = useCallback(() => {
    const header = headerRef.current;
    const footer = footerRef.current;
    if (header) {
      const h = header.offsetHeight;
      if (chromeShiftRef.current >= 0.98) {
        compactHeaderH.current = h;
      } else if (chromeShiftRef.current <= 0.02) {
        expandedHeaderH.current = h;
      }
    }
    if (footer) {
      expandedFooterH.current = footer.offsetHeight;
    }
    paintChrome(chromeShiftRef.current);
  }, [paintChrome]);

  const applyChromeShift = useCallback(
    next => {
      const clamped = Math.min(1, Math.max(0, next));
      if (Math.abs(clamped - chromeShiftRef.current) < 0.001) return;
      paintChrome(clamped);
    },
    [paintChrome]
  );

  useEffect(() => {
    chromeShiftRef.current = 0;
    lastScrollY.current = 0;
    const id = requestAnimationFrame(() => {
      measureHeights();
      if (scrollRef.current) {
        lastScrollY.current = scrollRef.current.scrollTop;
        paintChrome(0);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [layoutKey, measureHeights, paintChrome, scrollRef]);

  useEffect(() => {
    if (!enabled) {
      paintChrome(0);
      return;
    }
    measureHeights();
    let resizeRaf = null;
    const ro = new ResizeObserver(() => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        measureHeights();
      });
    });
    const header = headerRef.current;
    const footer = footerRef.current;
    if (header) ro.observe(header);
    if (footer) ro.observe(footer);
    return () => ro.disconnect();
  }, [enabled, layoutKey, measureHeights, paintChrome]);

  useEffect(() => {
    if (!enabled) {
      paintChrome(0);
      return;
    }
    const el = scrollEl;
    if (!el) return;

    lastScrollY.current = el.scrollTop;

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const y = el.scrollTop;
        const delta = y - lastScrollY.current;
        let shift = chromeShiftRef.current;

        if (y <= TOP_SHOW_Y) {
          shift = 0;
        } else if (delta > 0) {
          shift = Math.min(1, shift + delta / HIDE_SCROLL_PX);
        } else if (delta < 0) {
          shift = Math.max(0, shift - (-delta) / SHOW_SCROLL_PX);
        }

        applyChromeShift(shift);
        lastScrollY.current = y;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, scrollEl, layoutKey, applyChromeShift, paintChrome]);

  const showChrome = useCallback(() => {
    paintChrome(0);
    measureHeights();
  }, [paintChrome, measureHeights]);

  return {
    headerRef,
    footerRef,
    summaryChromeRef,
    scrollRef: bindScrollRef,
    showChrome,
  };
}