/**
 * AutoWashBookingScreen — 7-step booking wizard for Ozone Auto Wash.
 * Spec: Master Prompt v2.0 PART 4 + Auto Wash Scope PDF Section 3.2.
 *
 * Steps:
 *   1. Vehicle select (or add new)
 *   2. Service package (EcoRinse / EcoShield / OzoneComplete / HygieneElite)
 *   3. Add-ons (10 options)
 *   4. Date, time slot, location
 *   5. Subscription upsell (optional)
 *   6. Review + price summary
 *   7. Payment (UPI / card / wallet / COD)
 *
 * One screen, internal step state. Avoids a navigation stack explosion
 * for what is fundamentally one transactional flow.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { autoWashAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { alert as showAlert } from '../../services/dialog';
import {
  ArrowLeft, ArrowRight, Plus, CheckCircle, Car, Sparkle, Calendar, MapPin, Drop,
} from '../../components/Icons';
import WebContainer from '../../components/WebContainer';

type Vehicle = {
  id: string;
  vehicle_type: 'hatchback' | 'sedan' | 'suv_muv' | 'luxury' | 'two_wheeler';
  registration_number: string;
  make?: string | null;
  model?: string | null;
  nickname?: string | null;
  is_primary: boolean;
};

type Pkg = {
  code: string; display_name: string; tagline: string;
  features: string[];
  price_hatchback_paise: number; price_sedan_paise: number;
  price_suv_paise: number; price_luxury_paise: number;
};

type Addon = {
  code: string; display_name: string; benefit: string;
  price_hatchback_paise: number; price_sedan_paise: number;
  price_suv_paise: number; price_luxury_paise: number;
  coming_soon: boolean;
};

type Plan = {
  code: string; display_name: string; cadence_label: string;
  washes_per_cycle: number; price_hatchback_paise: number;
  price_suv_paise: number; addon_discount_pct: number;
  highlight: boolean; notes: string | null;
};

type QuoteResult = {
  items: { kind: 'package' | 'addon'; code: string; name: string; price_paise: number }[];
  subtotal_paise: number;
  discount_paise: number;
  total_paise: number;
  ecoscore_preview_water_saved_litres: number;
};

const STEPS = ['Vehicle', 'Package', 'Add-ons', 'Schedule', 'Subscription', 'Review', 'Payment'] as const;
type StepIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const SLOTS = ['07:00-09:00', '09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00'];

function rupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

function priceFieldFor(type: Vehicle['vehicle_type']) {
  if (type === 'hatchback' || type === 'two_wheeler') return 'price_hatchback_paise';
  if (type === 'sedan') return 'price_sedan_paise';
  if (type === 'suv_muv') return 'price_suv_paise';
  return 'price_luxury_paise';
}

export default function AutoWashBookingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const scrollRef = useWebScrollFix();

  const [step, setStep] = useState<StepIdx>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [dateStr, setDateStr] = useState('');
  const [slot, setSlot] = useState<string | null>(null);
  const [gatedCommunity, setGatedCommunity] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Service-address capture. Auto-wash uses jobs.location_address (no
  // bookings row) so we collect text + GPS coords for the crew to navigate.
  const [address, setAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);

  // Extra stops — each entry creates a separate job at the same slot.
  // Lets the customer book multiple cars at multiple locations in one go.
  type Stop = {
    vehicle_id: string | null;
    location_address: string;
    location_lat: number | null;
    location_lng: number | null;
  };
  const [additionalStops, setAdditionalStops] = useState<Stop[]>([]);
  const [stopGpsBusy, setStopGpsBusy] = useState<number | null>(null);

  const addStop = () => setAdditionalStops((prev) => [
    ...prev,
    { vehicle_id: null, location_address: '', location_lat: null, location_lng: null },
  ]);
  const removeStop = (idx: number) =>
    setAdditionalStops((prev) => prev.filter((_, i) => i !== idx));
  const updateStop = (idx: number, patch: Partial<Stop>) =>
    setAdditionalStops((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const useGpsForStop = async (idx: number) => {
    setStopGpsBusy(idx);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let addr = '';
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        });
        const p = places?.[0];
        if (p) addr = [p.name, p.street, p.district, p.city].filter(Boolean).join(', ');
      } catch (_) {}
      updateStop(idx, {
        location_lat: pos.coords.latitude,
        location_lng: pos.coords.longitude,
        location_address: addr || additionalStops[idx]?.location_address || '',
      });
    } catch (_) {}
    finally { setStopGpsBusy(null); }
  };

  const [quote, setQuote] = useState<QuoteResult | null>(null);

  /* ── Load catalog + vehicles ──────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [pkgRes, addRes, planRes, vehRes] = await Promise.all([
          autoWashAPI.getPackages(),
          autoWashAPI.getAddons(),
          autoWashAPI.getSubscriptionPlans(),
          autoWashAPI.listVehicles(),
        ]);
        setPackages(pkgRes.data.packages || []);
        setAddons(addRes.data.addons || []);
        setPlans(planRes.data.plans || []);
        setVehicles(vehRes.data.vehicles || []);
        // Pre-select primary vehicle
        const primary = (vehRes.data.vehicles || []).find((v: Vehicle) => v.is_primary);
        if (primary) setSelectedVehicleId(primary.id);
      } catch (e: any) {
        Alert.alert('Failed to load', e?.message || 'Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Re-quote whenever selection changes ──────────────────────────────── */
  const currentVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  useEffect(() => {
    if (!currentVehicle || !selectedPackage) { setQuote(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await autoWashAPI.quote({
          vehicle_type: currentVehicle.vehicle_type,
          package_code: selectedPackage as Pkg['code'] as any,
          addon_codes: Array.from(selectedAddons),
          subscription_code: selectedPlan,
        });
        if (!cancelled) setQuote(res.data);
      } catch (e) { if (!cancelled) setQuote(null); }
    })();
    return () => { cancelled = true; };
  }, [currentVehicle?.id, selectedPackage, selectedAddons, selectedPlan]);

  /* ── Navigation gates ─────────────────────────────────────────────────── */
  const canAdvance = (): boolean => {
    if (step === 0) return !!selectedVehicleId;
    if (step === 1) return !!selectedPackage;
    if (step === 2) return true;        // addons optional
    // Step 3 now also requires a service address so the crew can navigate.
    // Each additional stop also needs a vehicle + address.
    if (step === 3) {
      if (!dateStr || !slot || address.trim().length === 0) return false;
      for (const s of additionalStops) {
        if (!s.vehicle_id || !s.location_address.trim()) return false;
      }
      return true;
    }
    if (step === 4) return true;        // subscription optional
    if (step === 5) return !!quote;
    return false;
  };

  const next = () => { if (canAdvance()) setStep((s) => Math.min(6, s + 1) as StepIdx); };
  const back = () => { setStep((s) => Math.max(0, s - 1) as StepIdx); };

  /* Capture the device's current coordinates + reverse-geocode into a human
   * address (best-effort). User can still edit the address text afterwards. */
  const useCurrentLocation = async () => {
    setGpsBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        await showAlert({ title: 'Permission needed', message: 'Enable location access to auto-fill the service address.' });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationLat(pos.coords.latitude);
      setLocationLng(pos.coords.longitude);
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        });
        const p = places?.[0];
        if (p) {
          const parts = [p.name, p.street, p.district, p.city, p.region, p.postalCode].filter(Boolean);
          if (parts.length > 0) setAddress(parts.join(', '));
        }
      } catch (_) {}
    } catch (e: any) {
      await showAlert({ title: 'Could not get location', message: e?.message || 'Try entering the address manually.' });
    } finally { setGpsBusy(false); }
  };

  /* ── Submit booking ───────────────────────────────────────────────────── */
  // `submitted` latches true once the API call succeeds and keeps the payment
  // buttons disabled even after `submitting` flips back to false. Stops the
  // duplicate-booking race where a user re-taps Pay during the navigation
  // transition (especially on web where Alert.alert silently no-ops).
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!currentVehicle || !selectedPackage || !dateStr || !slot) return;
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const [yyyy, mm, dd] = dateStr.split('-').map(Number);
      const [startH] = slot.split('-')[0].split(':').map(Number);
      const scheduled = new Date(Date.UTC(yyyy, (mm || 1) - 1, dd || 1, startH || 9, 0, 0)).toISOString();
      const res = await autoWashAPI.createBooking({
        vehicle_id: currentVehicle.id,
        package_code: selectedPackage,
        addon_codes: Array.from(selectedAddons),
        scheduled_at: scheduled,
        location_address: address.trim(),
        location_lat: locationLat,
        location_lng: locationLng,
        gated_community: gatedCommunity,
        notes: notes || undefined,
        subscription_code: selectedPlan || undefined,
        // Each additional stop creates its own job at the same slot.
        additional_stops: additionalStops.map((s) => ({
          vehicle_id: s.vehicle_id,
          location_address: s.location_address.trim(),
          location_lat: s.location_lat,
          location_lng: s.location_lng,
        })),
      });
      const bookingId = res.data?.job?.id;
      setSubmitted(true);
      // Direct navigation instead of Alert.alert — Alert is native-only and
      // silently no-ops on react-native-web, leaving the user stranded on the
      // payment screen and re-clicking. `replace` so the back button doesn't
      // return them to the payment step.
      if (bookingId) {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'CustomerTabs' },
            { name: 'AutoWashBookingDetail', params: { id: bookingId } },
          ],
        });
      } else {
        navigation.navigate('Home');
      }
    } catch (e: any) {
      const msg = e?.message || 'Could not create booking. Please try again.';
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(`Booking failed\n\n${msg}`);
      } else {
        Alert.alert('Booking failed', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const styles = makeStyles(C);

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.primary, C.primary]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : back()} style={styles.backBtn} activeOpacity={0.85}>
            <ArrowLeft size={20} color="#fff" weight="bold" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Book Car Wash</Text>
            <Text style={styles.headerSub}>Step {step + 1} of 7 · {STEPS[step]}</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / 7) * 100}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <WebContainer variant="narrow">
        {step === 0 && (
          <Step0Vehicle
            vehicles={vehicles}
            selected={selectedVehicleId}
            onSelect={setSelectedVehicleId}
            onAddNew={() => navigation.navigate('AddVehicle', { onSaved: () => { /* refetch handled by caller */ } })}
            C={C}
          />
        )}
        {step === 1 && (
          <Step1Package
            vehicle={currentVehicle}
            packages={packages}
            selected={selectedPackage}
            onSelect={setSelectedPackage}
            C={C}
          />
        )}
        {step === 2 && (
          <Step2Addons
            vehicle={currentVehicle}
            addons={addons}
            selected={selectedAddons}
            onToggle={(code: string) => {
              const s = new Set(selectedAddons);
              if (s.has(code)) s.delete(code); else s.add(code);
              setSelectedAddons(s);
            }}
            C={C}
          />
        )}
        {step === 3 && (
          <Step3Schedule
            dateStr={dateStr} onChangeDate={setDateStr}
            slot={slot} onChangeSlot={setSlot}
            gatedCommunity={gatedCommunity} onChangeGated={setGatedCommunity}
            notes={notes} onChangeNotes={setNotes}
            address={address} onChangeAddress={setAddress}
            locationLat={locationLat} locationLng={locationLng}
            onUseCurrentLocation={useCurrentLocation}
            gpsBusy={gpsBusy}
            additionalStops={additionalStops}
            vehicles={vehicles}
            onAddStop={addStop}
            onRemoveStop={removeStop}
            onUpdateStop={updateStop}
            onUseGpsForStop={useGpsForStop}
            stopGpsBusy={stopGpsBusy}
            primaryVehicleId={selectedVehicleId}
            C={C}
          />
        )}
        {step === 4 && (
          <Step4Subscription
            plans={plans}
            selected={selectedPlan}
            onSelect={(code: string) => setSelectedPlan(selectedPlan === code ? null : code)}
            C={C}
          />
        )}
        {step === 5 && (
          <Step5Review
            vehicle={currentVehicle}
            packageCode={selectedPackage}
            packages={packages}
            quote={quote}
            dateStr={dateStr}
            slot={slot}
            subscriptionCode={selectedPlan}
            plans={plans}
            C={C}
          />
        )}
        {step === 6 && (
          <Step6Payment
            quote={quote}
            submitting={submitting}
            submitted={submitted}
            onConfirm={submit}
            C={C}
          />
        )}
        </WebContainer>
      </ScrollView>

      {step < 6 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <WebContainer variant="narrow">
          {quote && (
            <View style={styles.runningTotal}>
              <Text style={styles.runningTotalLabel}>Running total</Text>
              <Text style={styles.runningTotalValue}>{rupees(quote.total_paise)}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={next}
            disabled={!canAdvance()}
            style={[styles.nextBtn, !canAdvance() && { opacity: 0.4 }]}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>{step === 5 ? 'Pay' : 'Continue'}</Text>
            <ArrowRight size={18} color="#fff" weight="bold" />
          </TouchableOpacity>
          </WebContainer>
        </View>
      )}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Step components                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function Step0Vehicle({ vehicles, selected, onSelect, onAddNew, C }: any) {
  const styles = makeStyles(C);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>Which vehicle?</Text>
      <Text style={styles.sectionSub}>Pick a saved vehicle or add a new one.</Text>
      {vehicles.length === 0 && (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
          <Car size={40} weight="duotone" color={C.primary} />
          <Text style={[styles.cardTitle, { marginTop: 10 }]}>No vehicles yet</Text>
          <Text style={styles.cardSub}>Add your first car to continue.</Text>
        </View>
      )}
      {vehicles.map((v: Vehicle) => {
        const active = v.id === selected;
        return (
          <TouchableOpacity
            key={v.id}
            onPress={() => onSelect(v.id)}
            activeOpacity={0.85}
            style={[styles.card, active && styles.cardSelected]}
          >
            <View style={styles.vehicleIcon}>
              <Car size={22} weight="duotone" color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{v.nickname || `${v.make || ''} ${v.model || ''}`.trim() || 'Vehicle'}</Text>
              <Text style={styles.cardSub}>
                {v.vehicle_type.replace('_', ' ').toUpperCase()} · {v.registration_number}
              </Text>
            </View>
            {active && <CheckCircle size={22} weight="fill" color={C.success} />}
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity onPress={onAddNew} style={[styles.card, styles.cardDashed]} activeOpacity={0.85}>
        <View style={styles.vehicleIconGhost}>
          <Plus size={20} weight="bold" color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: C.primary }]}>Add new vehicle</Text>
          <Text style={styles.cardSub}>Saved for next time.</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function Step1Package({ vehicle, packages, selected, onSelect, C }: any) {
  const styles = makeStyles(C);
  if (!vehicle) return null;
  const field = priceFieldFor(vehicle.vehicle_type);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>Pick your wash</Text>
      <Text style={styles.sectionSub}>Pricing shown for {vehicle.vehicle_type.replace('_', ' ')}.</Text>
      {packages.map((p: Pkg) => {
        const active = p.code === selected;
        const price = (p as any)[field] as number;
        return (
          <TouchableOpacity
            key={p.code}
            onPress={() => onSelect(p.code)}
            activeOpacity={0.85}
            style={[styles.card, active && styles.cardSelected]}
          >
            <View style={styles.pkgIcon}>
              <Sparkle size={22} weight="fill" color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={styles.cardTitle}>{p.display_name}</Text>
                <Text style={styles.pkgPrice}>{rupees(price)}</Text>
              </View>
              <Text style={styles.cardSub}>{p.tagline}</Text>
              {Array.isArray(p.features) && (
                <View style={{ marginTop: 6, gap: 3 }}>
                  {p.features.slice(0, 3).map((f, i) => (
                    <Text key={i} style={styles.featureLine}>· {f}</Text>
                  ))}
                </View>
              )}
            </View>
            {active && <CheckCircle size={22} weight="fill" color={C.success} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Step2Addons({ vehicle, addons, selected, onToggle, C }: any) {
  const styles = makeStyles(C);
  if (!vehicle) return null;
  const field = priceFieldFor(vehicle.vehicle_type);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>Boost your wash</Text>
      <Text style={styles.sectionSub}>Optional add-ons. Tap to toggle.</Text>
      {addons.map((a: Addon) => {
        const active = selected.has(a.code);
        const price = (a as any)[field] as number;
        return (
          <TouchableOpacity
            key={a.code}
            onPress={() => onToggle(a.code)}
            activeOpacity={0.85}
            style={[styles.card, active && styles.cardSelected, a.coming_soon && { opacity: 0.5 }]}
            disabled={a.coming_soon}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={styles.cardTitle}>{a.display_name}</Text>
                <Text style={styles.pkgPrice}>{rupees(price)}</Text>
              </View>
              <Text style={styles.cardSub}>{a.benefit}</Text>
            </View>
            <View style={[styles.checkboxBox, active && { backgroundColor: C.primary, borderColor: C.primary }]}>
              {active && <CheckCircle size={16} weight="fill" color="#fff" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Step3Schedule({
  dateStr, onChangeDate, slot, onChangeSlot,
  gatedCommunity, onChangeGated, notes, onChangeNotes,
  address, onChangeAddress, locationLat, locationLng,
  onUseCurrentLocation, gpsBusy,
  additionalStops = [], vehicles = [], primaryVehicleId,
  onAddStop, onRemoveStop, onUpdateStop, onUseGpsForStop, stopGpsBusy,
  C,
}: any) {
  const styles = makeStyles(C);
  const today = new Date();
  const minDate = today.toISOString().slice(0, 10);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>Where & when?</Text>

      {/* Service address — required. Crew uses this to navigate. */}
      <View style={styles.card}>
        <MapPin size={20} weight="duotone" color={C.primary} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cardLabel}>Service address</Text>
            <TouchableOpacity onPress={onUseCurrentLocation} disabled={gpsBusy} activeOpacity={0.7}>
              {gpsBusy
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text style={{ color: C.primary, fontSize: 12, fontWeight: '700' }}>Use current location</Text>}
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="House / flat no, street, area, city"
            placeholderTextColor={C.muted}
            value={address}
            onChangeText={onChangeAddress}
            multiline
          />
          {locationLat != null && locationLng != null ? (
            <Text style={[styles.cardSub, { marginTop: 4 }]}>
              GPS pinned · {locationLat.toFixed(5)}, {locationLng.toFixed(5)}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.card}>
        <Calendar size={20} weight="duotone" color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.muted}
            value={dateStr}
            onChangeText={onChangeDate}
            keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
          />
          <Text style={[styles.cardSub, { marginTop: 4 }]}>Earliest: {minDate}</Text>
        </View>
      </View>
      <Text style={[styles.sectionSub, { marginTop: 8 }]}>Pick a slot</Text>
      <View style={styles.slotGrid}>
        {SLOTS.map((s) => {
          const active = s === slot;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => onChangeSlot(s)}
              style={[styles.slotPill, active && styles.slotPillActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.slotText, active && { color: '#fff' }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        onPress={() => onChangeGated(!gatedCommunity)}
        style={[styles.card, { alignItems: 'center' }]}
        activeOpacity={0.85}
      >
        <MapPin size={20} weight="duotone" color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>I live in a gated community</Text>
          <Text style={styles.cardSub}>Helps the crew plan access in advance.</Text>
        </View>
        <View style={[styles.checkboxBox, gatedCommunity && { backgroundColor: C.primary, borderColor: C.primary }]}>
          {gatedCommunity && <CheckCircle size={16} weight="fill" color="#fff" />}
        </View>
      </TouchableOpacity>
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>Notes for the crew (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            placeholder="e.g. blue car parked behind the gate, ring buzzer 4B"
            placeholderTextColor={C.muted}
            value={notes}
            onChangeText={onChangeNotes}
            multiline
          />
        </View>
      </View>

      {/* Additional stops — extra vehicles at other locations. Each entry
          becomes its own job at the same time slot, with the same package &
          add-ons (price re-quoted server-side per stop's vehicle type). */}
      <View style={{ marginTop: 8 }}>
        <Text style={styles.sectionSub}>Add another car at a different (or same) location</Text>
        {additionalStops.map((s: any, idx: number) => {
          const otherVehicles = vehicles.filter((v: any) => v.id !== primaryVehicleId);
          return (
            <View key={idx} style={[styles.card, { flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: 14 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.cardLabel, { color: C.primary }]}>STOP {idx + 2}</Text>
                <TouchableOpacity onPress={() => onRemoveStop(idx)} activeOpacity={0.7}>
                  <Text style={{ color: C.danger, fontSize: 12, fontWeight: '700' }}>Remove</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardLabel}>Vehicle</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {otherVehicles.length === 0 ? (
                  <Text style={[styles.cardSub, { fontStyle: 'italic' }]}>
                    No other vehicles. Add one from "Add new vehicle" in step 1.
                  </Text>
                ) : otherVehicles.map((v: any) => {
                  const active = s.vehicle_id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => onUpdateStop(idx, { vehicle_id: v.id })}
                      style={[styles.slotPill, active && styles.slotPillActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.slotText, active && { color: '#fff' }]}>
                        {(v.nickname || v.vehicle_type || 'vehicle')}{v.registration_number ? ` · ${v.registration_number}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardLabel}>Address</Text>
                <TouchableOpacity onPress={() => onUseGpsForStop(idx)} disabled={stopGpsBusy === idx} activeOpacity={0.7}>
                  {stopGpsBusy === idx
                    ? <ActivityIndicator size="small" color={C.primary} />
                    : <Text style={{ color: C.primary, fontSize: 12, fontWeight: '700' }}>Use current location</Text>}
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="House / flat no, street, area, city"
                placeholderTextColor={C.muted}
                value={s.location_address}
                onChangeText={(t) => onUpdateStop(idx, { location_address: t })}
                multiline
              />
              {s.location_lat != null && s.location_lng != null ? (
                <Text style={styles.cardSub}>
                  GPS pinned · {s.location_lat.toFixed(5)}, {s.location_lng.toFixed(5)}
                </Text>
              ) : null}
            </View>
          );
        })}
        <TouchableOpacity
          onPress={onAddStop}
          style={[styles.card, { borderStyle: 'dashed', borderWidth: 1, borderColor: C.primary, justifyContent: 'center', backgroundColor: 'transparent' }]}
          activeOpacity={0.8}
        >
          <Plus size={16} weight="bold" color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>Add another car / location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Step4Subscription({ plans, selected, onSelect, C }: any) {
  const styles = makeStyles(C);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>Recurring plan? (optional)</Text>
      <Text style={styles.sectionSub}>Save more with a subscription. Skip if you're booking one-off.</Text>
      <TouchableOpacity
        onPress={() => onSelect(null)}
        activeOpacity={0.85}
        style={[styles.card, !selected && styles.cardSelected]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>One-time booking</Text>
          <Text style={styles.cardSub}>No subscription. Pay as you go.</Text>
        </View>
        {!selected && <CheckCircle size={22} weight="fill" color={C.success} />}
      </TouchableOpacity>
      {plans.filter((p: Plan) => p.washes_per_cycle > 0).map((p: Plan) => {
        const active = p.code === selected;
        return (
          <TouchableOpacity
            key={p.code}
            onPress={() => onSelect(p.code)}
            activeOpacity={0.85}
            style={[styles.card, active && styles.cardSelected, p.highlight && styles.cardHighlight]}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={styles.cardTitle}>
                  {p.display_name}{p.highlight ? '  ★ Best value' : ''}
                </Text>
                <Text style={styles.pkgPrice}>{rupees(p.price_hatchback_paise)}</Text>
              </View>
              <Text style={styles.cardSub}>{p.cadence_label}</Text>
              {p.addon_discount_pct > 0 && (
                <Text style={[styles.cardSub, { color: C.success, fontWeight: '700' }]}>
                  {p.addon_discount_pct}% off any add-on
                </Text>
              )}
              {p.notes && <Text style={[styles.cardSub, { fontStyle: 'italic' }]}>{p.notes}</Text>}
            </View>
            {active && <CheckCircle size={22} weight="fill" color={C.success} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Step5Review({ vehicle, packageCode, packages, quote, dateStr, slot, subscriptionCode, plans, C }: any) {
  const styles = makeStyles(C);
  const pkg = packages.find((p: Pkg) => p.code === packageCode);
  const plan = plans.find((p: Plan) => p.code === subscriptionCode);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>Review</Text>
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>VEHICLE</Text>
          <Text style={styles.cardTitle}>{vehicle?.nickname || `${vehicle?.make || ''} ${vehicle?.model || ''}`.trim()}</Text>
          <Text style={styles.cardSub}>{vehicle?.vehicle_type.replace('_', ' ').toUpperCase()} · {vehicle?.registration_number}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>SERVICE</Text>
          <Text style={styles.cardTitle}>{pkg?.display_name}</Text>
          <Text style={styles.cardSub}>{pkg?.tagline}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Calendar size={20} weight="duotone" color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>SCHEDULE</Text>
          <Text style={styles.cardTitle}>{dateStr} · {slot}</Text>
        </View>
      </View>
      {plan && (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>SUBSCRIPTION</Text>
            <Text style={styles.cardTitle}>{plan.display_name}</Text>
            <Text style={styles.cardSub}>{plan.cadence_label}</Text>
          </View>
        </View>
      )}
      {quote && (
        <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Text style={styles.cardLabel}>PRICE BREAKDOWN</Text>
          {quote.items.map((it: any, i: number) => (
            <View key={i} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{it.name}</Text>
              <Text style={styles.lineValue}>{it.price_paise === 0 ? 'Included' : rupees(it.price_paise)}</Text>
            </View>
          ))}
          {quote.discount_paise > 0 && (
            <View style={styles.lineRow}>
              <Text style={[styles.lineLabel, { color: C.success }]}>Subscription discount</Text>
              <Text style={[styles.lineValue, { color: C.success }]}>− {rupees(quote.discount_paise)}</Text>
            </View>
          )}
          <View style={[styles.lineRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total (GST included)</Text>
            <Text style={styles.totalValue}>{rupees(quote.total_paise)}</Text>
          </View>
          <View style={styles.ecoNote}>
            <Drop size={14} weight="fill" color={C.success} />
            <Text style={styles.ecoNoteText}>
              You'll save ~{quote.ecoscore_preview_water_saved_litres} L vs traditional car wash.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function Step6Payment({ quote, submitting, submitted, onConfirm, C }: any) {
  const styles = makeStyles(C);
  const locked = submitting || submitted;
  return (
    <View style={{ gap: 16 }}>
      <Text style={styles.sectionTitle}>Payment</Text>
      <Text style={styles.sectionSub}>Choose how you'd like to pay. Booking is held while payment processes.</Text>
      <View style={[styles.card, { backgroundColor: C.primaryBg }]}>
        <Text style={styles.cardLabel}>AMOUNT DUE</Text>
        <Text style={[styles.totalValue, { fontSize: 28, color: C.primary }]}>
          {quote ? rupees(quote.total_paise) : '—'}
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {(['UPI', 'Card / Debit', 'Wallet', 'Cash on Delivery'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={onConfirm}
            disabled={locked}
            style={[styles.card, { paddingVertical: 18, opacity: locked ? 0.5 : 1 }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.cardTitle, { color: C.primary }]}>Pay with {m}</Text>
            <ArrowRight size={18} color={C.primary} weight="bold" />
          </TouchableOpacity>
        ))}
      </View>
      {submitting && (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <ActivityIndicator color={C.primary} />
          <Text style={[styles.cardSub, { marginTop: 8 }]}>Creating your booking…</Text>
        </View>
      )}
      {submitted && !submitting && (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <Text style={[styles.cardSub, { color: C.success || '#16A34A', fontWeight: '600' }]}>
            Booking confirmed — opening your booking…
          </Text>
        </View>
      )}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Styles                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 18, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 0.1 },
  headerSub:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 14, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#fff' },

  body: { padding: 16, paddingBottom: 24 },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: C.foreground, letterSpacing: -0.3 },
  sectionSub:   { fontSize: 13, color: C.muted, lineHeight: 19 },

  card: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    padding: 14, borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  cardSelected: { borderColor: C.primary, backgroundColor: (C.primaryBg as any) || '#E0F2FE' },
  cardHighlight: { borderColor: C.success },
  cardDashed: { borderStyle: 'dashed' as any, backgroundColor: 'transparent' },

  cardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: C.muted, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.foreground },
  cardSub:   { fontSize: 12, color: C.muted, lineHeight: 18, marginTop: 2 },

  vehicleIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: (C.primaryBg as any) || '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleIconGhost: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  pkgIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: (C.primaryBg as any) || '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  pkgPrice: { fontSize: 16, fontWeight: '800', color: C.primary },
  featureLine: { fontSize: 12, color: C.muted, lineHeight: 18 },

  checkboxBox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },

  input: {
    fontSize: 15, color: C.foreground, paddingVertical: 4,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotPill: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  slotPillActive: { backgroundColor: C.primary, borderColor: C.primary },
  slotText: { fontSize: 13, color: C.foreground, fontWeight: '700' },

  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  lineLabel: { fontSize: 13, color: C.foreground },
  lineValue: { fontSize: 13, color: C.foreground, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 14, fontWeight: '800', color: C.foreground },
  totalValue: { fontSize: 18, fontWeight: '800', color: C.primary },

  ecoNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  ecoNoteText: { fontSize: 12, color: C.muted, flex: 1 },

  footer: {
    paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.surface, gap: 10,
  },
  runningTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  runningTotalLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  runningTotalValue: { fontSize: 18, fontWeight: '800', color: C.primary },
  nextBtn: {
    height: 52, borderRadius: 14, backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
