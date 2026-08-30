import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import api from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { ArrowLeft, ArrowRight, Calendar, Clock, HandPalm, Hourglass, Info } from '../../components/Icons';
import WebContainer from '../../components/WebContainer';

// v2 slot payload — present when the backend returns duration-aware slots
interface SlotV2 {
  time: string;          // '08:00'
  end_time?: string;     // '12:15'
  available: boolean;
  vans_free?: number;
}

interface SlotMeta {
  duration_min: number;
  clean_min: number;
  travel_min: number;
  locations: number;
  vans_total: number;
  per_tank: { litres: number; minutes: number }[];
}

const DateTimeScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const navigation = useNavigation<any>();
  const { setStep2, draft } = useBookingStore();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  // v2 duration-aware response (falls back to legacy `slots` when absent)
  const [v2Slots, setV2Slots] = useState<SlotV2[]>([]);
  const [meta, setMeta] = useState<SlotMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [slotJustFilled, setSlotJustFilled] = useState(false);
  // Refs so the focus/interval poller reads the latest date+slot without
  // re-subscribing on every render.
  const selectedDateRef = useRef('');
  const selectedSlotRef = useRef('');
  selectedDateRef.current = selectedDate;
  selectedSlotRef.current = selectedSlot;

  // Build next 30 days (spans into next month) — grouped by month in the grid.
  const buildDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  };
  const days = buildDays();

  const formatDateKey = (d: Date) => d.toISOString().split('T')[0];
  const dayLabel = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short' });
  const dateLabel = (d: Date) => d.getDate();
  const monthLabel = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short' });

  const fetchSlots = async (dateStr: string, opts: { silent?: boolean } = {}) => {
    const silent = opts.silent === true;
    if (!silent) {
      setLoading(true);
      setSlots([]);
      setV2Slots([]);
      setMeta(null);
      setSelectedSlot('');
      setSlotJustFilled(false);
    }
    try {
      // Duration-aware slots: pass the draft's tank sizes + number of distinct
      // service locations so the backend sizes the service window correctly.
      const tankSizes = draft.tanks.map((t) => t.tank_size_litres);
      const locations = 1 + draft.tanks.filter((t, i) => i > 0 && t.address).length;
      const res: any = await api.get('/bookings/slots', {
        params: { date: dateStr, tank_sizes: tankSizes.join(','), locations },
      });
      // Backend returns { slots: [{time:'08:00', end_time:'12:15', available, vans_free}, ...],
      //                   duration_min, clean_min, travel_min, locations, per_tank, vans_total }
      const payload = res.data || {};
      const rawSlots: SlotV2[] = payload.slots || [];
      if (payload.duration_min != null) {
        // v2 — keep every slot (unavailable ones render disabled) + meta card
        setMeta({
          duration_min: Number(payload.duration_min) || 0,
          clean_min: Number(payload.clean_min) || 0,
          travel_min: Number(payload.travel_min) || 0,
          locations: Number(payload.locations) || 1,
          vans_total: Number(payload.vans_total) || 0,
          per_tank: payload.per_tank || [],
        });
        setV2Slots(rawSlots);
      } else {
        // legacy — flat list of available times only
        const available = rawSlots
          .filter((s) => s.available)
          .map((s) => `${dateStr}T${s.time}:00`);
        setSlots(available);
      }
      // Near-live: if a silent refresh finds the slot the user already picked has
      // just filled up, drop the selection and flag an inline notice.
      if (silent) {
        const sel = selectedSlotRef.current;
        const selTime = sel && sel.startsWith(dateStr) ? sel.split('T')[1]?.slice(0, 5) : null;
        if (selTime) {
          const hit = rawSlots.find((s) => s.time === selTime);
          const stillFree = hit ? hit.available !== false : false;
          if (!stillFree) {
            setSelectedSlot('');
            setSlotJustFilled(true);
          }
        }
      }
    } catch (e: any) {
      if (!silent) {
        const d = e?.response?.data || e || {};
        Alert.alert('Error', d?.message || 'Could not fetch slots. Try another date.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDateSelect = (d: Date) => {
    const key = formatDateKey(d);
    setSelectedDate(key);
    fetchSlots(key);
  };

  // Keep the grid near-live: silent-refresh on focus + every 30s while a date is
  // selected and the screen is focused, so a slot that just filled is reflected
  // before the user reaches payment.
  useFocusEffect(
    useCallback(() => {
      if (selectedDateRef.current) fetchSlots(selectedDateRef.current, { silent: true });
      const id = setInterval(() => {
        if (selectedDateRef.current) fetchSlots(selectedDateRef.current, { silent: true });
      }, 30000);
      return () => clearInterval(id);
    }, [])
  );

  const handleNext = () => {
    if (!selectedDate) return Alert.alert('Select a date');
    if (!selectedSlot) return Alert.alert('Select a time slot');
    setStep2(selectedSlot);
    navigation.navigate('AddonsSelect');
  };

  const formatSlot = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // 135 → "2h 15m", 60 → "1h", 45 → "45m"
  const fmtMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (h <= 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const tankCount = meta?.per_tank?.length || draft.tanks.length;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Date & Time</Text>
        <Text style={styles.stepText}>Step 2 / 4</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '50%' }]} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        <WebContainer variant="narrow">

        {/* Date Picker */}
        <View style={styles.labelRow}>
          <Calendar size={16} weight="regular" color={C.primary} />
          <Text style={styles.label}>Select Date</Text>
        </View>
        <View style={styles.dateGrid}>
          {days.map((d, i) => {
            const key = formatDateKey(d);
            const active = selectedDate === key;
            // Full-width month header when the month changes → next-month dates
            // appear under their own label (e.g. "September 2026").
            const newMonth = i === 0 || d.getMonth() !== days[i - 1].getMonth();
            return (
              <React.Fragment key={key}>
                {newMonth && (
                  <Text style={styles.monthDivider}>
                    {d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.dayBtn, active && styles.dayBtnActive]}
                  onPress={() => handleDateSelect(d)}
                >
                  <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{dayLabel(d)}</Text>
                  <Text style={[styles.dateNum, active && styles.dateNumActive]}>{dateLabel(d)}</Text>
                  <Text style={[styles.monthLabel, active && styles.monthLabelActive]}>{monthLabel(d)}</Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* Time Slots */}
        <View style={styles.labelRow}>
          <Clock size={16} weight="regular" color={C.primary} />
          <Text style={styles.label}>Available Slots</Text>
        </View>
        {slotJustFilled && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.warningBg, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.warning + '55' }}>
            <Info size={16} weight="fill" color={C.warning} />
            <Text style={{ flex: 1, fontSize: 13, color: C.warning, fontWeight: '600' }}>That time just filled up — please pick another slot.</Text>
          </View>
        )}
        {!selectedDate ? (
          <View style={styles.hintBox}>
            <HandPalm size={24} weight="regular" color={C.muted} />
            <Text style={styles.hintText}>Select a date to see available slots</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 20 }} />
        ) : meta ? (
          <>
            {/* v2 — duration breakdown card above the slot grid */}
            <View style={styles.durationCard}>
              <View style={styles.durationHeader}>
                <Hourglass size={16} weight="fill" color={C.primary} />
                <Text style={styles.durationTitle}>
                  Service duration: ~{fmtMin(meta.duration_min)}
                </Text>
              </View>
              <Text style={styles.durationLine}>
                Cleaning: {fmtMin(meta.clean_min)} ({tankCount} tank{tankCount === 1 ? '' : 's'})
              </Text>
              {meta.travel_min > 0 && (
                <Text style={styles.durationLine}>
                  + Travel between locations: {fmtMin(meta.travel_min)}
                </Text>
              )}
              <Text style={styles.durationLine}>Crews available: {meta.vans_total}</Text>
            </View>

            {v2Slots.length === 0 ? (
              <View style={styles.hintBox}>
                <Info size={24} weight="regular" color={C.muted} />
                <Text style={styles.hintText}>No slots available for this date</Text>
                <Text style={styles.hintSub}>Try another date</Text>
              </View>
            ) : (
              <View style={styles.slotGrid}>
                {v2Slots.map((s) => {
                  const iso = `${selectedDate}T${s.time}:00`;
                  const active = selectedSlot === iso;
                  return (
                    <TouchableOpacity
                      key={s.time}
                      style={[
                        styles.slotBtn,
                        active && styles.slotBtnActive,
                        !s.available && styles.slotBtnDisabled,
                      ]}
                      onPress={() => { setSelectedSlot(iso); setSlotJustFilled(false); }}
                      disabled={!s.available}
                    >
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>
                        {s.time}
                      </Text>
                      {active && s.end_time ? (
                        <Text style={styles.slotTillText}>till {s.end_time}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : slots.length === 0 ? (
          <View style={styles.hintBox}>
            <Info size={24} weight="regular" color={C.muted} />
            <Text style={styles.hintText}>No slots available for this date</Text>
            <Text style={styles.hintSub}>Try another date</Text>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {slots.map((slot) => {
              const active = selectedSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotBtn, active && styles.slotBtnActive]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={[styles.slotText, active && styles.slotTextActive]}>
                    {formatSlot(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Selected Summary */}
        {selectedDate && selectedSlot && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Selected Appointment</Text>
            <View style={styles.summaryRow}>
              <Calendar size={16} weight="regular" color={C.primary} />
              <Text style={styles.summaryValue}>
                {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Clock size={16} weight="regular" color={C.primary} />
              <Text style={styles.summarySlot}>{formatSlot(selectedSlot)}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, (!selectedDate || !selectedSlot) && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selectedDate || !selectedSlot}
        >
          <Text style={styles.nextText}>Continue to Add-ons</Text>
          <ArrowRight size={18} weight="bold" color={C.primaryFg} />
        </TouchableOpacity>
        </WebContainer>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground, flex: 1 },
  stepText: { fontSize: 13, color: C.muted },
  progressBar: { height: 4, backgroundColor: C.border },
  progressFill: { height: 4, backgroundColor: C.primary },
  body: { padding: 20, paddingBottom: 40 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '700', color: C.foreground },
  dateScroll: { marginBottom: 8 },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  monthDivider: { width: '100%', fontSize: 12, fontWeight: '700', color: C.muted, marginTop: 10, marginBottom: 2 },
  dayBtn: {
    width: 64,
    alignItems: 'center',
    padding: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.border,
  },
  dayBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  dayLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },
  dayLabelActive: { color: C.primary },
  dateNum: { fontSize: 22, fontWeight: 'bold', color: C.foreground, marginVertical: 2 },
  dateNumActive: { color: C.primary },
  monthLabel: { fontSize: 11, color: C.muted },
  monthLabelActive: { color: C.primary },
  hintBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
    shadowColor: '#0b1220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  hintText: { fontSize: 15, color: C.foreground, fontWeight: '600' },
  hintSub: { fontSize: 12, color: C.muted, marginTop: 4 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
  },
  slotBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  slotBtnDisabled: { opacity: 0.35 },
  slotText: { fontSize: 14, color: C.muted, fontWeight: '600' },
  slotTextActive: { color: C.primary },
  slotTillText: { fontSize: 10, color: C.primary, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  // v2 duration breakdown card (shown when backend returns duration_min)
  durationCard: {
    backgroundColor: C.primaryBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderActive,
    marginBottom: 12,
  },
  durationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  durationTitle: { fontSize: 13.5, fontWeight: '800', color: C.primary },
  durationLine: { fontSize: 12.5, color: C.foreground, lineHeight: 19, marginTop: 2 },
  summaryBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderActive,
    gap: 6,
    shadowColor: '#0b1220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  summaryLabel: { fontSize: 11, color: C.muted, textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 17, fontWeight: 'bold', color: C.foreground },
  summarySlot: { fontSize: 22, fontWeight: 'bold', color: C.primary },
  nextBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  nextBtnDisabled: { backgroundColor: C.surfaceElevated, borderWidth: 1, borderColor: C.border },
  nextText: { color: C.primaryFg, fontWeight: 'bold', fontSize: 16 },
  // SLA arrival block — G3/G4
  slaCard: {
    backgroundColor: C.successBg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(22,163,74,0.25)', marginBottom: 6,
  },
  slaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  slaTitle: { fontSize: 13, fontWeight: '800', color: C.success, letterSpacing: 0.3 },
  slaText: { fontSize: 12.5, color: C.foreground, lineHeight: 19 },
  slaTextBold: { fontWeight: '800', color: C.success },
});

export default DateTimeScreen;
