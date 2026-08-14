/**
 * MyAddressesScreen — Zomato-style standalone address book.
 *
 * Lists the customer's saved addresses with default/edit/delete actions.
 * "Add new address" (and Edit) route through AddressPickerScreen with
 * returnScreen: 'MyAddresses'; the picked location comes back via
 * route.params.pickedAddress (same handshake TankDetailsScreen uses),
 * after which an inline nickname row (Home/Office/Other chips + input)
 * saves it through addressAPI.create / addressAPI.update.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { addressAPI } from '../../services/api';
import { confirm as showConfirm, alert as showAlert } from '../../services/dialog';
import { useTheme } from '../../hooks/useTheme';
import ScreenHeader from '../../components/ScreenHeader';
import WebContainer from '../../components/WebContainer';
import {
  MapPin, Star, PencilSimple, Trash, Plus, Check, House, X,
} from '../../components/Icons';

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat?: number | string | null;
  lng?: number | string | null;
  is_default?: boolean;
}

const LABEL_CHIPS = ['Home', 'Office', 'Other'];

const errMessage = (e: any) => {
  const d = e?.response?.data || e || {};
  return (d?.message as string) || 'Something went wrong. Please try again.';
};

const MyAddressesScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Pending location returned from the map picker, awaiting a nickname + save.
  const [pending, setPending] = useState<{ address: string; lat?: number; lng?: number } | null>(null);
  const [pendingLabel, setPendingLabel] = useState('Home');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAddresses = useCallback(async () => {
    try {
      const res = await addressAPI.list() as any;
      setAddresses(res.data?.addresses || []);
    } catch (_) {
      // keep whatever we had
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount + on focus (also refreshes after returning from the picker).
  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

  // Receive the location picked in AddressPickerScreen (same pattern as
  // TankDetailsScreen) → show the inline nickname row below.
  useEffect(() => {
    const p = route.params;
    if (!p?.pickedAddress) return;
    setPending({
      address: p.pickedAddress,
      lat: p.pickedLat != null ? Number(p.pickedLat) : undefined,
      lng: p.pickedLng != null ? Number(p.pickedLng) : undefined,
    });
    // Clear params so re-focus doesn't re-apply
    navigation.setParams({ pickedAddress: undefined, pickedLat: undefined, pickedLng: undefined, pickedFor: undefined });
  }, [route.params?.pickedAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPicker = () => {
    setEditingId(null);
    setPendingLabel('Home');
    navigation.navigate('AddressPicker', { pickingFor: 'primary', returnScreen: 'MyAddresses' });
  };

  const editAddress = (a: SavedAddress) => {
    setEditingId(a.id);
    setPendingLabel(a.label || 'Home');
    navigation.navigate('AddressPicker', {
      pickingFor: 'primary',
      returnScreen: 'MyAddresses',
      initialAddress: a.address,
      initialLat: a.lat != null ? Number(a.lat) : undefined,
      initialLng: a.lng != null ? Number(a.lng) : undefined,
    });
  };

  const cancelPending = () => {
    setPending(null);
    setEditingId(null);
  };

  const savePending = async () => {
    if (!pending || saving) return;
    const label = pendingLabel.trim() || 'Home';
    setSaving(true);
    try {
      if (editingId) {
        await addressAPI.update(editingId, {
          label,
          address: pending.address,
          lat: pending.lat ?? null,
          lng: pending.lng ?? null,
        });
      } else {
        await addressAPI.create({
          label,
          address: pending.address,
          lat: pending.lat ?? null,
          lng: pending.lng ?? null,
        });
      }
      setPending(null);
      setEditingId(null);
      await loadAddresses();
    } catch (e: any) {
      showAlert({ title: 'Could Not Save', message: errMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (a: SavedAddress) => {
    if (busyId) return;
    setBusyId(a.id);
    try {
      await addressAPI.setDefault(a.id);
      await loadAddresses();
    } catch (e: any) {
      showAlert({ title: 'Could Not Update', message: errMessage(e) });
    } finally {
      setBusyId(null);
    }
  };

  const deleteAddress = async (a: SavedAddress) => {
    if (busyId) return;
    const ok = await showConfirm({
      title: 'Delete Address?',
      message: `"${a.label}" will be removed from your saved addresses.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setBusyId(a.id);
    try {
      await addressAPI.remove(a.id);
      await loadAddresses();
    } catch (e: any) {
      showAlert({ title: 'Could Not Delete', message: errMessage(e) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <ScreenHeader title="My Addresses" subtitle="Saved locations for faster booking" />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <WebContainer variant="narrow">

        {/* Add new address */}
        <TouchableOpacity style={styles.addBtn} onPress={openPicker} activeOpacity={0.8}>
          <Plus size={18} weight="bold" color={C.primary} />
          <Text style={styles.addBtnText}>Add new address</Text>
        </TouchableOpacity>

        {/* Inline nickname + save row for a freshly picked / edited location */}
        {pending && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingHead}>
              <MapPin size={16} weight="fill" color={C.primary} />
              <Text style={styles.pendingTitle}>
                {editingId ? 'Update this address' : 'Save this address'}
              </Text>
              <TouchableOpacity onPress={cancelPending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} weight="bold" color={C.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pendingAddr} numberOfLines={3}>{pending.address}</Text>

            <View style={styles.chipRow}>
              {LABEL_CHIPS.map((chip) => {
                const active = pendingLabel === chip;
                return (
                  <TouchableOpacity
                    key={chip}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setPendingLabel(chip)}
                    activeOpacity={0.7}
                  >
                    {chip === 'Home' && (
                      <House size={13} weight={active ? 'fill' : 'regular'} color={active ? C.primary : C.muted} />
                    )}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.labelInput}
              placeholder="Nickname (e.g. Home, Office, Farmhouse)"
              placeholderTextColor={C.muted}
              value={pendingLabel}
              onChangeText={setPendingLabel}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={savePending}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={C.primaryFg} />
              ) : (
                <>
                  <Check size={16} weight="bold" color={C.primaryFg} />
                  <Text style={styles.saveBtnText}>{editingId ? 'Update Address' : 'Save Address'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Address list */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyBox}>
            <MapPin size={32} weight="regular" color={C.muted} />
            <Text style={styles.emptyTitle}>No saved addresses yet</Text>
            <Text style={styles.emptySub}>
              Save your tank locations once and pick them instantly on every booking.
            </Text>
          </View>
        ) : (
          addresses.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.labelPill, a.is_default && styles.labelPillDefault]}>
                  {a.is_default ? (
                    <Star size={12} weight="fill" color={C.warning} />
                  ) : (
                    <MapPin size={12} weight="fill" color={C.primary} />
                  )}
                  <Text style={[styles.labelPillText, a.is_default && { color: C.warning }]}>
                    {a.label || 'Address'}{a.is_default ? ' · Default' : ''}
                  </Text>
                </View>
                {busyId === a.id && <ActivityIndicator size="small" color={C.primary} />}
              </View>

              <Text style={styles.cardAddr}>{a.address}</Text>

              <View style={styles.actionRow}>
                {!a.is_default && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => makeDefault(a)}
                    disabled={busyId !== null}
                    activeOpacity={0.7}
                  >
                    <Star size={14} weight="regular" color={C.primary} />
                    <Text style={styles.actionText}>Set default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => editAddress(a)}
                  disabled={busyId !== null}
                  activeOpacity={0.7}
                >
                  <PencilSimple size={14} weight="regular" color={C.primary} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => deleteAddress(a)}
                  disabled={busyId !== null}
                  activeOpacity={0.7}
                >
                  <Trash size={14} weight="regular" color={C.danger} />
                  <Text style={[styles.actionText, { color: C.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        </WebContainer>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  body: { padding: 16, paddingBottom: 40 },
  center: { paddingVertical: 48, alignItems: 'center' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primaryBg, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.primary, borderStyle: 'dashed',
    paddingVertical: 14, marginBottom: 14,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },

  pendingCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 1.5, borderColor: C.primary,
  },
  pendingHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  pendingTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.foreground },
  pendingAddr: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.surfaceElevated, borderWidth: 1.5, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primaryBg, borderColor: C.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: C.muted },
  chipTextActive: { color: C.primary, fontWeight: '700' },
  labelInput: {
    backgroundColor: C.surfaceElevated, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.foreground, marginBottom: 12,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: C.primaryFg },

  emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.foreground, marginTop: 12 },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  labelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.primaryBg, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  labelPillDefault: { backgroundColor: C.warningBg },
  labelPillText: { fontSize: 12, fontWeight: '700', color: C.primary },
  cardAddr: { fontSize: 13, color: C.foreground, lineHeight: 19, marginBottom: 12 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
    backgroundColor: C.surfaceElevated,
  },
  actionText: { fontSize: 12, fontWeight: '700', color: C.primary },
});

export default MyAddressesScreen;
