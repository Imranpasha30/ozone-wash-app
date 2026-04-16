import { useEffect, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Fixes React Native Web's ScrollView so it actually scrolls.
 *
 * RNW's ScrollView outer div has `flex: 1 1 0%` which makes flex-grow expand
 * the element to match its unconstrained parent (= full content height),
 * so clientHeight === scrollHeight and there is nothing to scroll.
 * Setting `max-height` on the scrollable DOM node prevents flex-grow from
 * exceeding the viewport height, forcing the content to overflow and scroll.
 *
 * Usage:
 *   const scrollRef = useWebScrollFix();
 *   <ScrollView ref={scrollRef} style={{ flex: 1 }} ...>
 */
export const useWebScrollFix = () => {
  const scrollRef = useRef<any>(null);
  const { height: screenH } = useWindowDimensions();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const sv = scrollRef.current;
    if (!sv) return;
    const inner = (sv.getScrollableNode?.() ?? sv) as HTMLElement;
    if (inner?.style) {
      inner.style.maxHeight = `${screenH}px`;
      inner.style.overflowY = 'scroll';
      inner.style.overflowX = 'hidden';
    }
  }, [screenH]);

  return scrollRef;
};
