/**
 * AdminEcoScoreScreen — manage the EcoScore engine.
 *
 *  - Recalculate-all button (one-shot, with loading state + toast)
 *  - Current weights (7 sliders worth) shown as bars + threshold pills
 *  - Edit-weights modal: 7 number inputs that validate sum=1.00 in real time
 *  - Top 20 customers (highest score)
 *  - Bottom 20 customers (low engagement — outreach list)
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Platform, StatusBar,
  TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { ecoScoreAPI } from '../../services/api';
import { MisHeader } from '../../components/charts/MisScaffold';
import Bars, { Bar } from '../../components/charts/Bars';
import {
  ArrowsClockwise, PencilSimple, Crown, Trophy, Medal, ShieldCheck,
  X, Check, Warning,
} from '../../components/Icons';

interface Weights {
  id: number;
  w_amc_plan: string | number;
  w_compliance: string | number;
  w_timeliness: string | number;
  w_addons: string | number;
  w_ratings: string | number;
  w_water_tests: string | number;
  w_referrals: string | number;
  t_platinum: number;
  t_gold: number;
  t_silver: number;
  t_bronze: number;
  updated_at?: string;
}

interface CustomerRow {
  user_id: string;
  score: number;
  badge: string;
  rationale?: string;
  streak_days?: number;
  last_recalc_at?: string;
  full_name?: string;
  phone?: string;
  last_address?: string;
}

const WEIGHT_KEYS: (keyof Weights)[] = [
  'w_amc_plan', 'w_compliance', 'w_timeliness', 'w_addons',
  'w_ratings', 'w_water_tests', 'w_referrals',
];

const WEIGHT_LABELS: Record<string, string> = {
  w_amc_plan:    'AMC Plan',
  w_compliance:  'Compliance',
  w_timeliness:  'Timeliness',
  w_addons:      'Add-ons',
  w_ratings:     'Ratings',
  w_water_tests: 'Water Tests',
  w_referrals:   'Referrals',
};

const AdminEcoScoreScreen: React.FC = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation<any>();
  const scrollRef = useWebScrollFix();

  const [weights, setWeights] = useState<Weights | null>(null);
  const [top, setTop] = useState<CustomerRow[]>([]);
  const [bottom, setBottom] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [wRes, tRes, bRes] = await Promise.all([
        ecoScoreAPI.getWeights() as any,
        ecoScoreAPI.getTopCustomers(20) as any,
        ecoScoreAPI.getBottomCustomers(20) as any,
      ]);
      setWeights(wRes?.data?.weights || null);
      setTop(tRes?.data?.top || []);
      setBottom(bRes?.data?.bottom || []);
    } catch (_) { /* swallow — UI shows empty state */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRecalcAll = async () => {
    setRecalcing(true);
    try {
      const res: any = await ecoScoreAPI.recalcAll();
      const r = res?.data || {};
      Alert.alert(
        'Recalculation complete',
        `Total: ${r.total ?? '?'}   OK: ${r.ok ?? '?'}   Fail: ${r.fail ?? '?'}`
      );
      await load(true);
    } catch (e: any) {
      Alert.alert('Recalculation failed', e?.message || 'Unknown error');
    } finally {
      setRecalcing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const w = weights;
  const weightBars: Bar[] = w ? WEIGHT_KEYS.map((k) => ({
    label: WEIGHT_LABELS[k] || k,
    value: Math.round(Number(w[k] || 0) * 100),
    max: 100,
  })) : [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <MisHeader
        title="EcoScore Manager"
        subtitle="Tune the engine, recompute, drill down"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          Platform.OS !== 'web'
            ? <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} />
            : undefined
        }
      >
        {/* Recalculate */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onRecalcAll}
          disabled={recalcing}
          style={[styles.recalcBtn, { opacity: recalcing ? 0.5 : 1 }]}
        >
          {recalcing
            ? <ActivityIndicator color={C.primaryFg} />
            : <ArrowsClockwise size={18} weight="bold" color={C.primaryFg} />}
          <Text style={styles.recalcBtnText}>
            {recalcing ? 'Recalculating…' : 'Recalculate All EcoScores'}
          </Text>
        </TouchableOpacity>

        {/* Weights */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Current Weights</Text>
          <TouchableOpacity onPress={() => setShowEdit(true)} style={styles.editBtn}>
            <PencilSimple size={14} color={C.primary} weight="bold" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {w ? (
            <Bars bars={weightBars} formatValue={(n) => `${n}%`} />
          ) : (
            <Text style={styles.emptyText}>Weights not loaded.</Text>
          )}
          {w ? (
            <View style={styles.thresholdRow}>
              <ThresholdPill icon={<Crown size={12} weight="fill" color="#0B0B0B" />} label="Platinum" value={w.t_platinum} bg={C.platinum + '22'} fg={C.platinum} />
              <ThresholdPill icon={<Trophy size={12} weight="fill" color="#0B0B0B" />} label="Gold"     value={w.t_gold}     bg={C.gold + '22'}     fg={C.gold} />
              <ThresholdPill icon={<Medal size={12} weight="fill" color="#0B0B0B" />}  label="Silver"   value={w.t_silver}   bg={C.silver + '22'}   fg={C.silver} />
              <ThresholdPill icon={<ShieldCheck size={12} weight="fill" color="#0B0B0B" />} label="Bronze" value={w.t_bronze} bg={C.bronze + '22'} fg={C.bronze} />
            </View>
          ) : null}
        </View>

        {/* Top 20 */}
        <Text style={styles.sectionTitle}>Top 20 by EcoScore</Text>
        <View style={styles.card}>
          {top.length === 0 ? (
            <Text style={styles.emptyText}>No scored customers yet.</Text>
          ) : top.map((u) => <CustomerRowItem key={u.user_id} u={u} C={C} />)}
        </View>

        {/* Bottom 20 — outreach */}
        <Text style={styles.sectionTitle}>Bottom 20 — outreach list</Text>
        <View style={styles.card}>
          {bottom.length === 0 ? (
            <Text style={styles.emptyText}>No customers below threshold.</Text>
          ) : bottom.map((u) => <CustomerRowItem key={u.user_id} u={u} C={C} />)}
        </View>
      </ScrollView>

      {/* Edit-weights modal */}
      <EditWeightsModal
        visible={showEdit}
        weights={w}
        onClose={() => setShowEdit(false)}
        onSaved={async () => { setShowEdit(false); await load(true); }}
      />
    </View>
  );
};

