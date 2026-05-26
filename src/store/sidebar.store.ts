/**
 * Sidebar collapsed state — shared between all role navigators (Customer, Field,
 * Admin) so the user's preference persists when switching tabs.
 *
 * Persisted to AsyncStorage on web so a refresh keeps the layout.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SIDEBAR_WIDTH_EXPANDED = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: false,
  toggle: () => {
    const next = !get().collapsed;
    set({ collapsed: next });
    AsyncStorage.setItem('sidebar_collapsed', next ? '1' : '0').catch(() => {});
  },
  setCollapsed: (v: boolean) => {
    set({ collapsed: v });
    AsyncStorage.setItem('sidebar_collapsed', v ? '1' : '0').catch(() => {});
  },
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem('sidebar_collapsed');
      if (stored === '1') set({ collapsed: true });
    } catch {}
  },
}));

// Hydrate once at module load.
useSidebarStore.getState().hydrate();

export default useSidebarStore;
