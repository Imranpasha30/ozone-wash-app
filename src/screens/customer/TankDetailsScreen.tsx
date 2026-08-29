import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import useBookingStore, { TankEntry, ServicePlan } from '../../store/booking.store';
import useAuthStore from '../../store/auth.store';
import usePremiumStore from '../../store/premium.store';
import { TANK_TYPES, TANK_SIZE_BANDS, SERVICE_PLANS } from '../../utils/constants';
import { addressAPI, funnelAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  ArrowLeft, ArrowRight, House, Wrench, Drop, MapPin, CurrencyInr,
  NavigationArrow, Buildings, User, Phone, LightbulbFilament, Plus, Trash, Star,
  PencilSimple, Check, CheckCircle,
} from '../../components/Icons';
import WebContainer from '../../components/WebContainer';

// Backend-persisted address book entry (Zomato-style nickname address)
interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
}

const NICKNAME_SUGGESTIONS = ['Home', 'Office', 'Other'];

const PROPERTY_TYPES = [
  { label: 'Residential', value: 'residential' },
  { label: 'Commercial', value: 'commercial' },
];

// Return the band that contains the given litres value (falls back to band 0).
const bandForLitres = (litres: number) => {
  const found = TANK_SIZE_BANDS.find(b => {
    if (litres < b.minL) return false;
    return b.maxL == null || litres <= b.maxL;
  });
  return found || TANK_SIZE_BANDS[0];
};

// Stable client-side id for React keys — so adding/removing a tank never
// disturbs the other tank cards' selections or inputs.
let _tankSeq = 0;
const newTankId = () => `tk_${Date.now().toString(36)}_${_tankSeq++}`;

const tankPrice = (tank: TankEntry) => {
  if (!tank.tank_type || !tank.tank_size_litres) return 0;
  return bandForLitres(tank.tank_size_litres).basePrice;
};

const TankTypeIcon = ({ type, active, C }: { type: string; active: boolean; C: any }) => {
  const color = active ? C.primary : C.muted;
  if (type === 'overhead') return <House size={22} weight="regular" color={color} />;
  if (type === 'underground') return <Wrench size={22} weight="regular" color={color} />;
  if (type === 'sintex') return <Buildings size={22} weight="regular" color={color} />;
  return <Drop size={22} weight="fill" color={color} />;
};

const TankDetailsScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { draft, setStep1 } = useBookingStore();
  const isPremium = usePremiumStore((s) => s.isPremium);

  const [propertyType, setPropertyType] = useState<'residential' | 'commercial'>(
    (draft.property_type as any) || 'residential'
  );
  const [tanks, setTanks] = useState<TankEntry[]>(
    draft.tanks?.length
      ? draft.tanks.map((t: any) => ({ ...t, _id: t._id || newTankId() }))
      : [{ tank_type: '', tank_size_litres: 1000, name: '', _id: newTankId() } as any]
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
    tanks.map((t: any, i: number) => i === 0 ? true : !(t.address))
  );
  const [tankAddresses, setTankAddresses] = useState<string[]>(
    tanks.map((t: any) => t.address || '')
  );
  const [tankCoords, setTankCoords] = useState<({ lat: number; lng: number } | null)[]>(
    tanks.map((t: any) => (t.lat && t.lng ? { lat: t.lat, lng: t.lng } : null))
  );
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressId, setAddressId] = useState<string | null>(draft.address_id || null);
  const [plan, setPlan] = useState<ServicePlan>(draft.plan || 'one_time');
  // Inline "save with nickname" row (shown after typing a new address)
  const [saveLabel, setSaveLabel] = useState('');
  const [showSaveRow, setShowSaveRow] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const userId = useAuthStore((s) => s.user?.id || '');
  const userPhone = useAuthStore((s) => s.user?.phone || '');
  // Contact phone defaults to the logged-in number (required in handleNext).
  React.useEffect(() => { if (!contactPhone && userPhone) setContactPhone(userPhone); }, [userPhone]);

  const loadAddresses = React.useCallback(() => {
    addressAPI.list()
      .then((res: any) => setSavedAddresses(res.data?.addresses || res.addresses || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadAddresses();
    // Funnel: customer entered the booking flow (step 1)
    funnelAPI.track(1, { property_type: propertyType, tanks: tanks.length });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default address preselect — Zomato behaviour: default address auto-fills
  useEffect(() => {
    if (address || !savedAddresses.length) return;
    const def = savedAddresses.find((a) => a.is_default) || savedAddresses[0];
    if (def) {
      setAddress(def.address);
      setAddressId(def.id);
      if (def.lat && def.lng) setCoords({ lat: Number(def.lat), lng: Number(def.lng) });
      if ((def as any).phone) setContactPhone(String((def as any).phone));
    }
  }, [savedAddresses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Receive address picked from AddressPickerScreen
  useEffect(() => {
    const p = route.params;
    if (!p?.pickedAddress) return;
    if (p.pickedFor === 'primary') {
      setAddress(p.pickedAddress);
      setCoords({ lat: p.pickedLat, lng: p.pickedLng });
      if (editingAddressId) {
        // "Update existing address" flow — persist the change to the book
        const id = editingAddressId;
        setEditingAddressId(null);
        addressAPI.update(id, { address: p.pickedAddress, lat: p.pickedLat, lng: p.pickedLng })
          .then(() => loadAddresses())
          .catch(() => {});
        setAddressId(id);
      } else {
        // Fresh location — not from the book; offer to save it below
        setAddressId(null);
        setShowSaveRow(true);
      }
    } else {
      // Per-tank pick. On web, route params can arrive as STRINGS ("1"), so
      // coerce with Number() — a strict typeof check silently drops the pick.
      const idx = Number(p.pickedFor);
      if (Number.isFinite(idx) && idx > 0) {
        setTankAddresses(prev => prev.map((a, i) => i === idx ? p.pickedAddress : a));
        setTankCoords(prev => prev.map((c, i) => i === idx ? { lat: Number(p.pickedLat), lng: Number(p.pickedLng) } : c));
        // Picking a custom address = explicitly a different location
        setSameLocation(prev => prev.map((v, i) => i === idx ? false : v));
      }
    }
    // Clear params so re-focus doesn't re-apply
    navigation.setParams({ pickedAddress: undefined, pickedLat: undefined, pickedLng: undefined, pickedFor: undefined });
  }, [route.params?.pickedAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the typed/picked address to the backend book under a nickname
  const saveCurrentAddress = async () => {
    const trimmed = address.trim();
    const label = saveLabel.trim() || 'Home';
    if (!trimmed || savingAddr) return;
    setSavingAddr(true);
    try {
      const res: any = await addressAPI.create({
        label,
        address: trimmed,
        // Bind the current contact phone + tank set to this saved location.
        phone: contactPhone.trim() || null,
        tanks: tanks.map(({ _id, ...t }: any) => t),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      const saved = res.data?.address || res.address;
      if (saved) {
        setSavedAddresses((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
        setAddressId(saved.id);
      }
      setShowSaveRow(false);
      setSaveLabel('');
    } catch (e: any) {
      Alert.alert('Could not save', e?.response?.data?.message || 'Please try again.');
    } finally {
      setSavingAddr(false);
    }
  };

  const removeSavedAddress = async (id: string) => {
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
    if (addressId === id) setAddressId(null);
    addressAPI.remove(id).catch(() => loadAddresses());
  };

  const selectSavedAddress = (a: SavedAddress) => {
    setAddress(a.address);
    setAddressId(a.id);
    setCoords(a.lat && a.lng ? { lat: Number(a.lat), lng: Number(a.lng) } : null);
    // Zomato-style: a saved location carries its own contact phone + tank set.
    if ((a as any).phone) setContactPhone(String((a as any).phone));
    const savedTanks = (a as any).tanks;
    if (Array.isArray(savedTanks) && savedTanks.length) {
      setTanks(savedTanks.map((t: any) => ({ ...t, _id: newTankId() })));
      setSameLocation(savedTanks.map(() => true));
      setTankAddresses(savedTanks.map(() => ''));
      setTankCoords(savedTanks.map(() => null));
    }
  };

  // "Update existing" — open the map picker preloaded, then PUT on return.
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const editSavedAddress = (a: SavedAddress) => {
    setEditingAddressId(a.id);
    navigation.navigate('AddressPicker', {
      pickingFor: 'primary',
      initialAddress: a.address,
      initialLat: a.lat ? Number(a.lat) : undefined,
      initialLng: a.lng ? Number(a.lng) : undefined,
    });
  };

  const updateTank = (idx: number, field: keyof TankEntry, value: any) => {
    setTanks(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const addTank = () => {
    if (tanks.length >= 5) return Alert.alert('Max 5 tanks', 'You can add up to 5 tanks per booking.');
    setTanks(prev => [...prev, { tank_type: '', tank_size_litres: 1000, name: '', _id: newTankId() } as any]);
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
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          Alert.alert('Not Supported', 'Geolocation is not supported by your browser.');
          setLocating(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCoords({ lat: latitude, lng: longitude });
            setLocating(false);
          },
          () => {
            Alert.alert('Location Error', 'Could not get your location. Please allow location access.');
            setLocating(false);
          },
          { enableHighAccuracy: true, timeout: 10000 },
        );
        return;
      }
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
    const phone = contactPhone.trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return Alert.alert('Contact number required', 'Please enter a valid 10-digit mobile number our team can call on arrival.');
    }
    setStep1({
      property_type: propertyType,
      tanks: tanksWithAddresses,
      tank_type: firstTank.tank_type as any,
      tank_size_litres: firstTank.tank_size_litres,
      address: address.trim(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      address_id: addressId,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      plan,
    });
    // Funnel: step 1 complete → customer reached step 2
    funnelAPI.track(2, {
      tanks: tanks.map(t => ({ type: t.tank_type, litres: t.tank_size_litres })),
      plan,
      address: address.trim().slice(0, 120),
    });
    navigation.navigate('DateTimeSelect');
  };

  const totalBasePrice = tanks.reduce((sum, t) => sum + (t.tank_type ? tankPrice(t) : 0), 0);

  // On web, KeyboardAvoidingView has no effect — the inner ScrollView already
  // handles scrolling, so just use a plain View as the root wrapper.
  const RootWrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;
  const rootWrapperProps = Platform.OS === 'web'
    ? { style: styles.root }
    : { style: styles.root, behavior: (Platform.OS === 'ios' ? 'padding' : undefined) as any };

  return (
    <RootWrapper {...rootWrapperProps}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
        <WebContainer variant="narrow">
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

          {/* ── Service Address — FIRST, Zomato-style. Tank 1 is always cleaned
              here; extra tanks can override with their own location below. ── */}
          <View style={styles.labelRow}>
            <MapPin size={16} weight="regular" color={C.primary} />
            <Text style={styles.labelWithIcon}>Service Address <Text style={styles.required}>*</Text></Text>
          </View>
          <Text style={styles.addrSubtext}>Tank 1 is serviced at this address. Extra tanks can set their own location.</Text>

          {/* Saved address book — nickname pill + select / edit / delete */}
          {savedAddresses.length > 0 && (
            <View style={styles.savedAddrList}>
              <Text style={styles.savedAddrHint}>Select from saved addresses</Text>
              {savedAddresses.map((a) => {
                const active = addressId === a.id;
                return (
                  <View key={a.id} style={[styles.savedAddrRow, active && styles.savedAddrRowActive]}>
                    <TouchableOpacity
                      style={styles.savedAddrBody}
                      onPress={() => selectSavedAddress(a)}
                    >
                      <View style={[styles.addrLabelPill, active && styles.addrLabelPillActive]}>
                        {active
                          ? <Check size={10} weight="bold" color={C.primaryFg} />
                          : <Star size={10} weight={a.is_default ? 'fill' : 'regular'} color={C.primary} />}
                        <Text style={[styles.addrLabelText, active && { color: C.primaryFg }]}>{a.label}</Text>
                      </View>
                      <Text style={[styles.savedAddrText, active && { color: C.primary }]} numberOfLines={1}>
                        {a.address}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => editSavedAddress(a)} style={styles.savedAddrRemove}>
                      <PencilSimple size={14} weight="regular" color={C.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeSavedAddress(a.id)} style={styles.savedAddrRemove}>
                      <Trash size={13} weight="regular" color={C.muted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              <Text style={styles.savedAddrHint}>…or pick a new location below</Text>
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

          {/* Save-with-nickname (Zomato style) — shown for fresh addresses */}
          {address.trim() && !addressId && !showSaveRow && (
            <TouchableOpacity style={styles.saveAddrBtn} onPress={() => setShowSaveRow(true)}>
              <Star size={13} weight="regular" color={C.primary} />
              <Text style={styles.saveAddrText}>Save this address for future bookings</Text>
            </TouchableOpacity>
          )}
          {address.trim() && !addressId && showSaveRow && (
            <View style={styles.saveNickRow}>
              <View style={styles.nickChipsRow}>
                {NICKNAME_SUGGESTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.nickChip, saveLabel === n && styles.nickChipActive]}
                    onPress={() => setSaveLabel(n)}
                  >
                    <Text style={[styles.nickChipText, saveLabel === n && { color: C.primaryFg }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.nickInputRow}>
                <TextInput
                  style={styles.nickInput}
                  placeholder="Nickname (e.g. Home, Mom's house)"
                  value={saveLabel}
                  onChangeText={setSaveLabel}
                  placeholderTextColor={C.gray}
                  maxLength={40}
                />
                <TouchableOpacity style={styles.nickSaveBtn} onPress={saveCurrentAddress} disabled={savingAddr}>
                  {savingAddr
                    ? <ActivityIndicator size="small" color={C.primaryFg} />
                    : <Text style={styles.nickSaveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tanks */}
          <View style={styles.tanksSectionHeader}>
            <Text style={styles.label}>Tanks <Text style={styles.required}>*</Text></Text>
            <Text style={styles.tankCount}>{tanks.length} tank{tanks.length > 1 ? 's' : ''}</Text>
          </View>

          {tanks.map((tank, idx) => (
            <View key={(tank as any)._id || idx} style={styles.tankCard}>
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

              {/* Tank Name — optional personalisation (G2, BK4) */}
              <Text style={styles.subLabel}>Tank Name (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder={`e.g. ${idx === 0 ? 'Terrace Tank' : 'Block A Sump'}`}
                value={tank.name || ''}
                onChangeText={(v) => updateTank(idx, 'name', v)}
                placeholderTextColor={C.gray}
                maxLength={32}
              />

              {/* Tank Size — 8 PDF bands (BK1/BK3/BK9). Pick a band or enter exact litres below. */}
              <Text style={styles.subLabel}>Capacity</Text>
              <View style={styles.sizeGrid}>
                {TANK_SIZE_BANDS.map((b) => {
                  const active = bandForLitres(tank.tank_size_litres).mid === b.mid;
                  return (
                    <TouchableOpacity
                      key={b.mid}
                      style={[styles.sizeChip, active && styles.sizeChipActive]}
                      onPress={() => updateTank(idx, 'tank_size_litres', b.mid)}
                    >
                      <Text style={[styles.sizeText, active && styles.sizeTextActive]}>
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Custom litres input — falls into the matching band automatically.
                  Lets users enter, e.g. 2,500 L without being forced onto a chip. */}
              <View style={styles.customSizeRow}>
                <TextInput
                  style={styles.customSizeInput}
                  placeholder="Or enter exact litres (e.g. 2500)"
                  keyboardType="number-pad"
                  value={tank.tank_size_litres ? String(tank.tank_size_litres) : ''}
                  onChangeText={(v) => {
                    const n = parseInt((v || '').replace(/\D/g, ''), 10);
                    updateTank(idx, 'tank_size_litres', Number.isFinite(n) ? n : 0);
                  }}
                  placeholderTextColor={C.gray}
                  maxLength={8}
                />
                {tank.tank_size_litres ? (
                  <View style={styles.bandHintPill}>
                    <Text style={styles.bandHintPillText}>
                      Band: {bandForLitres(tank.tank_size_litres).label}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Per-tank location — every tank shows where the crew will go.
                  Tank 1 sources from the Service Address at the bottom (read-only
                  chip below). Tanks 2+ can either inherit Tank 1 or set their own. */}
              {idx === 0 && (
                <View style={styles.tankLocationSection}>
                  <Text style={styles.subLabel}>Location</Text>
                  <View style={[styles.tank1LocBox, !address && { borderColor: C.warning, backgroundColor: C.warningBg }]}>
                    <MapPin size={14} weight="fill" color={address ? C.primary : C.warning} />
                    <Text style={styles.tank1LocText} numberOfLines={2}>
                      {address
                        ? address
                        : 'Set the Service Address above ↑ — Tank 1 is cleaned there'}
                    </Text>
                  </View>
                </View>
              )}
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
                      {/* Quick-select this tank's location from the saved book */}
                      {savedAddresses.length > 0 && !tankAddresses[idx] && (
                        <>
                          <Text style={styles.tankSavedHint}>Pick from saved addresses:</Text>
                          <View style={styles.tankSavedChips}>
                            {savedAddresses.map((a) => (
                              <TouchableOpacity
                                key={a.id}
                                style={styles.tankSavedChip}
                                onPress={() => {
                                  setTankAddresses(prev => prev.map((v, i) => i === idx ? a.address : v));
                                  setTankCoords(prev => prev.map((v, i) => i === idx
                                    ? (a.lat && a.lng ? { lat: Number(a.lat), lng: Number(a.lng) } : null)
                                    : v));
                                }}
                              >
                                <MapPin size={11} weight="fill" color={C.primary} />
                                <Text style={styles.tankSavedChipText}>{a.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}

                      {tankAddresses[idx] ? (
                        /* Confirmed state — the picked address is IMPOSSIBLE to miss */
                        <View style={styles.tankAddrConfirmed}>
                          <View style={styles.tankAddrConfirmedTop}>
                            <CheckCircle size={16} weight="fill" color={C.success} />
                            <Text style={styles.tankAddrConfirmedTitle}>Tank {idx + 1} location set</Text>
                            <TouchableOpacity
                              onPress={() => navigation.navigate('AddressPicker', {
                                pickingFor: idx,
                                initialAddress: tankAddresses[idx] || undefined,
                                initialLat: tankCoords[idx]?.lat,
                                initialLng: tankCoords[idx]?.lng,
                              })}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={styles.tankAddrChange}>Change</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.tankAddrConfirmedText} numberOfLines={3}>{tankAddresses[idx]}</Text>
                          {tankCoords[idx] && <Text style={styles.tankAddrGps}>GPS verified</Text>}
                        </View>
                      ) : (
                        /* Empty state — clear CTA to pick this tank's location */
                        <TouchableOpacity
                          style={styles.addrPickerCard}
                          onPress={() => navigation.navigate('AddressPicker', {
                            pickingFor: idx,
                            initialAddress: undefined,
                            initialLat: undefined,
                            initialLng: undefined,
                          })}
                          activeOpacity={0.75}
                        >
                          <View style={styles.addrPickerIconWrap}>
                            <MapPin size={18} weight="fill" color={C.muted} />
                          </View>
                          <View style={styles.addrPickerTextWrap}>
                            <Text style={styles.addrPickerPlaceholder}>Tap to select Tank {idx + 1} location</Text>
                            <Text style={styles.addrPickerHint}>Search, use GPS or drag the map</Text>
                          </View>
                          <NavigationArrow size={16} weight="fill" color={C.primary} />
                        </TouchableOpacity>
                      )}
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
            <>
              <TouchableOpacity style={styles.addTankBtn} onPress={addTank}>
                <Plus size={18} weight="bold" color={C.primary} />
                <Text style={styles.addTankText}>Add Another Tank</Text>
              </TouchableOpacity>
              <Text style={styles.multiLocHint}>
                Each tank can be at the same address or a different location — set per-tank when you add more.
              </Text>
            </>
          )}

          {/* Service Plan — spec §4: frequency picks the per-service discount.
              Choosing anything other than One-time = an AMC (annual contract,
              billed for the full year at checkout). Hidden for members whose
              active AMC already covers this service. */}
          {!isPremium && (
            <>
              <View style={styles.labelRow}>
                <Star size={16} weight="regular" color={C.primary} />
                <Text style={styles.labelWithIcon}>Service Plan</Text>
              </View>
              <View style={styles.planGrid}>
                {SERVICE_PLANS.map((p) => {
                  const active = plan === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.planChip, active && styles.planChipActive]}
                      onPress={() => setPlan(p.value as ServicePlan)}
                    >
                      <Text style={[styles.planLabel, active && { color: C.primary }]}>{p.label}</Text>
                      <Text style={styles.planTagline}>{p.tagline}</Text>
                      {p.discountPct > 0 && (
                        <View style={[styles.planOffPill, active && { backgroundColor: C.primary }]}>
                          <Text style={[styles.planOffText, active && { color: C.primaryFg }]}>{p.discountPct}% OFF</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {plan !== 'one_time' && (
                <View style={styles.planNote}>
                  <LightbulbFilament size={14} weight="fill" color={C.warning} />
                  <Text style={styles.planNoteText}>
                    {SERVICE_PLANS.find(p => p.value === plan)?.visitsPerYear} services/year billed as an annual AMC — today's visit counts as visit #1.
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Service Contact — phone required, defaults to the login number */}
          <View style={styles.labelRow}>
            <User size={16} weight="regular" color={C.primary} />
            <Text style={styles.labelWithIcon}>Service Contact</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Contact name (watchman / facility manager) — optional"
            value={contactName}
            onChangeText={setContactName}
            placeholderTextColor={C.gray}
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Contact mobile number (required)"
            keyboardType="phone-pad"
            maxLength={10}
            value={contactPhone}
            onChangeText={(v) => setContactPhone(v.replace(/\D/g, ''))}
            placeholderTextColor={C.gray}
          />
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 6, marginLeft: 4 }}>
            {contactPhone && contactPhone === userPhone
              ? '✓ Using your login number — edit it if the on-site contact is different.'
              : 'The number our team should call on arrival.'}
          </Text>

          {/* Cross-sell CS2 — co-visit Auto. Team already coming → low-friction add. */}
          <TouchableOpacity
            style={styles.crossSellCard}
            onPress={() => navigation.navigate('AutoWashBooking', { coVisit: true })}
            activeOpacity={0.85}
          >
            <View style={styles.crossSellIcon}>
              <Text style={{ fontSize: 22 }}>🚗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.crossSellTitle}>Also have a car or bike?</Text>
              <Text style={styles.crossSellSub}>
                Team already coming — add Auto. Car ₹599 · 2W ₹299
              </Text>
            </View>
            <ArrowRight size={18} weight="bold" color={C.primary} />
          </TouchableOpacity>

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
        </WebContainer>
      </ScrollView>
    </RootWrapper>
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
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
    // Soft depth instead of a flat hard outline — the key "premium" upgrade.
    shadowColor: '#0b1220', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
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
  multiLocHint: {
    fontSize: 11, color: C.muted, fontStyle: 'italic',
    textAlign: 'center', marginTop: 6, marginBottom: 10,
    paddingHorizontal: 16, lineHeight: 15,
  },
  tank1LocBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primaryBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.primary + '33',
  },
  tank1LocText: { fontSize: 12, color: C.primary, flex: 1 },
  addTankBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: C.primary + '33',
    backgroundColor: C.primaryBg,
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
  savedAddrHint: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 2 },
  addrSubtext: { fontSize: 11.5, color: C.muted, marginBottom: 8, marginTop: -2 },
  tankSavedHint: { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 6 },
  tankSavedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tankSavedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 999, borderWidth: 1, borderColor: C.borderActive,
    backgroundColor: C.primaryBg, paddingHorizontal: 12, paddingVertical: 6,
  },
  tankSavedChipText: { fontSize: 12, fontWeight: '700', color: C.primary },
  tankAddrConfirmed: {
    backgroundColor: C.successBg, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.success, padding: 12,
  },
  tankAddrConfirmedTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  tankAddrConfirmedTitle: { flex: 1, fontSize: 12.5, fontWeight: '800', color: C.success },
  tankAddrChange: { fontSize: 12, fontWeight: '700', color: C.primary },
  tankAddrConfirmedText: { fontSize: 12.5, color: C.foreground, lineHeight: 18 },
  tankAddrGps: { fontSize: 10.5, color: C.success, fontWeight: '600', marginTop: 4 },
  addrLabelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primaryBg, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: 8,
  },
  addrLabelPillActive: { backgroundColor: C.primary },
  addrLabelText: { fontSize: 11, fontWeight: '700', color: C.primary },
  saveNickRow: { marginTop: 8, gap: 8 },
  nickChipsRow: { flexDirection: 'row', gap: 8 },
  nickChip: {
    borderRadius: 999, borderWidth: 1, borderColor: C.borderActive,
    paddingHorizontal: 14, paddingVertical: 6, backgroundColor: C.surface,
  },
  nickChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  nickChipText: { fontSize: 12, fontWeight: '700', color: C.primary },
  nickInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  nickInput: {
    flex: 1, backgroundColor: C.surfaceElevated, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 13, color: C.foreground,
  },
  nickSaveBtn: {
    backgroundColor: C.primary, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 11,
    alignItems: 'center', justifyContent: 'center', minWidth: 64,
  },
  nickSaveText: { color: C.primaryFg, fontSize: 13, fontWeight: '700' },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  planChip: {
    width: '48%', flexGrow: 1, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.surface, padding: 12,
  },
  planChipActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  planLabel: { fontSize: 14, fontWeight: '800', color: C.foreground },
  planTagline: { fontSize: 11, color: C.muted, marginTop: 2 },
  planOffPill: {
    alignSelf: 'flex-start', backgroundColor: C.successBg,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6,
  },
  planOffText: { fontSize: 10, fontWeight: '800', color: C.success },
  planNote: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: C.warningBg, borderRadius: 10, padding: 10, marginBottom: 8,
  },
  planNoteText: { flex: 1, fontSize: 11.5, color: C.foreground, lineHeight: 16 },
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
  customSizeRow: {
    marginTop: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    flexWrap: 'wrap',
  },
  customSizeInput: {
    flex: 1, minWidth: 180,
    backgroundColor: C.surfaceElevated,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.foreground,
  },
  bandHintPill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.borderActive,
  },
  bandHintPillText: { fontSize: 11, fontWeight: '700', color: C.primary },
  crossSellCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.primaryBg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.borderActive, marginTop: 20,
  },
  crossSellIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },
  crossSellTitle: { fontSize: 14, fontWeight: '700', color: C.foreground },
  crossSellSub: { fontSize: 12, color: C.muted, marginTop: 2 },
});

export default TankDetailsScreen;
