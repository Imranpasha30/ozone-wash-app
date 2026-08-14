/**
 * AddVehicleScreen — single-screen form for adding a vehicle.
 * Spec: Master Prompt v2.0 PART 4 + Auto Wash Scope PDF Section 3.2 Step 1.
 *
 * Reachable from AutoWashBookingScreen → "Add new vehicle" or from Profile.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { autoWashAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { ArrowLeft, Car, CheckCircle } from '../../components/Icons';
import WebContainer from '../../components/WebContainer';

// TF1 — Two-wheeler featured first with ★ Popular badge per PDF Section 2.
// Right-thumb position on phone, drives 2W cross-sell strategy.
const VEHICLE_TYPES: { code: 'hatchback' | 'sedan' | 'suv_muv' | 'luxury' | 'two_wheeler'; label: string; popular?: boolean }[] = [
  { code: 'two_wheeler', label: '2-Wheeler', popular: true },
  { code: 'hatchback',   label: 'Hatchback' },
  { code: 'sedan',       label: 'Sedan' },
  { code: 'suv_muv',     label: 'SUV / MUV' },
  { code: 'luxury',      label: 'Luxury' },
];

export default function AddVehicleScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const scrollRef = useWebScrollFix();

  const [vehicleType, setVehicleType] = useState<string>('hatchback');
  const [regNo, setRegNo] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [nickname, setNickname] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!regNo.trim()) {
      Alert.alert('Missing info', 'Registration number is required.');
      return;
    }
    setSaving(true);
    try {
      await autoWashAPI.addVehicle({
        vehicle_type: vehicleType,
        registration_number: regNo.trim().toUpperCase(),
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        year: year ? Number(year) : undefined,
        nickname: nickname.trim() || undefined,
        is_primary: isPrimary,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const styles = makeStyles(C);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.primary, C.primary]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
            <ArrowLeft size={20} color="#fff" weight="bold" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Add Vehicle</Text>
            <Text style={styles.headerSub}>Save once. Use for every future wash.</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <WebContainer variant="narrow">
        {/* Vehicle type */}
        <Text style={styles.label}>VEHICLE TYPE</Text>
        <View style={styles.typeGrid}>
          {VEHICLE_TYPES.map((t) => {
            const active = t.code === vehicleType;
            return (
              <TouchableOpacity
                key={t.code}
                onPress={() => setVehicleType(t.code)}
                style={[styles.typeChip, active && styles.typeChipActive]}
                activeOpacity={0.85}
              >
                {t.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularStar}>★</Text>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                )}
                <Text style={[styles.typeChipText, active && { color: '#fff' }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Registration */}
        <Text style={[styles.label, { marginTop: 18 }]}>REGISTRATION NUMBER *</Text>
        <View style={styles.inputBox}>
          <Car size={18} weight="duotone" color={C.primary} />
          <TextInput
            style={styles.input}
            placeholder="e.g. TS09AB1234"
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
            value={regNo}
            onChangeText={setRegNo}
            maxLength={20}
          />
        </View>

        {/* Make + model side by side */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>MAKE</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="Maruti"
                placeholderTextColor={C.muted}
                value={make}
                onChangeText={setMake}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>MODEL</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="Swift"
                placeholderTextColor={C.muted}
                value={model}
                onChangeText={setModel}
              />
            </View>
          </View>
        </View>

        {/* Year + nickname */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>YEAR</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="2022"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                maxLength={4}
                value={year}
                onChangeText={setYear}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>NICKNAME</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="My white Swift"
                placeholderTextColor={C.muted}
                value={nickname}
                onChangeText={setNickname}
                maxLength={50}
              />
            </View>
          </View>
        </View>

        {/* Primary flag */}
        <TouchableOpacity
          onPress={() => setIsPrimary(!isPrimary)}
          style={[styles.primaryRow, isPrimary && styles.primaryRowActive]}
          activeOpacity={0.85}
        >
          <View style={[styles.checkboxBox, isPrimary && { backgroundColor: C.primary, borderColor: C.primary }]}>
            {isPrimary && <CheckCircle size={16} weight="fill" color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryLabel}>Set as primary vehicle</Text>
            <Text style={styles.primarySub}>Pre-selected on every booking.</Text>
          </View>
        </TouchableOpacity>

        {/* Privacy note */}
        <Text style={styles.privacy}>
          We display only the last 4 characters of your registration on the public hygiene certificate.
        </Text>
        </WebContainer>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          onPress={submit}
          disabled={saving || !regNo.trim()}
          style={[styles.saveBtn, (saving || !regNo.trim()) && { opacity: 0.5 }]}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save vehicle</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

  body: { padding: 16, paddingBottom: 32 },

  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: C.muted, marginBottom: 6 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
    position: 'relative',
  },
  typeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeChipText: { fontSize: 13, fontWeight: '700', color: C.foreground },
  // TF1 — ★ Popular ribbon on the two-wheeler chip
  popularBadge: {
    position: 'absolute', top: -8, right: -4,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    backgroundColor: '#16A34A',
    zIndex: 2,
  },
  popularStar: { fontSize: 9, color: '#FBBF24', fontWeight: '900' },
  popularText: { fontSize: 8, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  input: {
    flex: 1, fontSize: 15, color: C.foreground,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },

  primaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, marginTop: 18,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  primaryRowActive: { borderColor: C.primary, backgroundColor: (C.primaryBg as any) || '#E0F2FE' },
  primaryLabel: { fontSize: 14, fontWeight: '700', color: C.foreground },
  primarySub:   { fontSize: 12, color: C.muted, marginTop: 2 },

  checkboxBox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },

  privacy: { fontSize: 11, color: C.muted, marginTop: 18, lineHeight: 16, fontStyle: 'italic' },

  footer: {
    paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  saveBtn: {
    height: 52, borderRadius: 14, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
