import { useWindowDimensions, Platform } from 'react-native';
import useSidebarStore, { SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from '../store/sidebar.store';

// Default export kept for backward-compat with screens importing { SIDEBAR_WIDTH }.
// Live width is via useResponsive() which reads the collapsed store.
export const SIDEBAR_WIDTH = SIDEBAR_WIDTH_EXPANDED;
export const MAX_CONTENT_W = 1100;
export const BREAKPOINT_MD = 768;   // tablet / narrow desktop
export const BREAKPOINT_LG = 1024;  // wide desktop

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const isWeb    = Platform.OS === 'web';
  const isLarge  = isWeb && width >= BREAKPOINT_MD;
  const isXL     = isWeb && width >= BREAKPOINT_LG;

  // Live sidebar width — reacts to the collapse toggle.
  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  // Width available for content after sidebar
  const areaWidth    = isLarge ? width - sidebarWidth : width;
  // Capped content width inside that area
  const contentWidth = Math.min(areaWidth, MAX_CONTENT_W);

  return {
    width, height, isWeb, isLarge, isXL,
    areaWidth, contentWidth,
    SIDEBAR_WIDTH: sidebarWidth,
    sidebarCollapsed: collapsed,
  };
}
