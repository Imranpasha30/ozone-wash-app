import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import { COLORS, TANK_TYPES } from '../../utils/constants';
import { ArrowLeft, ArrowRight, House, Wrench, Drop, MapPin, CurrencyInr } from '../../components/Icons';

const TANK_SIZES = [500, 1000, 1500, 2000, 3000, 5000];

const TankTypeIcon = ({ type, active }: { type: string; active: boolean }) => {
  const color = active ? COLORS.primary : COLORS.muted;
  if (type === 'overhead') return <House size={26} weight="regular" color={color} />;
  if (type === 'underground') return <Wrench size={26} weight="regular" color={color} />;
  return <Drop size={26} weight="fill" color={color} />;
};

const TankDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const { draft, setStep1 } = useBookingStore();

  const [tankType, setTankType] = useState<'overhead' | 'underground' | 'sump'>(
    (draft.tank_type as any) || 'overhead'
  );
  const [sizeInput, setSizeInput] = useState(draft.tank_size_litres?.toString() || '1000');
  const [address, setAddress] = useState(draft.address || '');

  const handleNext = () => {
    const size = parseInt(sizeInput, 10);
    if (!tankType) return Alert.alert('Select tank type');
    if (!size || size < 100) return Alert.alert('Enter valid tank size (min 100 litres)');
    if (!address.trim()) return Alert.alert('Enter service address');

    setStep1({ tank_type: tankType, tank_size_litres: size, address: address.trim() });
    navigation.navigate('DateTimeSelect');
  };

  const basePrice = () => {
    const prices: Record<string, number> = { overhead: 800, underground: 1200, sump: 1000 };
    const size = parseInt(sizeInput, 10) || 1000;
    const base = prices[tankType] || 800;
    const extra = Math.max(0, Math.floor((size - 1000) / 500)) * 200;
    return base + extra;
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} weight="regular" color={COLORS.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tank Details</Text>
          <Text style={styles.stepText}>Step 1 / 4</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '25%' }]} />
        </View>

        <View style={styles.body}>
          {/* Tank Type */}
          <Text style={styles.label}>Tank Type</Text>
          <View style={styles.typeRow}>
            {TANK_TYPES.map((t) => {
              const active = tankType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeBtn, active && styles.typeBtnActive]}
                  onPress={() => setTankType(t.value as any)}
                >
                  <View style={[styles.typeIconWrap, active && styles.typeIconWrapActive]}>
                    <TankTypeIcon type={t.value} active={active} />
                  </View>
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tank Size */}
          <Text style={styles.label}>Tank Size (Litres)</Text>
          <View style={styles.sizeGrid}>
            {TANK_SIZES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sizeChip, sizeInput === s.toString() && styles.sizeChipActive]}
                onPress={() => setSizeInput(s.toString())}
              >
                <Text style={[styles.sizeText, sizeInput === s.toString() && styles.sizeTextActive]}>
                  {s}L
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Or enter custom size (e.g. 2500)"
            keyboardType="number-pad"
            value={sizeInput}
            onChangeText={setSizeInput}
            placeholderTextColor={COLORS.gray}
          />

          {/* Address */}
          <View style={styles.labelRow}>
            <MapPin size={16} weight="regular" color={COLORS.primary} />
            <Text style={styles.labelWithIcon}>Service Address</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter full address including flat / house number, street, area"
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
            placeholderTextColor={COLORS.gray}
            textAlignVertical="top"
          />

          {/* Price Preview */}
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Estimated base price</Text>
            <View style={styles.priceRow}>
              <CurrencyInr size={24} weight="bold" color={COLORS.primary} />
              <Text style={styles.priceValue}>{basePrice()}</Text>
            </View>
            <Text style={styles.priceSub}>+ addons & GST at next step</Text>
          </View>

          {/* Next */}
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextText}>Continue to Date & Time</Text>
            <ArrowRight size={18} weight="bold" color={COLORS.primaryFg} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingBottom: 40 },
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
  body: { padding: 20 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.foreground, marginBottom: 10, marginTop: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 18 },
  labelWithIcon: { fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  typeIconWrapActive: {
    backgroundColor: COLORS.primaryDim,
  },
  typeLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600', textAlign: 'center' },
  typeLabelActive: { color: COLORS.primary },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  sizeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  sizeText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  sizeTextActive: { color: COLORS.primary },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.foreground,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  textArea: { height: 90 },
  priceBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  priceLabel: { fontSize: 12, color: COLORS.muted },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  priceValue: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  priceSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
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
  nextText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 16 },
});

export default TankDetailsScreen;
