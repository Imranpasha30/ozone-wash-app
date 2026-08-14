import { create } from 'zustand';

export interface TankEntry {
  tank_type: 'overhead' | 'underground' | 'sump' | 'sintex' | '';
  tank_size_litres: number;
  name?: string;          // user-friendly label e.g. 'Terrace Tank', 'Block A Sump'
  address?: string;       // undefined = same as booking primary address (Tank 1)
  lat?: number | null;
  lng?: number | null;
  address_id?: string | null;  // saved-address book reference (per-tank location)
}

// Service frequency plan (spec §4). one_time = single service (0% off);
// half_yearly = 2 visits/yr (10% off); quarterly = 4 (15%); monthly = 12 (30%).
export type ServicePlan = 'one_time' | 'half_yearly' | 'quarterly' | 'monthly';

interface BookingDraft {
  // Step 1
  property_type: 'residential' | 'commercial' | '';
  tanks: TankEntry[];                  // multi-tank support
  tank_type: 'overhead' | 'underground' | 'sump' | 'sintex' | '';   // first tank (backward compat)
  tank_size_litres: number;                               // first tank (backward compat)
  address: string;
  lat: number | null;
  lng: number | null;
  address_id: string | null;           // saved-address book reference (primary)
  contact_name: string;
  contact_phone: string;
  plan: ServicePlan;                   // chosen in Step 1 (AMC plans = non-one_time)
  // Step 2
  slot_time: string;
  // Step 3
  addons: string[];
  amc_plan: string;
  payment_method: 'upi' | 'card' | 'wallet' | 'cod';
  // Payment-step AMC upsell (user had one_time, buys a plan while paying)
  purchase_amc_plan: Exclude<ServicePlan, 'one_time'> | '';
  // Pricing (from API)
  base_price: number;
  addon_total: number;
  subtotal: number;
  gst: number;
  grand_total: number;
  amount_paise: number;
  pricing: any;
}

interface BookingStore {
  draft: BookingDraft;
  setStep1: (data: {
    property_type: 'residential' | 'commercial';
    tanks: TankEntry[];
    tank_type: 'overhead' | 'underground' | 'sump' | 'sintex';
    tank_size_litres: number;
    address: string;
    lat?: number | null;
    lng?: number | null;
    address_id?: string | null;
    contact_name?: string;
    contact_phone?: string;
    plan?: ServicePlan;
  }) => void;
  setStep2: (slot_time: string) => void;
  setStep3: (data: { addons: string[]; amc_plan: string; payment_method: 'upi' | 'card' | 'wallet' | 'cod'; pricing: any }) => void;
  setPlan: (plan: ServicePlan) => void;
  setUpsellPlan: (plan: BookingDraft['purchase_amc_plan'], pricing?: any) => void;
  reset: () => void;
}

const defaultDraft: BookingDraft = {
  property_type: '',
  tanks: [{ tank_type: '', tank_size_litres: 1000 }],
  tank_type: '',
  tank_size_litres: 1000,
  address: '',
  lat: null,
  lng: null,
  address_id: null,
  contact_name: '',
  contact_phone: '',
  plan: 'one_time',
  slot_time: '',
  addons: [],
  amc_plan: '',
  payment_method: 'upi',
  purchase_amc_plan: '',
  base_price: 0,
  addon_total: 0,
  subtotal: 0,
  gst: 0,
  grand_total: 0,
  amount_paise: 0,
  pricing: null,
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
        pricing: data.pricing,
      },
    })),

  setPlan: (plan) =>
    set((s) => ({ draft: { ...s.draft, plan } })),

  // Payment-step AMC upsell — swaps the bill for the annual-plan invoice.
  setUpsellPlan: (plan, pricing) =>
    set((s) => ({
      draft: {
        ...s.draft,
        purchase_amc_plan: plan,
        ...(pricing ? {
          base_price: pricing.base_price,
          addon_total: pricing.addon_total,
          subtotal: pricing.subtotal,
          gst: pricing.gst,
          grand_total: pricing.grand_total,
          amount_paise: pricing.amount_paise,
          pricing,
        } : {}),
      },
    })),

  reset: () => set({ draft: { ...defaultDraft } }),
}));

export default useBookingStore;
