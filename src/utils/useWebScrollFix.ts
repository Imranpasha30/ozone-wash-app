import { useEffect, useLayoutEffect, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Fixes React Native Web's ScrollView so it actually scrolls.
 *
 * RNW's ScrollView outer div has `flex: 1 1 0%` which makes flex-grow expand
 * the element to match its unconstrained parent (= full content height),
 * so clientHeight === scrollHeight and there is nothing to scroll.
 *
 * We force max-height = (viewport height − scroller's top offset). Plain
 * `100vh` is wrong when a header pushes the scroller down — the bottom of the
 * scroller would then extend below the viewport (body has overflow:hidden) and
 * the last few rows become unreachable.
 *
 * Usage:
 *   const scrollRef = useWebScrollFix();
 *   <ScrollView ref={scrollRef} style={{ flex: 1 }} ...>
 */
export const useWebScrollFix = () => {
  const scrollRef = useRef<any>(null);
  const { height: screenH } = useWindowDimensions();

  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const sv = scrollRef.current;
    if (!sv) return;
    const inner = (sv.getScrollableNode?.() ?? sv) as HTMLElement;
    if (!inner?.style) return;

    const apply = () => {
      const top = inner.getBoundingClientRect().top;
      const available = Math.max(120, Math.round(window.innerHeight - top));
      inner.style.maxHeight = `${available}px`;
      inner.style.height = `${available}px`;
      inner.style.overflowY = 'scroll';
      inner.style.overflowX = 'hidden';
    };

    apply();
    // Re-measure on resize and after layout settles (fonts, async data).
    const ro = (window as any).ResizeObserver
      ? new (window as any).ResizeObserver(apply)
      : null;
    ro?.observe(inner.parentElement || inner);
    window.addEventListener('resize', apply);
    const t1 = setTimeout(apply, 50);
    const t2 = setTimeout(apply, 250);

    return () => {
      window.removeEventListener('resize', apply);
      ro?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [screenH]);

  return scrollRef;
};
