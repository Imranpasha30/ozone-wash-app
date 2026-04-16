import { useWindowDimensions, Platform } from 'react-native';

export const SIDEBAR_WIDTH = 240;
export const MAX_CONTENT_W = 1100;
export const BREAKPOINT_MD = 768;   // tablet / narrow desktop
export const BREAKPOINT_LG = 1024;  // wide desktop

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isWeb    = Platform.OS === 'web';
  const isLarge  = isWeb && width >= BREAKPOINT_MD;
  const isXL     = isWeb && width >= BREAKPOINT_LG;

  // Width available for content after sidebar
  const areaWidth    = isLarge ? width - SIDEBAR_WIDTH : width;
  // Capped content width inside that area
  const contentWidth = Math.min(areaWidth, MAX_CONTENT_W);

  return { width, height, isWeb, isLarge, isXL, areaWidth, contentWidth, SIDEBAR_WIDTH };
}