const ThresholdPill: React.FC<{ icon: React.ReactNode; label: string; value: number; bg: string; fg: string }>
= ({ icon, label, value, bg, fg }) => (
  <View style={[pillStyles.pill, { backgroundColor: bg }]}>
    {icon}
    <Text style={[pillStyles.pillText, { color: fg }]}>{label} ≥ {value}</Text>
  </View>
);

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    marginRight: 6, marginBottom: 6,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
});

const CustomerRowItem: React.FC<{ u: CustomerRow; C: any }> = ({ u, C }) => {
  const dt = u.last_recalc_at ? new Date(u.last_recalc_at) : null;
  return (
    <View style={[customerStyles.row, { borderBottomColor: C.border }]}>
      <View style={[customerStyles.scoreCircle, { borderColor: badgeColor(u.badge, C) }]}>
        <Text style={[customerStyles.scoreNum, { color: badgeColor(u.badge, C) }]}>{u.score}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[customerStyles.name, { color: C.foreground }]} numberOfLines={1}>
          {u.full_name || 'Unnamed'}
        </Text>
        <Text style={[customerStyles.meta, { color: C.muted }]} numberOfLines={1}>
          {u.badge.toUpperCase()}{u.streak_days ? ` · ${u.streak_days}d streak` : ''}{dt ? ` · ${dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
        </Text>
      </View>
    </View>
  );
};

const customerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  scoreCircle: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: 14, fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2, fontWeight: '600' },
});

const badgeColor = (b: string, C: any) => {
  if (b === 'platinum') return C.platinum || C.foreground;
  if (b === 'gold')     return C.gold;
  if (b === 'silver')   return C.silver;
  if (b === 'bronze')   return C.bronze;
  return C.muted;
};

/* ── Edit-weights modal ─────────────────────────────────────────────── */
const EditWeightsModal: React.FC<{
  visible: boolean;
  weights: Weights | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ visible, weights, onClose, onSaved }) => {
  const C = useTheme();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible && weights) {
      const init: Record<string, string> = {};
      WEIGHT_KEYS.forEach((k) => { init[k as string] = String(Number(weights[k]) || 0); });
      setDraft(init);
    }
  }, [visible, weights]);

  const sum = WEIGHT_KEYS.reduce((s, k) => s + (parseFloat(draft[k as string]) || 0), 0);
  const valid = Math.abs(sum - 1) <= 0.001;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const payload: Record<string, number> = {};
      WEIGHT_KEYS.forEach((k) => { payload[k as string] = parseFloat(draft[k as string]) || 0; });
      await ecoScoreAPI.updateWeights(payload);
      onSaved();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not update weights.');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: 20, maxHeight: '90%',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.foreground, flex: 1 }}>
              Edit Weights
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={20} color={C.muted} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            Each weight is a fraction (e.g. 0.30 = 30%). Total must equal 1.00.
          </Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {WEIGHT_KEYS.map((k) => (
              <View key={k as string} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: C.foreground, fontWeight: '600', marginBottom: 6 }}>
                  {WEIGHT_LABELS[k as string]}
                </Text>
                <TextInput
                  value={draft[k as string]}
                  keyboardType="decimal-pad"
                  onChangeText={(v) => setDraft((d) => ({ ...d, [k as string]: v }))}
                  style={{
                    borderWidth: 1, borderColor: C.border, borderRadius: 10,
                    paddingHorizontal: 12, paddingVertical: 10,
                    fontSize: 14, color: C.foreground, backgroundColor: C.surfaceElevated,
                  }}
                />
              </View>
            ))}
          </ScrollView>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingVertical: 12,
            backgroundColor: valid ? C.successBg : C.warningBg,
            borderRadius: 10, paddingHorizontal: 12, marginTop: 4,
          }}>
            {valid
              ? <Check size={14} weight="bold" color={C.success} />
              : <Warning size={14} weight="fill" color={C.warning} />}
            <Text style={{ fontSize: 13, fontWeight: '700', color: valid ? C.success : C.warning, flex: 1 }}>
              Sum: {sum.toFixed(3)} {valid ? '— ready to save' : '— must equal 1.000'}
            </Text>
          </View>
          <TouchableOpacity
            disabled={!valid || saving}
            onPress={save}
            style={{
              backgroundColor: valid ? C.primary : C.muted,
              borderRadius: 12, paddingVertical: 14, alignItems: 'center',
              marginTop: 12, opacity: saving ? 0.6 : 1,
            }}
          >
            {saving
              ? <ActivityIndicator color={C.primaryFg} />
              : <Text style={{ color: C.primaryFg, fontWeight: '700', fontSize: 14 }}>Save Weights</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  recalcBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 18,
  },
  recalcBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginTop: 6, marginBottom: 10 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: C.primaryBg,
  },
  editBtnText: { color: C.primary, fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 18,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  thresholdRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 12 },
});

export default AdminEcoScoreScreen;
