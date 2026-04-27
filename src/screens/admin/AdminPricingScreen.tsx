/**
 * AdminPricingScreen — full pricing matrix table for admins.
 *
 * Renders 8 tiers × 4 plans grouped by tier, showing single / per-tank-2 /
 * per-tank-2plus rates. Tap a price cell to edit it via a number-pad modal.
 * Edits PUT to /admin/pricing/:matrixId, then refetch.
 *
 * Top of screen exposes "Freeze & schedule for tomorrow" — copies the active
 * rows with effective_from = today+1, preserving an audit trail.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { adminAPI } from '../../services/api';
import {
  ArrowLeft, CurrencyInr, Check, X, ArrowsClockwise, CheckCircle,
} from '../../components/Icons';

type Plan = 'one_time' | 'monthly' | 'quarterly' | 'half_yearly';

interface PricingRow {
  id: string;
  tier_id: number;
  tier_label: string;
  plan: Plan;
  single_tank_paise: number;
  per_tank_2_paise: number;
  per_tank_2plus_paise: number;
  services_per_year: number;
  effective_from: string;
  active: boolean;
  requires_inspection: boolean;
  updated_at?: string;
}

interface Tier {
  id: number;
  label: string;
  min_litres: number;
  max_litres: number | null;
  requires_inspection: boolean;
}

const PLAN_ORDER: Plan[] = ['one_time', 'half_yearly', 'quarterly', 'monthly'];
const PLAN_LABEL: Record<Plan, string> = {
  one_time:    'One-Time',
  half_yearly: 'Half-Yearly',
  quarterly:   'Quarterly',
  monthly:     'Monthly',
};

const fmtInr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;
const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN'); } catch { return iso; }
};

type EditField = 'single_tank_paise' | 'per_tank_2_paise' | 'per_tank_2plus_paise';

const AdminPricingScreen = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [matrix, setMatrix] = useState<PricingRow[]>([]);
  const [edit, setEdit] = useState<{ row: PricingRow; field: EditField; value: string } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res: any = await adminAPI.getPricing();
      setTiers(res.data?.tiers || []);
      setMatrix(res.data?.matrix || []);
    } catch (e: any) {
      Alert.alert('Failed to load pricing', e?.message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Group rows by tier id for quick lookup
  const byTier = useMemo(() => {
    const map = new Map<number, Record<Plan, PricingRow | undefined>>();
    for (const r of matrix) {
      if (!map.has(r.tier_id)) {
        map.set(r.tier_id, { one_time: undefined, monthly: undefined, quarterly: undefined, half_yearly: undefined });
      }
      const slot = map.get(r.tier_id)!;
      slot[r.plan] = r;
    }
    return map;
  }, [matrix]);

  const onEdit = (row: PricingRow, field: EditField) => {
    const current = row[field];
    setEdit({ row, field, value: (current / 100).toString() });
  };

  const closeEdit = () => setEdit(null);

  const saveEdit = async () => {
    if (!edit) return;
    const inr = Number(edit.value);
    if (!Number.isFinite(inr) || inr < 0) {
      Alert.alert('Invalid value', 'Enter a non-negative rupee amount.');
      return;
    }
    const paise = Math.round(inr * 100);
    setSaving(true);
    // Optimistic update
    const prevRow = edit.row;
    const optimistic: PricingRow = { ...prevRow, [edit.field]: paise } as PricingRow;
    setMatrix((m) => m.map((r) => r.id === prevRow.id ? optimistic : r));
    closeEdit();

    try {
      await adminAPI.updatePricingRow(prevRow.id, { [edit.field]: paise } as any);
      fetchAll(); // hard refresh in case backend rounded or applied other rules
    } catch (e: any) {
      // Roll back
      setMatrix((m) => m.map((r) => r.id === prevRow.id ? prevRow : r));
      Alert.alert('Save failed', e?.message || 'Could not update price.');
    } finally {
      setSaving(false);
    }
  };

  const onFreeze = () => {
    Alert.alert(
      'Freeze & schedule new pricing',
      'This copies the active prices and schedules them to take effect tomorrow. Use it before making changes so today\'s prices are preserved as history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Freeze',
          onPress: async () => {
            try {
              const res: any = await adminAPI.freezePricing();
              Alert.alert(
                'Done',
                `Inserted ${res.data?.inserted_count ?? 0} rows for tomorrow.`,
              );
              fetchAll();
            } catch (e: any) {
              Alert.alert('Freeze failed', e?.message || 'Try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pricing Manager</Text>
          <Text style={styles.headerSub}>{matrix.length} active rows · {tiers.length} tiers</Text>
        </View>
        <TouchableOpacity onPress={fetchAll} style={styles.iconBtn}>
          <ArrowsClockwise size={18} weight="regular" color={C.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.freezeBtn} onPress={onFreeze} activeOpacity={0.8}>
          <CheckCircle size={16} weight="fill" color={C.primaryFg} />
          <Text style={styles.freezeBtnText}>Freeze & schedule for tomorrow</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
          {tiers.map((t) => {
            const slot = byTier.get(t.id);
            if (!slot) return null;
            return (
              <View key={t.id} style={styles.tierCard}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierTitle}>Tier {t.id} · {t.label}</Text>
                  {t.requires_inspection && (
                    <View style={styles.inspectPill}>
                      <Text style={styles.inspectPillText}>POST-INSPECTION</Text>
                    </View>
                  )}
                </View>

                {/* Column headers */}
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.colPlan, styles.colHead]}>Plan</Text>
                  <Text style={[styles.colCell, styles.colHead]}>Single</Text>
                  <Text style={[styles.colCell, styles.colHead]}>2 tanks</Text>
                  <Text style={[styles.colCell, styles.colHead]}>2+ tanks</Text>
                </View>

                {PLAN_ORDER.map((plan) => {
                  const r = slot[plan];
                  if (!r) return null;
                  return (
                    <View key={plan} style={styles.tableRow}>
                      <View style={styles.colPlan}>
                        <Text style={styles.planName}>{PLAN_LABEL[plan]}</Text>
                        <Text style={styles.planMeta}>
                          {r.services_per_year} visit{r.services_per_year > 1 ? 's' : ''}/yr · upd {fmtDate(r.updated_at)}
                        </Text>
                      </View>
                      <PriceCell
                        value={r.single_tank_paise}
                        styles={styles}
                        onPress={() => onEdit(r, 'single_tank_paise')}
                      />
                      <PriceCell
                        value={r.per_tank_2_paise}
                        styles={styles}
                        onPress={() => onEdit(r, 'per_tank_2_paise')}
                      />
                      <PriceCell
                        value={r.per_tank_2plus_paise}
                        styles={styles}
                        onPress={() => onEdit(r, 'per_tank_2plus_paise')}
                      />
                    </View>
                  );
                })}
              </View>
            );
          })}

          <Text style={styles.footnote}>
            All prices are inclusive of GST 18%. Tap any price to edit. Edits take effect immediately.
          </Text>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Edit modal */}
      <Modal visible={!!edit} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <CurrencyInr size={18} weight="bold" color={C.primary} />
              <Text style={styles.modalTitle}>Edit Price</Text>
              <TouchableOpacity onPress={closeEdit} style={styles.modalCloseBtn}>
                <X size={16} weight="bold" color={C.muted} />
              </TouchableOpacity>
            </View>
            {edit && (
              <>
                <Text style={styles.modalSub}>
                  Tier {edit.row.tier_id} · {PLAN_LABEL[edit.row.plan]} · {fieldLabel(edit.field)}
                </Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={edit.value}
                    onChangeText={(v) => setEdit((e) => e ? { ...e, value: v.replace(/[^0-9.]/g, '') } : e)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={C.muted}
                    autoFocus
                  />
                </View>
                <Text style={styles.inputHint}>Inclusive of 18% GST. Stored as paise on the server.</Text>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={saveEdit}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color={C.primaryFg} />
                  ) : (
                    <>
                      <Check size={16} weight="bold" color={C.primaryFg} />
                      <Text style={styles.saveBtnText}>Save Price</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

function fieldLabel(f: EditField): string {
  switch (f) {
    case 'single_tank_paise':    return 'Single tank rate';
    case 'per_tank_2_paise':     return 'Per-tank rate (2 tanks)';
    case 'per_tank_2plus_paise': return 'Per-tank rate (2+ tanks)';
  }
}

const PriceCell: React.FC<{ value: number; styles: any; onPress: () => void }> = ({ value, styles, onPress }) => (
  <TouchableOpacity style={styles.colCell} onPress={onPress} activeOpacity={0.6}>
    <Text style={styles.priceText}>{fmtInr(value)}</Text>
  </TouchableOpacity>
);

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.foreground },
  headerSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  actionsRow: { paddingHorizontal: 14, paddingTop: 12 },
  freezeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12,
  },
  freezeBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 13 },
  body: { padding: 14, paddingBottom: 60 },
  tierCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  tierHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tierTitle: { fontSize: 14, fontWeight: '700', color: C.foreground },
  inspectPill: {
    backgroundColor: C.warningBg, borderColor: C.warning, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  inspectPillText: { fontSize: 9, color: C.warning, fontWeight: '700', letterSpacing: 0.4 },
  tableRowHeader: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border,
    paddingVertical: 6, marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  colHead: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 0.4 },
  colPlan: { flex: 1.4 },
  colCell: { flex: 1, paddingHorizontal: 4, alignItems: 'flex-end' },
  planName: { fontSize: 13, fontWeight: '700', color: C.foreground },
  planMeta: { fontSize: 10, color: C.muted, marginTop: 2 },
  priceText: { fontSize: 13, fontWeight: '600', color: C.primary },
  footnote: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', maxWidth: 380, backgroundColor: C.surface, borderRadius: 16, padding: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modalTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.foreground },
  modalCloseBtn: { padding: 6 },
  modalSub: { fontSize: 12, color: C.muted, marginBottom: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceElevated, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: C.borderActive,
  },
  inputPrefix: { fontSize: 18, fontWeight: '700', color: C.primary, marginRight: 6 },
  input: { flex: 1, paddingVertical: 14, fontSize: 18, fontWeight: '700', color: C.foreground },
  inputHint: { fontSize: 11, color: C.muted, marginTop: 8, marginBottom: 4 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12, marginTop: 12,
  },
  saveBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },
});

export default AdminPricingScreen;
