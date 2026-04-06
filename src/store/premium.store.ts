import { create } from 'zustand';
import { amcAPI } from '../services/api';

interface PremiumState {
  isPremium: boolean;
  setPremium: (val: boolean) => void;
  checkStatus: () => Promise<void>;
}

const usePremiumStore = create<PremiumState>((set) => ({
  isPremium: false,
  setPremium: (val) => set({ isPremium: val }),
  checkStatus: async () => {
    try {
      const res = (await amcAPI.getMyContracts()) as any;
      const contracts = res.data?.contracts || [];
      const hasActive = contracts.some((c: any) => c.status === 'active');
      set({ isPremium: hasActive });
    } catch (_) {
      set({ isPremium: false });
    }
  },
}));

export default usePremiumStore;
