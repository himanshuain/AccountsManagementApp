"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SCROLL_DELTA = 10;
const TOP_SHOW_Y = 32;

/**
 * Hide fixed header/footer while scrolling down the profile list; show on scroll up.
 */
export function useProfileScrollChrome(scrollRef, { enabled = true, layoutKey = "default" } = {}) {
  const [chromeHidden, setChromeHidden] = useState(false);
  const [scrollEl, setScrollEl] = useState(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(88);
  const lastScrollY = useRef(0);
  const rafRef = useRef(null);

  const bindScrollRef = useCallback(
    node => {
      scrollRef.current = node;
      setScrollEl(node);
    },
    [scrollRef]
  );

  const measureChrome = useCallback(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
    if (footerRef.current) {
      setFooterHeight(footerRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    setChromeHidden(false);
    lastScrollY.current = 0;
    const id = requestAnimationFrame(() => {
      measureChrome();
      if (scrollRef.current) {
        lastScrollY.current = scrollRef.current.scrollTop;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [layoutKey, measureChrome, scrollRef]);

  useEffect(() => {
    if (!enabled) return;
    measureChrome();
    const ro = new ResizeObserver(measureChrome);
    const header = headerRef.current;
    const footer = footerRef.current;
    if (header) ro.observe(header);
    if (footer) ro.observe(footer);
    return () => ro.disconnect();
  }, [enabled, layoutKey, measureChrome]);

  useEffect(() => {
    if (!enabled) {
      setChromeHidden(false);
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

        if (y <= TOP_SHOW_Y) {
          setChromeHidden(false);
        } else if (delta > SCROLL_DELTA) {
          setChromeHidden(true);
        } else if (delta < -SCROLL_DELTA) {
          setChromeHidden(false);
        }

        lastScrollY.current = y;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, scrollEl, layoutKey]);

  useEffect(() => {
    if (!enabled || !scrollEl) return;
    const id = requestAnimationFrame(measureChrome);
    return () => cancelAnimationFrame(id);
  }, [enabled, scrollEl, layoutKey, measureChrome]);

  const chromeTransition =
    "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform";

  return {
    chromeHidden,
    headerRef,
    footerRef,
    scrollRef: bindScrollRef,
    headerHeight,
    footerHeight,
    chromeTransition,
    showChrome: () => setChromeHidden(false),
  };
}