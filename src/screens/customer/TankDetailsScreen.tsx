import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useBookingStore, { TankEntry } from '../../store/booking.store';
import useAuthStore from '../../store/auth.store';
import usePremiumStore from '../../store/premium.store';
import { TANK_TYPES } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';
import {
  ArrowLeft, ArrowRight, House, Wrench, Drop, MapPin, CurrencyInr,
  NavigationArrow, Buildings, User, Phone, LightbulbFilament, Plus, Trash, Star,
} from '../../components/Icons';

const MAX_SAVED = 5;
const savedAddressKey = (userId: string) => `saved_addresses_${userId}`;

const TANK_SIZES = [500, 1000, 1500, 2000, 3000, 5000];
const PROPERTY_TYPES = [
  { label: 'Residential', value: 'residential' },
  { label: 'Commercial', value: 'commercial' },
];

const BASE_PRICES: Record<string, number> = { overhead: 1200, underground: 1800, sump: 1500 };

const tankPrice = (tank: TankEntry) => {
  const base = BASE_PRICES[tank.tank_type] || 1500;
  const extra = Math.max(0, Math.floor((tank.tank_size_litres - 1000) / 500)) * 300;
  return base + extra;
};

const TankTypeIcon = ({ type, active, C }: { type: string; active: boolean; C: any }) => {
  const color = active ? C.primary : C.muted;
  if (type === 'overhead') return <House size={22} weight="regular" color={color} />;
  if (type === 'underground') return <Wrench size={22} weight="regular" color={color} />;
  return <Drop size={22} weight="fill" color={color} />;
};

const TankDetailsScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { draft, setStep1 } = useBookingStore();
  const isPremium = usePremiumStore((s) => s.isPremium);

  const [propertyType, setPropertyType] = useState<'residential' | 'commercial'>(
    (draft.property_type as any) || 'residential'
  );
  const [tanks, setTanks] = useState<TankEntry[]>(
    draft.tanks?.length ? draft.tanks : [{ tank_type: '', tank_size_litres: 1000 }]
  );
  const [address, setAddress] = useState(draft.address || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    draft.lat && draft.lng ? { lat: draft.lat, lng: draft.lng } : null
  );
  const [contactName, setContactName] = useState(draft.contact_name || '');
  const [contactPhone, setContactPhone] = useState(draft.contact_phone || '');
  const [locating, setLocating] = useState(false);
  // Per-tank: index 0 is always "primary", index 1+ can have different location
  const [sameLocation, setSameLocation] = useState<boolean[]>(
    (draft.tanks || []).map((_: any, i: number) => i === 0 ? true : !(draft.tanks?.[i]?.address))
  );
  const [tankAddresses, setTankAddresses] = useState<string[]>(
    (draft.tanks || []).map((t: any) => t.address || '')
  );
  const [tankCoords, setTankCoords] = useState<({ lat: number; lng: number } | null)[]>(
    (draft.tanks || []).map((t: any) => (t.lat && t.lng ? { lat: t.lat, lng: t.lng } : null))
  );
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const userId = useAuthStore((s) => s.user?.id || '');

  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(savedAddressKey(userId)).then((raw) => {
      if (raw) setSavedAddresses(JSON.parse(raw));
    }).catch(() => {});
  }, [userId]);

  // Receive address picked from AddressPickerScreen
  useEffect(() => {
    const p = route.params;
    if (!p?.pickedAddress) return;
    if (p.pickedFor === 'primary') {
      setAddress(p.pickedAddress);
      setCoords({ lat: p.pickedLat, lng: p.pickedLng });
    } else if (typeof p.pickedFor === 'number') {
      const idx = p.pickedFor as number;
      setTankAddresses(prev => prev.map((a, i) => i === idx ? p.pickedAddress : a));
      setTankCoords(prev => prev.map((c, i) => i === idx ? { lat: p.pickedLat, lng: p.pickedLng } : c));
    }
    // Clear params so re-focus doesn't re-apply
    navigation.setParams({ pickedAddress: undefined, pickedLat: undefined, pickedLng: undefined, pickedFor: undefined });
  }, [route.params?.pickedAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCurrentAddress = async () => {
    const trimmed = address.trim();
    if (!trimmed || !userId) return;
    const next = [trimmed, ...savedAddresses.filter((a) => a !== trimmed)].slice(0, MAX_SAVED);
    setSavedAddresses(next);
    await AsyncStorage.setItem(savedAddressKey(userId), JSON.stringify(next));
  };

  const removeSavedAddress = async (addr: string) => {
    const next = savedAddresses.filter((a) => a !== addr);
    setSavedAddresses(next);
    await AsyncStorage.setItem(savedAddressKey(userId), JSON.stringify(next));
  };

  const updateTank = (idx: number, field: keyof TankEntry, value: any) => {
    setTanks(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const addTank = () => {
    if (tanks.length >= 5) return Alert.alert('Max 5 tanks', 'You can add up to 5 tanks per booking.');
    setTanks(prev => [...prev, { tank_type: '', tank_size_litres: 1000 }]);
    setSameLocation(prev => [...prev, true]);
    setTankAddresses(prev => [...prev, '']);
    setTankCoords(prev => [...prev, null]);
  };

  const removeTank = (idx: number) => {
    if (tanks.length <= 1) return;
    setTanks(prev => prev.filter((_, i) => i !== idx));
    setSameLocation(prev => prev.filter((_, i) => i !== idx));
    setTankAddresses(prev => prev.filter((_, i) => i !== idx));
    setTankCoords(prev => prev.filter((_, i) => i !== idx));
  };

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
    for (let i = 0; i < tanks.length; i++) {
      if (!tanks[i].tank_type) return Alert.alert(`Tank ${i + 1}`, 'Please select a tank type.');
      if (!tanks[i].tank_size_litres || tanks[i].tank_size_litres < 100)
        return Alert.alert(`Tank ${i + 1}`, 'Enter a valid tank size (min 100 litres).');
      if (i > 0 && !sameLocation[i] && !tankAddresses[i]?.trim())
        return Alert.alert(`Tank ${i + 1}`, 'Please enter or detect the address for this tank.');
    }
    if (!address.trim()) return Alert.alert('Address Required', 'Please enter or detect your service address.');

    // Merge per-tank addresses into tanks array
    const tanksWithAddresses = tanks.map((t, i) => {
      if (i === 0 || sameLocation[i]) {
        // Same location as primary — clear any stale per-tank address
        return { ...t, address: undefined, lat: undefined, lng: undefined };
      }
      return {
        ...t,
        address: tankAddresses[i]?.trim() || undefined,
        lat: tankCoords[i]?.lat ?? null,
        lng: tankCoords[i]?.lng ?? null,
      };
    });

    const firstTank = tanks[0];
    setStep1({
      property_type: propertyType,
      tanks: tanksWithAddresses,
      tank_type: firstTank.tank_type as any,
      tank_size_litres: firstTank.tank_size_litres,
      address: address.trim(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
    });
    navigation.navigate('DateTimeSelect');
  };

  const totalBasePrice = tanks.reduce((sum, t) => sum + (t.tank_type ? tankPrice(t) : 0), 0);

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
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '25%' }]} />
        </View>

        <View style={styles.body}>

          {/* Pre-service Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <LightbulbFilament size={18} weight="fill" color={C.warning} />
              <Text style={styles.tipsTitle}>Before Our Team Arrives</Text>
            </View>
            <Text style={styles.tipItem}>• Keep the tank empty or nearly empty for best results</Text>
            <Text style={styles.tipItem}>• Ensure power source is nearby for ozone equipment</Text>
            <Text style={styles.tipItem}>• Ozone treatment is in progress — keep children & pets away</Text>
            <Text style={styles.tipItem}>• Inform building watchman / residents in advance</Text>
          </View>

          {/* Property Type */}
          <Text style={styles.label}>Property Type <Text style={styles.required}>*</Text></Text>
          <View style={styles.typeRow}>
            {PROPERTY_TYPES.map((p) => {
              const active = propertyType === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.typeBtn, active && styles.typeBtnActive]}
                  onPress={() => setPropertyType(p.value as any)}
                >
                  <View style={[styles.typeIconWrap, active && styles.typeIconWrapActive]}>
                    {p.value === 'residential'
                      ? <House size={24} weight="regular" color={active ? C.primary : C.muted} />
                      : <Buildings size={24} weight="regular" color={active ? C.primary : C.muted} />}
                  </View>
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tanks */}
          <View style={styles.tanksSectionHeader}>
            <Text style={styles.label}>Tanks <Text style={styles.required}>*</Text></Text>
            <Text style={styles.tankCount}>{tanks.length} tank{tanks.length > 1 ? 's' : ''}</Text>
          </View>

          {tanks.map((tank, idx) => (
            <View key={idx} style={styles.tankCard}>
              <View style={styles.tankCardHeader}>
                <Text style={styles.tankCardTitle}>Tank {idx + 1}</Text>
                {tanks.length > 1 && (
                  <TouchableOpacity onPress={() => removeTank(idx)} style={styles.removeBtn}>
                    <Trash size={16} weight="fill" color={C.danger} />
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Tank Type */}
              <Text style={styles.subLabel}>Type</Text>
              <View style={styles.tankTypeRow}>
                {TANK_TYPES.map((t) => {
                  const active = tank.tank_type === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.tankTypeBtn, active && styles.tankTypeBtnActive]}
                      onPress={() => updateTank(idx, 'tank_type', t.value)}
                    >
                      <TankTypeIcon type={t.value} active={active} C={C} />
                      <Text style={[styles.tankTypeLabel, active && styles.tankTypeLabelActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tank Size */}
              <Text style={styles.subLabel}>Size (Litres)</Text>
              <View style={styles.sizeGrid}>
                {TANK_SIZES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sizeChip, tank.tank_size_litres === s && styles.sizeChipActive]}
                    onPress={() => updateTank(idx, 'tank_size_litres', s)}
                  >
                    <Text style={[styles.sizeText, tank.tank_size_litres === s && styles.sizeTextActive]}>
                      {s}L
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Custom size (e.g. 2500)"
                keyboardType="number-pad"
                value={tank.tank_size_litres?.toString()}
                onChangeText={(v) => updateTank(idx, 'tank_size_litres', parseInt(v, 10) || 0)}
                placeholderTextColor={C.gray}
              />

              {/* Per-tank location (tanks 2+) */}
              {idx > 0 && (
                <View style={styles.tankLocationSection}>
                  <Text style={styles.subLabel}>Location</Text>
                  <View style={styles.sameLocRow}>
                    <TouchableOpacity
                      style={[styles.sameLocBtn, sameLocation[idx] && styles.sameLocBtnActive]}
                      onPress={() => setSameLocation(prev => prev.map((v, i) => i === idx ? true : v))}
                    >
                      <Text style={[styles.sameLocText, sameLocation[idx] && styles.sameLocTextActive]}>
                        Same as Tank 1
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sameLocBtn, !sameLocation[idx] && styles.sameLocBtnDiff]}
                      onPress={() => setSameLocation(prev => prev.map((v, i) => i === idx ? false : v))}
                    >
                      <Text style={[styles.sameLocText, !sameLocation[idx] && styles.sameLocTextDiff]}>
                        Different Location
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!sameLocation[idx] && (
                    <View style={styles.tankAddrBlock}>
                      <TouchableOpacity
                        style={styles.addrPickerCard}
                        onPress={() => navigation.navigate('AddressPicker', {
                          pickingFor: idx,
                          initialAddress: tankAddresses[idx] || undefined,
                          initialLat: tankCoords[idx]?.lat,
                          initialLng: tankCoords[idx]?.lng,
                        })}
                        activeOpacity={0.75}
                      >
                        <View style={styles.addrPickerIconWrap}>
                          <MapPin size={18} weight="fill" color={tankAddresses[idx] ? C.primary : C.muted} />
                        </View>
                        <View style={styles.addrPickerTextWrap}>
                          {tankAddresses[idx] ? (
                            <>
                              <Text style={styles.addrPickerValue} numberOfLines={2}>{tankAddresses[idx]}</Text>
                              {tankCoords[idx] && (
                                <Text style={styles.addrPickerCoords}>
                                  GPS verified
                                </Text>
                              )}
                            </>
                          ) : (
                            <Text style={styles.addrPickerPlaceholder}>Tap to select Tank {idx + 1} location</Text>
                          )}
                        </View>
                        <NavigationArrow size={16} weight="fill" color={C.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Per-tank price preview */}
              {tank.tank_type ? (
                <View style={styles.tankPriceRow}>
                  <Text style={styles.tankPriceLabel}>Est. price for this tank:</Text>
                  <Text style={styles.tankPriceValue}>₹{tankPrice(tank)}</Text>
                </View>
              ) : null}
            </View>
          ))}

          {/* Add Tank Button */}
          {tanks.length < 5 && (
            <TouchableOpacity style={styles.addTankBtn} onPress={addTank}>
              <Plus size={18} weight="bold" color={C.primary} />
              <Text style={styles.addTankText}>Add Another Tank</Text>
            </TouchableOpacity>
          )}

          {/* Address */}
          <View style={styles.labelRow}>
            <MapPin size={16} weight="regular" color={C.primary} />
            <Text style={styles.labelWithIcon}>Service Address <Text style={styles.required}>*</Text></Text>
          </View>

          {/* Saved addresses quick-select */}
          {savedAddresses.length > 0 && (
            <View style={styles.savedAddrList}>
              {savedAddresses.map((addr, i) => (
                <View key={i} style={[styles.savedAddrRow, address === addr && styles.savedAddrRowActive]}>
                  <TouchableOpacity
                    style={styles.savedAddrBody}
                    onPress={() => { setAddress(addr); setCoords(null); }}
                  >
                    <Star size={12} weight={address === addr ? 'fill' : 'regular'} color={address === addr ? C.primary : C.muted} />
                    <Text style={[styles.savedAddrText, address === addr && { color: C.primary }]} numberOfLines={1}>{addr}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeSavedAddress(addr)} style={styles.savedAddrRemove}>
                    <Trash size={13} weight="regular" color={C.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Map picker card — Zomato/Rapido style */}
          <TouchableOpacity
            style={styles.addrPickerCard}
            onPress={() => navigation.navigate('AddressPicker', {
              pickingFor: 'primary',
              initialAddress: address || undefined,
              initialLat: coords?.lat,
              initialLng: coords?.lng,
            })}
            activeOpacity={0.75}
          >
            <View style={styles.addrPickerIconWrap}>
              <MapPin size={20} weight="fill" color={address ? C.primary : C.muted} />
            </View>
            <View style={styles.addrPickerTextWrap}>
              {address ? (
                <>
                  <Text style={styles.addrPickerValue} numberOfLines={2}>{address}</Text>
                  <Text style={styles.addrPickerChange}>
                    {coords ? 'GPS verified — tap to change' : 'Tap to change'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.addrPickerPlaceholder}>Tap to select your location</Text>
                  <Text style={styles.addrPickerHint}>Search, use GPS or drag the map</Text>
                </>
              )}
            </View>
            <NavigationArrow size={18} weight="fill" color={C.primary} />
          </TouchableOpacity>

          {/* Quick GPS fill */}
          <TouchableOpacity style={styles.locationBtn} onPress={handleUseMyLocation} disabled={locating}>
            {locating
              ? <ActivityIndicator size="small" color={C.primary} />
              : <NavigationArrow size={16} weight="fill" color={C.primary} />}
            <Text style={styles.locationBtnText}>
              {locating ? 'Getting location...' : 'Quick: Use My GPS Location'}
            </Text>
          </TouchableOpacity>

          {address.trim() && !savedAddresses.includes(address.trim()) && (
            <TouchableOpacity style={styles.saveAddrBtn} onPress={saveCurrentAddress}>
              <Star size={13} weight="regular" color={C.primary} />
              <Text style={styles.saveAddrText}>Save this address for future bookings</Text>
            </TouchableOpacity>
          )}

          {/* Service Contact Person */}
          <View style={styles.labelRow}>
            <User size={16} weight="regular" color={C.primary} />
            <Text style={styles.labelWithIcon}>Service Contact Person</Text>
            <Text style={styles.optionalTag}>(Optional)</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Watchman / Facility manager name"
            value={contactName}
            onChangeText={setContactName}
            placeholderTextColor={C.gray}
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Contact phone number"
            keyboardType="phone-pad"
            maxLength={10}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholderTextColor={C.gray}
          />

          {/* Total Price Preview */}
          <View style={styles.priceBox}>
            {isPremium ? (
              <>
                <Text style={styles.priceLabel}>Base price ({tanks.length} tank{tanks.length > 1 ? 's' : ''})</Text>
                <Text style={[styles.priceValue, { textDecorationLine: 'line-through', color: C.muted, fontSize: 18 }]}>
                  ₹{totalBasePrice}
                </Text>
                <Text style={[styles.priceValue, { color: C.success, fontSize: 22 }]}>FREE</Text>
                <Text style={styles.priceSub}>Covered by your AMC plan</Text>
              </>
            ) : (
              <>
                <Text style={styles.priceLabel}>
                  Total estimated base {tanks.length > 1 ? `(${tanks.length} tanks)` : ''}
                </Text>
                <View style={styles.priceRow}>
                  <CurrencyInr size={24} weight="bold" color={C.primary} />
                  <Text style={styles.priceValue}>{totalBasePrice}</Text>
                </View>
                <Text style={styles.priceSub}>+ add-ons & GST at next step</Text>
              </>
            )}
          </View>

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
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground, flex: 1 },
  stepText: { fontSize: 13, color: C.muted },
  progressBar: { height: 4, backgroundColor: C.border },
  progressFill: { height: 4, backgroundColor: C.primary },
  body: { padding: 20 },
  label: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10, marginTop: 18 },
  required: { color: C.danger, fontWeight: '700' },
  subLabel: { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 8, marginTop: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 18 },
  labelWithIcon: { fontSize: 14, fontWeight: '700', color: C.foreground },
  optionalTag: { fontSize: 12, color: C.muted, fontWeight: '400' },
  tipsCard: {
    backgroundColor: C.warningBg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.warning, marginTop: 8,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: C.warning },
  tipItem: { fontSize: 12, color: C.foreground, lineHeight: 20, marginBottom: 2 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 2, borderColor: C.border,
  },
  typeBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  typeIconWrap: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  typeIconWrapActive: { backgroundColor: C.primaryDim },
  typeLabel: { fontSize: 11, color: C.muted, fontWeight: '600', textAlign: 'center' },
  typeLabelActive: { color: C.primary },
  tanksSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tankCount: { fontSize: 12, color: C.primary, fontWeight: '700', marginTop: 18 },
  tankCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: C.border, marginBottom: 12,
  },
  tankCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  tankCardTitle: { fontSize: 14, fontWeight: '700', color: C.foreground },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeBtnText: { fontSize: 12, color: C.danger, fontWeight: '600' },
  tankTypeRow: { flexDirection: 'row', gap: 8 },
  tankTypeBtn: {
    flex: 1, backgroundColor: C.surfaceElevated, borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1.5, borderColor: C.border,
  },
  tankTypeBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  tankTypeLabel: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  tankTypeLabelActive: { color: C.primary },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  sizeChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.surfaceElevated, borderWidth: 1.5, borderColor: C.border,
  },
  sizeChipActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  sizeText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  sizeTextActive: { color: C.primary },
  tankPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  tankPriceLabel: { fontSize: 12, color: C.muted },
  tankPriceValue: { fontSize: 14, fontWeight: '700', color: C.primary },
  addTankBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.primary, borderStyle: 'dashed',
    borderRadius: 14, padding: 14, marginBottom: 4,
  },
  addTankText: { fontSize: 14, color: C.primary, fontWeight: '600' },
  input: {
    backgroundColor: C.surfaceElevated, borderRadius: 12, padding: 14,
    fontSize: 15, color: C.foreground, borderWidth: 1.5, borderColor: C.border, marginBottom: 4,
  },
  textArea: { height: 90 },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primaryBg,
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: C.borderActive,
  },
  locationBtnText: { fontSize: 14, color: C.primary, fontWeight: '600' },
  coordsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, paddingHorizontal: 4 },
  coordsText: { fontSize: 11, color: C.success, fontWeight: '600' },
  savedAddrList: { marginBottom: 8, gap: 6 },
  savedAddrRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, overflow: 'hidden' },
  savedAddrRowActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  savedAddrBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12 },
  savedAddrText: { flex: 1, fontSize: 12, color: C.foreground, fontWeight: '600' },
  savedAddrRemove: { padding: 10 },
  saveAddrBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingHorizontal: 4 },
  saveAddrText: { fontSize: 12, color: C.primary, fontWeight: '600' },
  addrPickerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: C.borderActive, marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  addrPickerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  addrPickerTextWrap: { flex: 1 },
  addrPickerValue: { fontSize: 14, fontWeight: '600', color: C.foreground, lineHeight: 20 },
  addrPickerChange: { fontSize: 11, color: C.primary, marginTop: 2 },
  addrPickerPlaceholder: { fontSize: 14, fontWeight: '600', color: C.muted },
  addrPickerHint: { fontSize: 11, color: C.gray, marginTop: 2 },
  addrPickerCoords: { fontSize: 11, color: C.success, marginTop: 2 },
  tankLocationSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  sameLocRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  sameLocBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceElevated },
  sameLocBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  sameLocBtnDiff: { borderColor: C.warning, backgroundColor: C.warningBg },
  sameLocText: { fontSize: 12, fontWeight: '600', color: C.muted },
  sameLocTextActive: { color: C.primary },
  sameLocTextDiff: { color: C.warning },
  tankAddrBlock: { gap: 4 },
  priceBox: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 20,
    alignItems: 'center', borderWidth: 1, borderColor: C.borderActive,
  },
  priceLabel: { fontSize: 12, color: C.muted },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  priceValue: { fontSize: 32, fontWeight: 'bold', color: C.primary },
  priceSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  nextBtn: {
    backgroundColor: C.primary, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20,
  },
  nextText: { color: C.primaryFg, fontWeight: 'bold', fontSize: 16 },
});

export default TankDetailsScreen;
