import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import { bookingAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
import { ArrowLeft, ArrowRight, Calendar, Clock, HandPalm, Info } from '../../components/Icons';

const DateTimeScreen = () => {
  const navigation = useNavigation<any>();
  const { setStep2 } = useBookingStore();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Build next 14 days
  const buildDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
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

  const fetchSlots = async (dateStr: string) => {
    setLoading(true);
    setSlots([]);
    setSelectedSlot('');
    try {
      const res = await bookingAPI.getSlots(dateStr) as any;
      // Backend returns { slots: [{time: '08:00', available: true}, ...] }
      const rawSlots: { time: string; available: boolean }[] = res.data?.slots || [];
      const available = rawSlots
        .filter((s) => s.available)
        .map((s) => `${dateStr}T${s.time}:00`);
      setSlots(available);
    } catch (_) {
      Alert.alert('Error', 'Could not fetch slots. Try another date.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (d: Date) => {
    const key = formatDateKey(d);
    setSelectedDate(key);
    fetchSlots(key);
  };

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

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Date & Time</Text>
        <Text style={styles.stepText}>Step 2 / 4</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '50%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Date Picker */}
        <View style={styles.labelRow}>
          <Calendar size={16} weight="regular" color={COLORS.primary} />
          <Text style={styles.label}>Select Date</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {days.map((d) => {
            const key = formatDateKey(d);
            const active = selectedDate === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.dayBtn, active && styles.dayBtnActive]}
                onPress={() => handleDateSelect(d)}
              >
                <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{dayLabel(d)}</Text>
                <Text style={[styles.dateNum, active && styles.dateNumActive]}>{dateLabel(d)}</Text>
                <Text style={[styles.monthLabel, active && styles.monthLabelActive]}>{monthLabel(d)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time Slots */}
        <View style={styles.labelRow}>
          <Clock size={16} weight="regular" color={COLORS.primary} />
          <Text style={styles.label}>Available Slots</Text>
        </View>
        {!selectedDate ? (
          <View style={styles.hintBox}>
            <HandPalm size={24} weight="regular" color={COLORS.muted} />
            <Text style={styles.hintText}>Select a date to see available slots</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : slots.length === 0 ? (
          <View style={styles.hintBox}>
            <Info size={24} weight="regular" color={COLORS.muted} />
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
              <Calendar size={16} weight="regular" color={COLORS.primary} />
              <Text style={styles.summaryValue}>
                {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Clock size={16} weight="regular" color={COLORS.primary} />
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
          <ArrowRight size={18} weight="bold" color={COLORS.primaryFg} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground, flex: 1 },
  stepText: { fontSize: 13, color: COLORS.muted },
  progressBar: { height: 4, backgroundColor: COLORS.border },
  progressFill: { height: 4, backgroundColor: COLORS.primary },
  body: { padding: 20, paddingBottom: 40 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  dateScroll: { marginBottom: 8 },
  dayBtn: {
    width: 64,
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  dayBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  dayLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  dayLabelActive: { color: COLORS.primary },
  dateNum: { fontSize: 22, fontWeight: 'bold', color: COLORS.foreground, marginVertical: 2 },
  dateNumActive: { color: COLORS.primary },
  monthLabel: { fontSize: 11, color: COLORS.muted },
  monthLabelActive: { color: COLORS.primary },
  hintBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  hintText: { fontSize: 15, color: COLORS.foreground, fontWeight: '600' },
  hintSub: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  slotBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  slotText: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },
  slotTextActive: { color: COLORS.primary },
  summaryBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    gap: 6,
  },
  summaryLabel: { fontSize: 11, color: COLORS.muted, textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 17, fontWeight: 'bold', color: COLORS.foreground },
  summarySlot: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  nextBtnDisabled: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  nextText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 16 },
});

export default DateTimeScreen;
