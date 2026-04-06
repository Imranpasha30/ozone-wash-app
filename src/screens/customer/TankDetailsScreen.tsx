import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import useBookingStore from '../../store/booking.store';
import { TANK_TYPES } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft, ArrowRight, House, Wrench, Drop, MapPin, CurrencyInr, NavigationArrow } from '../../components/Icons';

const TANK_SIZES = [500, 1000, 1500, 2000, 3000, 5000];

const TankTypeIcon = ({ type, active, C }: { type: string; active: boolean; C: any }) => {
  const color = active ? C.primary : C.muted;
  if (type === 'overhead') return <House size={26} weight="regular" color={color} />;
  if (type === 'underground') return <Wrench size={26} weight="regular" color={color} />;
  return <Drop size={26} weight="fill" color={color} />;
};

const TankDetailsScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const { draft, setStep1 } = useBookingStore();

  const [tankType, setTankType] = useState<'overhead' | 'underground' | 'sump'>(
    (draft.tank_type as any) || 'overhead'
  );
  const [sizeInput, setSizeInput] = useState(draft.tank_size_litres?.toString() || '1000');
  const [address, setAddress] = useState(draft.address || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    draft.lat && draft.lng ? { lat: draft.lat, lng: draft.lng } : null
  );
  const [locating, setLocating] = useState(false);

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });

      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        const parts = [geo.name, geo.street, geo.district, geo.city, geo.region, geo.postalCode].filter(Boolean);
        setAddress(parts.join(', '));
      }
    } catch (err: any) {
      Alert.alert('Location Error', err.message || 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const handleNext = () => {
    const size = parseInt(sizeInput, 10);
    if (!tankType) return Alert.alert('Select tank type');
    if (!size || size < 100) return Alert.alert('Enter valid tank size (min 100 litres)');
    if (!address.trim()) return Alert.alert('Enter service address');

    setStep1({
      tank_type: tankType,
      tank_size_litres: size,
      address: address.trim(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });
    navigation.navigate('DateTimeSelect');
  };

  const basePrice = () => {
    const prices: Record<string, number> = { overhead: 1200, underground: 1800, sump: 1500 };
    const size = parseInt(sizeInput, 10) || 1000;
    const base = prices[tankType] || 1500;
    const extra = Math.max(0, Math.floor((size - 1000) / 500)) * 300;
    return base + extra;
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} weight="regular" color={C.foreground} />
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
                    <TankTypeIcon type={t.value} active={active} C={C} />
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
            placeholderTextColor={C.gray}
          />

          {/* Address */}
          <View style={styles.labelRow}>
            <MapPin size={16} weight="regular" color={C.primary} />
            <Text style={styles.labelWithIcon}>Service Address</Text>
          </View>
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={handleUseMyLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <NavigationArrow size={18} weight="fill" color={C.primary} />
            )}
            <Text style={styles.locationBtnText}>
              {locating ? 'Getting location...' : 'Use My Current Location'}
            </Text>
          </TouchableOpacity>
          {coords && (
            <View style={styles.coordsBadge}>
              <MapPin size={12} weight="fill" color={C.success} />
              <Text style={styles.coordsText}>
                GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
            </View>
          )}
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Or enter address manually — flat / house no, street, area"
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={(text) => { setAddress(text); if (!text.trim()) setCoords(null); }}
            placeholderTextColor={C.gray}
            textAlignVertical="top"
          />

          {/* Price Preview */}
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Estimated base price</Text>
            <View style={styles.priceRow}>
              <CurrencyInr size={24} weight="bold" color={C.primary} />
              <Text style={styles.priceValue}>{basePrice()}</Text>
            </View>
            <Text style={styles.priceSub}>+ addons & GST at next step</Text>
          </View>

          {/* Next */}
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextText}>Continue to Date & Time</Text>
            <ArrowRight size={18} weight="bold" color={C.primaryFg} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  container: { paddingBottom: 40 },
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
  body: { padding: 20 },
  label: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10, marginTop: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 18 },
  labelWithIcon: { fontSize: 14, fontWeight: '700', color: C.foreground },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.border,
  },
  typeBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  typeIconWrapActive: {
    backgroundColor: C.primaryDim,
  },
  typeLabel: { fontSize: 11, color: C.muted, fontWeight: '600', textAlign: 'center' },
  typeLabelActive: { color: C.primary },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surfaceElevated,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  sizeChipActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  sizeText: { fontSize: 13, color: C.muted, fontWeight: '600' },
  sizeTextActive: { color: C.primary },
  input: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: C.foreground,
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 4,
  },
  textArea: { height: 90 },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primaryBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: C.borderActive,
  },
  locationBtnText: { fontSize: 14, color: C.primary, fontWeight: '600' },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  coordsText: { fontSize: 11, color: C.success, fontWeight: '600' },
  priceBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderActive,
  },
  priceLabel: { fontSize: 12, color: C.muted },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  priceValue: { fontSize: 32, fontWeight: 'bold', color: C.primary },
  priceSub: { fontSize: 12, color: C.muted, marginTop: 2 },
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
  nextText: { color: C.primaryFg, fontWeight: 'bold', fontSize: 16 },
});

export default TankDetailsScreen;
