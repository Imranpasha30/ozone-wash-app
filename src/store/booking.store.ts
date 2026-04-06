import { create } from 'zustand';

interface BookingDraft {
  // Step 1
  tank_type: 'overhead' | 'underground' | 'sump' | '';
  tank_size_litres: number;
  address: string;
  // Step 2
  slot_time: string;
  // Step 3
  addons: string[];
  amc_plan: string;
  payment_method: 'upi' | 'card' | 'wallet' | 'cod';
  // Pricing (from API)
  base_price: number;
  addon_total: number;
  subtotal: number;
  gst: number;
  grand_total: number;
  amount_paise: number;
}

interface BookingStore {
  draft: BookingDraft;
  setStep1: (data: { tank_type: 'overhead' | 'underground' | 'sump'; tank_size_litres: number; address: string }) => void;
  setStep2: (slot_time: string) => void;
  setStep3: (data: { addons: string[]; amc_plan: string; payment_method: 'upi' | 'card' | 'wallet' | 'cod'; pricing: any }) => void;
  reset: () => void;
}

const defaultDraft: BookingDraft = {
  tank_type: '',
  tank_size_litres: 1000,
  address: '',
  slot_time: '',
  addons: [],
  amc_plan: '',
  payment_method: 'upi',
  base_price: 0,
  addon_total: 0,
  subtotal: 0,
  gst: 0,
  grand_total: 0,
  amount_paise: 0,
};

const useBookingStore = create<BookingStore>((set) => ({
  draft: { ...defaultDraft },

  setStep1: (data) =>
    set((s) => ({ draft: { ...s.draft, ...data } })),

  setStep2: (slot_time) =>
    set((s) => ({ draft: { ...s.draft, slot_time } })),

  setStep3: (data) =>
    set((s) => ({
      draft: {
        ...s.draft,
        addons: data.addons,
        amc_plan: data.amc_plan,
        payment_method: data.payment_method,
        base_price: data.pricing.base_price,
        addon_total: data.pricing.addon_total,
        subtotal: data.pricing.subtotal,
        gst: data.pricing.gst,
        grand_total: data.pricing.grand_total,
        amount_paise: data.pricing.amount_paise,
      },
    })),

  reset: () => set({ draft: { ...defaultDraft } }),
}));

export default useBookingStore;
