import { useEffect, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Fixes React Native Web's ScrollView so it actually scrolls.
 *
 * RNW's ScrollView grows to its content height (flex 1 1 0% + min-height:auto)
 * when its ancestor chain isn't viewport-bounded, so clientHeight===scrollHeight
 * and there is nothing to scroll — the bottom gets clipped by body{overflow:hidden}.
 *
 * We force the scroll node to max-height = (viewport height − its top offset)
 * with overflow-y:auto, using !important inline styles so no RNW atomic class
 * can override it, and re-apply across the first ~1.5 s to catch async header /
 * font / data layout shifts. This is version-independent (no reliance on RNW's
 * build-hashed class names, which change across upgrades).
 *
 * Usage:
 *   const scrollRef = useWebScrollFix();
 *   <ScrollView ref={scrollRef} ...>
 */
export const useWebScrollFix = () => {
  const scrollRef = useRef<any>(null);
  const { height: screenH } = useWindowDimensions();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Resolve the underlying DOM element across RNW versions/ref shapes.
    const resolveNode = (): HTMLElement | null => {
      const sv: any = scrollRef.current;
      if (!sv) return null;
      let n: any = typeof sv.getScrollableNode === 'function' ? sv.getScrollableNode() : sv;
      // getScrollableNode can hand back another RN ref — drill to the element.
      if (n && !(n instanceof HTMLElement) && typeof n.getScrollableNode === 'function') {
        n = n.getScrollableNode();
      }
      return n instanceof HTMLElement ? n : null;
    };

    let ro: any = null;
    const apply = (): boolean => {
      const node = resolveNode();
      if (!node) return false;
      const top = node.getBoundingClientRect().top;
      const available = Math.max(160, Math.round(window.innerHeight - top));
      node.style.setProperty('height', `${available}px`, 'important');
      node.style.setProperty('max-height', `${available}px`, 'important');
      node.style.setProperty('overflow-y', 'auto', 'important');
      node.style.setProperty('overflow-x', 'hidden', 'important');
      // Attach a ResizeObserver the first time we successfully resolve the node,
      // so later content/layout shifts keep the viewport clamp fresh.
      if (!ro && (window as any).ResizeObserver) {
        ro = new (window as any).ResizeObserver(() => apply());
        try { ro.observe(node); } catch (_) {}
      }
      return true;
    };

    apply();
    window.addEventListener('resize', apply);
    // POLL until the scroll node actually mounts — many screens gate the
    // ScrollView behind a `loading` flag, so it appears only AFTER async data
    // arrives (which can be well past a few fixed timers). Re-apply every 200 ms
    // for ~12 s; harmless + idempotent, and the clamp is a plain div height so
    // it scrolls regardless of whether the flex ancestor chain is bounded.
    let ticks = 0;
    const iv = setInterval(() => { apply(); if (++ticks >= 60) clearInterval(iv); }, 200);

    return () => {
      window.removeEventListener('resize', apply);
      clearInterval(iv);
      ro?.disconnect();
    };
  }, [screenH]);

  return scrollRef;
};
