/**
 * AdminPayoutsScreen — monthly payout management for field-team incentives.
 *
 * Layout:
 *   • Month picker (prev / next / current)
 *   • Footer totals: paid / frozen / open (paise)
 *   • Per-agent rows: name, jobs, tier chip, amount, status, action button
 *   • Mark-paid modal with payment_ref + notes
 *   • Edit-rules modal
 *   • Export CSV (clipboard via expo-sharing if present, else log)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Platform, StatusBar,
  StyleSheet, ActivityIndicator, TouchableOpacity, Modal, TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useTheme } from '../../hooks/useTheme';
import { incentiveAPI } from '../../services/api';
import {
  MisHeader, Card, SectionTitle,
} from '../../components/charts/MisScaffold';
import KpiTile from '../../components/charts/KpiTile';
import {
  ArrowLeft, ArrowRight, CurrencyInr, Wallet, Lightning,
} from '../../components/Icons';

type Tier = 'platinum' | 'gold' | 'silver' | 'bronze';

interface Batch {
  id: string;
  agent_id: string;
  agent_name?: string;
  agent_phone?: string;
  month: string;
  total_paise: number;
  computed_total_paise?: number;
  status: 'open' | 'frozen' | 'paid' | 'cancelled';
  payment_ref?: string;
  notes?: string;
  paid_at?: string;
  current_tier?: Tier;
  jobs_completed?: number;
}

const fmtRupees = (paise: number) =>
  '₹' + Math.round((paise || 0) / 100).toLocaleString('en-IN');

const fmtMonthLabel = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const fmtMonthQuery = (d: Date) =>
  d.toISOString().slice(0, 7); // YYYY-MM

const tierColor = (t: Tier | undefined, C: any) => {
  if (t === 'platinum') return C.platinum;
  if (t === 'gold')     return C.gold;
  if (t === 'silver')   return C.silver;
  return C.bronze;
};

const statusColor = (s: Batch['status'], C: any) => {
  if (s === 'paid')      return C.success;
  if (s === 'frozen')    return C.warning;
  if (s === 'cancelled') return C.danger;
  return C.muted;
};

const AdminPayoutsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [monthCursor, setMonthCursor] = useState<Date>(new Date());
  const [data, setData] = useState<{ batches: Batch[]; totals: any; month: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mark-paid modal state
  const [payModalBatch, setPayModalBatch] = useState<Batch | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Rules modal state
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState<any>(null);
  const [rulesDraft, setRulesDraft] = useState<Record<string, string>>({});
  const [rulesTab, setRulesTab] = useState<'perjob' | 'weights' | 'tiers'>('perjob');

  const monthQuery = fmtMonthQuery(monthCursor);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = (await incentiveAPI.adminListPayouts(monthQuery)) as any;
      setData(res?.data || res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthQuery]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const shiftMonth = (delta: number) => {
    const d = new Date(monthCursor);
    d.setMonth(d.getMonth() + delta);
    setMonthCursor(d);
  };

  const onFreeze = async (b: Batch) => {
    try {
      await incentiveAPI.adminFreezeBatch(b.id);
      fetchData(true);
    } catch (e: any) {
      Alert.alert('Freeze failed', e?.message || 'Could not freeze batch.');
    }
  };

  const openPayModal = (b: Batch) => {
    setPayModalBatch(b);
    setPaymentRef('');
    setPayNotes('');
  };

  const submitPay = async () => {
    if (!payModalBatch) return;
    if (!paymentRef.trim()) {
      Alert.alert('Missing reference', 'Enter a payment reference (UPI / NEFT / txn id).');
      return;
    }
    setSubmitting(true);
    try {
      await incentiveAPI.adminMarkPaid(payModalBatch.id, paymentRef.trim(), payNotes.trim() || undefined);
      setPayModalBatch(null);
      fetchData(true);
    } catch (e: any) {
      Alert.alert('Mark-paid failed', e?.message || 'Could not record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const onReverse = (b: Batch) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = (window as any).confirm
        ? (window as any).confirm(`Reverse batch for ${b.agent_name || 'agent'}?`)
        : true;
      if (!ok) return;
      incentiveAPI.adminReverseBatch(b.id, 'Reversed via admin UI')
        .then(() => fetchData(true))
        .catch((e: any) => Alert.alert('Reverse failed', e?.message || ''));
      return;
    }
    Alert.alert(
      'Reverse batch?',
      `All linked incentives will be marked reversed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse', style: 'destructive',
          onPress: async () => {
            try {
              await incentiveAPI.adminReverseBatch(b.id, 'Reversed via admin UI');
              fetchData(true);
            } catch (e: any) {
              Alert.alert('Reverse failed', e?.message || '');
            }
          },
        },
      ]
    );
  };

  const exportCsv = async () => {
    if (!data?.batches?.length) return;
    const header = 'agent_name,agent_phone,tier,jobs_completed,amount_inr,status,payment_ref,paid_at';
    const rows = data.batches.map(b => [
      b.agent_name || '',
      b.agent_phone || '',
      b.current_tier || '',
      b.jobs_completed ?? 0,
      Math.round((b.total_paise || b.computed_total_paise || 0) / 100),
      b.status,
      b.payment_ref || '',
      b.paid_at || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    try {
      // expo-sharing is optional — guarded require
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sharing = require('expo-sharing');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const FileSystem = require('expo-file-system');
      const path = FileSystem.cacheDirectory + `payouts-${monthQuery}.csv`;
      await FileSystem.writeAsStringAsync(path, csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path);
        return;
      }
    } catch (_) {
      // fall through to clipboard / log
    }
    if (Platform.OS === 'web' && (navigator as any).clipboard?.writeText) {
      await (navigator as any).clipboard.writeText(csv);
      Alert.alert('Copied to clipboard', `${data.batches.length} rows.`);
      return;
    }
    console.log('[AdminPayouts.csv]', csv);
    Alert.alert('CSV ready', 'Logged to console. Install expo-sharing for native sharing.');
  };

  const openRules = async () => {
    setRulesOpen(true);
    setRulesTab('perjob');
    try {
      const res = (await incentiveAPI.adminGetRules()) as any;
      const r = res?.data?.rules || res?.rules;
      setRules(r);
      const draft: Record<string, string> = {};
      Object.keys(r || {}).forEach(k => { draft[k] = String(r[k]); });
      setRulesDraft(draft);
    } catch (e: any) {
      Alert.alert('Failed to load rules', e?.message || '');
    }
  };

  const saveRules = async () => {
    const editable = [
      // ── Tab 1: Per-job rewards (legacy) ────────────────────────────
      'base_completion_paise','addon_commission_pct',
      'rating_5_paise','rating_4_paise','rating_3_paise',
      'referral_bonus_paise',
      'multiplier_platinum','multiplier_gold','multiplier_silver','multiplier_bronze',
      'monthly_target_jobs','monthly_target_bonus_paise',
      'streak_bonus_paise','streak_threshold_months',
      'tier_platinum_paise','tier_gold_paise','tier_silver_paise',
      // ── Tab 2: Credit weights (PDF parameters, NUMERIC(4,3)) ───────
      'weight_turnover','weight_avg_time','weight_tat','weight_transactions',
      'weight_checklist','weight_ecoscore','weight_feedback','weight_addon',
      'weight_escalation',
      // ── Tab 3: Tier thresholds + benefits ──────────────────────────
      'tier_credits_platinum','tier_credits_gold','tier_credits_silver','tier_credits_bronze',
      'cash_bonus_pct_platinum','cash_bonus_pct_gold','cash_bonus_pct_silver',
      'leave_days_platinum','leave_days_gold',
      'benchmark_job_minutes',
    ];
    const fields: Record<string, number> = {};
    for (const k of editable) {
      const raw = rulesDraft[k];
      if (raw === undefined || raw === '') continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0) {
        Alert.alert('Invalid value', `${k}: must be a non-negative number.`);
        return;
      }
      fields[k] = v;
    }
    setSubmitting(true);
    try {
      await incentiveAPI.adminUpdateRules(fields);
      setRulesOpen(false);
      Alert.alert('Saved', 'Rules updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || '');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers for the tabbed rules modal ───────────────────────────────
  const setDraftField = (k: string, v: string) =>
    setRulesDraft(prev => ({ ...prev, [k]: v }));

  const draftNumber = (k: string, fallback?: number): number => {
    const raw = rulesDraft[k];
    if (raw === undefined || raw === '') return fallback ?? 0;
    const v = Number(raw);
    return Number.isFinite(v) ? v : (fallback ?? 0);
  };

  // Credit-weight keys for live "Sum: X.XX" indicator
  const WEIGHT_KEYS = [
    'weight_turnover','weight_avg_time','weight_tat','weight_transactions',
    'weight_checklist','weight_ecoscore','weight_feedback','weight_addon',
    'weight_escalation',
  ];
  const weightDefaults: Record<string, number> = {
    weight_turnover: 0.25, weight_avg_time: 0.10, weight_tat: 0.15,
    weight_transactions: 0.10, weight_checklist: 0.10, weight_ecoscore: 0.15,
    weight_feedback: 0.10, weight_addon: 0.05, weight_escalation: 0.05,
  };

  const weightSum = useMemo(() => {
    return WEIGHT_KEYS.reduce((s, k) => s + draftNumber(k, weightDefaults[k] ?? 0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesDraft]);

  const weightSumOk = Math.abs(weightSum - 1) < 0.0005;

  const totals = data?.totals || { paid_paise: 0, frozen_paise: 0, open_paise: 0 };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <MisHeader
        title="Field Agent Payouts"
        subtitle="Freeze, pay, and reverse monthly batches"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
          ) : undefined
        }
      >
        {/* Month picker */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthBtn}>
            <ArrowLeft size={20} color={C.foreground} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {fmtMonthLabel(data?.month || monthQuery + '-01')}
          </Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthBtn}>
            <ArrowRight size={20} color={C.foreground} />
          </TouchableOpacity>
        </View>

        {error ? (
          <Card style={{ marginBottom: 14 }}>
            <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text>
          </Card>
        ) : null}

        {/* Totals KPIs - horizontally scrollable so the 3rd tile is fully reachable
            on narrow screens. RNW's horizontal ScrollView occasionally fails to
            engage drag-scroll, so the contentContainer allows native flex layout
            and we set explicit minWidth on each tile to force overflow. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
          style={styles.kpiTrack}
        >
          <KpiTile
            label="Paid"
            value={fmtRupees(totals.paid_paise)}
            color={C.success}
            icon={<Wallet size={14} color={C.success} weight="fill" />}
            style={styles.kpiTile}
          />
          <KpiTile
            label="Frozen"
            value={fmtRupees(totals.frozen_paise)}
            color={C.warning}
            icon={<Lightning size={14} color={C.warning} weight="fill" />}
            style={styles.kpiTile}
          />
          <KpiTile
            label="Open"
            value={fmtRupees(totals.open_paise)}
            color={C.muted}
            icon={<CurrencyInr size={14} color={C.muted} weight="fill" />}
            style={styles.kpiTile}
          />
        </ScrollView>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={openRules} style={[styles.actionBtn, { borderColor: C.border }]}>
            <Text style={{ color: C.primary, fontWeight: '600' }}>Edit Rules</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={exportCsv} style={[styles.actionBtn, { borderColor: C.border }]}>
            <Text style={{ color: C.primary, fontWeight: '600' }}>Export CSV</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminAgentCredits', { month: monthQuery })}
            style={[styles.actionBtn, { borderColor: C.primary, backgroundColor: C.primary + '10' }]}
          >
            <Text style={{ color: C.primary, fontWeight: '700' }}>Agent Credit Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {/* Batch list */}
        <Card style={{ marginTop: 12 }}>
          <SectionTitle title={`Agents this month · ${data?.batches?.length || 0}`} />
          {(!data?.batches || data.batches.length === 0) ? (
            <Text style={{ color: C.muted, fontSize: 13 }}>
              No payout batches for this month yet. Batches are created lazily as agents accrue.
            </Text>
          ) : (
            data.batches.map(b => {
              const tColor = tierColor(b.current_tier, C);
              const sColor = statusColor(b.status, C);
              const amt = b.status === 'open'
                ? (b.computed_total_paise || 0)
                : (b.total_paise || 0);
              return (
                <View key={b.id} style={styles.batchRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.agentName} numberOfLines={1}>
                      {b.agent_name || 'Unnamed'}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.tierChip, { backgroundColor: tColor + '18' }]}>
                        <Text style={[styles.tierChipText, { color: tColor }]}>
                          {(b.current_tier || 'bronze').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.metaText}>{b.jobs_completed ?? 0} jobs</Text>
                      <View style={[styles.statusChip, { backgroundColor: sColor + '18' }]}>
                        <Text style={[styles.statusChipText, { color: sColor }]}>
                          {b.status}
                        </Text>
                      </View>
                    </View>
                    {b.payment_ref ? (
                      <Text style={styles.metaText}>Ref: {b.payment_ref}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.amount}>{fmtRupees(amt)}</Text>
                    {b.status === 'open' && amt > 0 ? (
                      <TouchableOpacity onPress={() => onFreeze(b)} style={[styles.smallBtn, { borderColor: C.warning }]}>
                        <Text style={{ color: C.warning, fontWeight: '700', fontSize: 12 }}>Freeze</Text>
                      </TouchableOpacity>
                    ) : null}
                    {b.status === 'frozen' ? (
                      <TouchableOpacity onPress={() => openPayModal(b)} style={[styles.smallBtn, { borderColor: C.success, backgroundColor: C.success + '10' }]}>
                        <Text style={{ color: C.success, fontWeight: '700', fontSize: 12 }}>Mark Paid</Text>
                      </TouchableOpacity>
                    ) : null}
                    {(b.status === 'frozen' || b.status === 'paid') ? (
                      <TouchableOpacity onPress={() => onReverse(b)} style={[styles.smallBtn, { borderColor: C.danger }]}>
                        <Text style={{ color: C.danger, fontWeight: '700', fontSize: 12 }}>Reverse</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>

      {/* Mark-paid modal */}
      <Modal
        visible={!!payModalBatch}
        transparent
        animationType="fade"
        onRequestClose={() => setPayModalBatch(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={styles.modalTitle}>
              Mark Paid · {payModalBatch?.agent_name}
            </Text>
            <Text style={styles.modalCaption}>
              {fmtRupees(payModalBatch?.total_paise || 0)} for {fmtMonthLabel(payModalBatch?.month || '')}
            </Text>
            <Text style={styles.label}>Payment reference *</Text>
            <TextInput
              value={paymentRef}
              onChangeText={setPaymentRef}
              placeholder="UPI ref / NEFT txn / cheque #"
              placeholderTextColor={C.muted}
              style={[styles.input, { color: C.foreground, borderColor: C.border }]}
            />
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              value={payNotes}
              onChangeText={setPayNotes}
              placeholder="Any internal notes…"
              placeholderTextColor={C.muted}
              multiline
              style={[styles.input, styles.inputMultiline, { color: C.foreground, borderColor: C.border }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setPayModalBatch(null)}
                style={[styles.modalBtn, { borderColor: C.border }]}
              >
                <Text style={{ color: C.foreground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitPay}
                disabled={submitting}
                style={[styles.modalBtn, { backgroundColor: C.success, opacity: submitting ? 0.6 : 1 }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {submitting ? 'Saving…' : 'Confirm Paid'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rules modal — tabbed: per-job rewards / credit weights / tier benefits */}
      <Modal
        visible={rulesOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRulesOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.rulesCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={styles.modalTitle}>Incentive Rules</Text>

            {/* Tab pills */}
            <View style={styles.tabRow}>
              {([
                { key: 'perjob',  label: 'Per-job rewards' },
                { key: 'weights', label: 'Credit weights' },
                { key: 'tiers',   label: 'Tiers & benefits' },
              ] as const).map(t => {
                const active = rulesTab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setRulesTab(t.key)}
                    style={[
                      styles.tabPill,
                      { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primary + '15' : 'transparent' },
                    ]}
                  >
                    <Text style={{
                      color: active ? C.primary : C.muted,
                      fontWeight: active ? '700' : '600',
                      fontSize: 12,
                    }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!rules ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {/* ─── TAB 1: Per-job rewards ─── */}
                {rulesTab === 'perjob' ? (
                  <View>
                    <Text style={styles.tabHelp}>
                      Per-job pay accrual rules — applied as agents complete jobs.
                    </Text>
                    {[
                      'base_completion_paise','addon_commission_pct',
                      'rating_5_paise','rating_4_paise','rating_3_paise',
                      'referral_bonus_paise',
                      'multiplier_platinum','multiplier_gold','multiplier_silver','multiplier_bronze',
                      'monthly_target_jobs','monthly_target_bonus_paise',
                      'streak_bonus_paise','streak_threshold_months',
                      'tier_platinum_paise','tier_gold_paise','tier_silver_paise',
                    ].map(k => (
                      <View key={k} style={{ marginBottom: 8 }}>
                        <Text style={styles.label}>{k}</Text>
                        <TextInput
                          value={String(rulesDraft[k] ?? '')}
                          onChangeText={(t) => setDraftField(k, t)}
                          keyboardType="numeric"
                          style={[styles.input, { color: C.foreground, borderColor: C.border }]}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* ─── TAB 2: Credit weights ─── */}
                {rulesTab === 'weights' ? (
                  <View>
                    <Text style={styles.tabHelp}>
                      Weights for the 9 PDF parameters. Each is NUMERIC(4,3); the nine must sum to 1.000.
                    </Text>
                    <View style={[styles.sumPill, {
                      borderColor: weightSumOk ? C.success : C.danger,
                      backgroundColor: (weightSumOk ? C.success : C.danger) + '15',
                    }]}>
                      <Text style={{
                        color: weightSumOk ? C.success : C.danger,
                        fontWeight: '700', fontSize: 12,
                      }}>
                        Sum: {weightSum.toFixed(3)} {weightSumOk ? '✓' : '✗'}
                      </Text>
                    </View>
                    {[
                      { k: 'weight_turnover',     label: 'Turnover (net of GST)',  def: 0.25 },
                      { k: 'weight_avg_time',     label: 'Avg Time Taken',         def: 0.10 },
                      { k: 'weight_tat',          label: 'TAT Compliance',         def: 0.15 },
                      { k: 'weight_transactions', label: 'Transactions',           def: 0.10 },
                      { k: 'weight_checklist',    label: '8-Step Checklist',       def: 0.10 },
                      { k: 'weight_ecoscore',     label: 'EcoScore Data Upload',   def: 0.15 },
                      { k: 'weight_feedback',     label: 'Customer Feedback',      def: 0.10 },
                      { k: 'weight_addon',        label: 'Add-on Conversion',      def: 0.05 },
                      { k: 'weight_escalation',   label: 'Zero Escalation',        def: 0.05 },
                    ].map(({ k, label, def }) => (
                      <View key={k} style={{ marginBottom: 8 }}>
                        <Text style={styles.label}>{label} <Text style={{ color: C.muted }}>· default {def}</Text></Text>
                        <TextInput
                          value={String(rulesDraft[k] ?? '')}
                          onChangeText={(t) => setDraftField(k, t)}
                          placeholder={String(def)}
                          placeholderTextColor={C.muted}
                          keyboardType="numeric"
                          style={[styles.input, { color: C.foreground, borderColor: C.border }]}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* ─── TAB 3: Tier thresholds + benefits ─── */}
                {rulesTab === 'tiers' ? (
                  <View>
                    <Text style={styles.tabHelp}>
                      Credit thresholds for each tier and the cash/leave benefits awarded monthly.
                    </Text>

                    <Text style={styles.subSection}>Credit thresholds</Text>
                    {[
                      { k: 'tier_credits_platinum', label: 'Platinum credits threshold', def: 800 },
                      { k: 'tier_credits_gold',     label: 'Gold credits threshold',     def: 600 },
                      { k: 'tier_credits_silver',   label: 'Silver credits threshold',   def: 400 },
                      { k: 'tier_credits_bronze',   label: 'Bronze credits threshold',   def: 200 },
                    ].map(({ k, label, def }) => (
                      <View key={k} style={{ marginBottom: 8 }}>
                        <Text style={styles.label}>{label} <Text style={{ color: C.muted }}>· default {def}</Text></Text>
                        <TextInput
                          value={String(rulesDraft[k] ?? '')}
                          onChangeText={(t) => setDraftField(k, t)}
                          placeholder={String(def)}
                          placeholderTextColor={C.muted}
                          keyboardType="numeric"
                          style={[styles.input, { color: C.foreground, borderColor: C.border }]}
                        />
                      </View>
                    ))}

                    <Text style={styles.subSection}>Cash bonus % (of turnover)</Text>
                    {[
                      { k: 'cash_bonus_pct_platinum', label: 'Platinum cash bonus %', def: 0.15 },
                      { k: 'cash_bonus_pct_gold',     label: 'Gold cash bonus %',     def: 0.10 },
                      { k: 'cash_bonus_pct_silver',   label: 'Silver cash bonus %',   def: 0.05 },
                    ].map(({ k, label, def }) => (
                      <View key={k} style={{ marginBottom: 8 }}>
                        <Text style={styles.label}>{label} <Text style={{ color: C.muted }}>· default {def}</Text></Text>
                        <TextInput
                          value={String(rulesDraft[k] ?? '')}
                          onChangeText={(t) => setDraftField(k, t)}
                          placeholder={String(def)}
                          placeholderTextColor={C.muted}
                          keyboardType="numeric"
                          style={[styles.input, { color: C.foreground, borderColor: C.border }]}
                        />
                      </View>
                    ))}

                    <Text style={styles.subSection}>Leave days</Text>
                    {[
                      { k: 'leave_days_platinum', label: 'Platinum leave days', def: 2 },
                      { k: 'leave_days_gold',     label: 'Gold leave days',     def: 1 },
                    ].map(({ k, label, def }) => (
                      <View key={k} style={{ marginBottom: 8 }}>
                        <Text style={styles.label}>{label} <Text style={{ color: C.muted }}>· default {def}</Text></Text>
                        <TextInput
                          value={String(rulesDraft[k] ?? '')}
                          onChangeText={(t) => setDraftField(k, t)}
                          placeholder={String(def)}
                          placeholderTextColor={C.muted}
                          keyboardType="numeric"
                          style={[styles.input, { color: C.foreground, borderColor: C.border }]}
                        />
                      </View>
                    ))}

                    <Text style={styles.subSection}>Benchmarks</Text>
                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.label}>Benchmark job minutes <Text style={{ color: C.muted }}>· default 60</Text></Text>
                      <TextInput
                        value={String(rulesDraft['benchmark_job_minutes'] ?? '')}
                        onChangeText={(t) => setDraftField('benchmark_job_minutes', t)}
                        placeholder="60"
                        placeholderTextColor={C.muted}
                        keyboardType="numeric"
                        style={[styles.input, { color: C.foreground, borderColor: C.border }]}
                      />
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setRulesOpen(false)}
                style={[styles.modalBtn, { borderColor: C.border }]}
              >
                <Text style={{ color: C.foreground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveRules}
                disabled={submitting}
                style={[styles.modalBtn, { backgroundColor: C.primary, opacity: submitting ? 0.6 : 1 }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {submitting ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  monthRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: C.foreground },
  kpiRow: { flexDirection: 'row', gap: 10, paddingRight: 16, paddingBottom: 4 },
  kpiTrack: { marginBottom: 8 },
  kpiTile:  { width: 160, flex: 0 as any, flexShrink: 0 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderWidth: 1, borderRadius: 10,
  },
  batchRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  agentName: { fontSize: 14, fontWeight: '700', color: C.foreground },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginTop: 4, flexWrap: 'wrap',
  },
  metaText: { fontSize: 12, color: C.muted },
  tierChip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  tierChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  statusChip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  statusChipText: { fontSize: 10, fontWeight: '700' },
  amount: { fontSize: 15, fontWeight: '800', color: C.foreground },
  smallBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modalCard: {
    width: '100%', maxWidth: 460, borderRadius: 16,
    padding: 16, borderWidth: 1,
  },
  rulesCard: { maxHeight: '90%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.foreground },
  modalCaption: { fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 8, flexWrap: 'wrap' },
  tabPill: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderRadius: 999,
  },
  tabHelp: { fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 16 },
  sumPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderRadius: 999,
    marginBottom: 10,
  },
  subSection: {
    fontSize: 11, color: C.foreground, fontWeight: '700',
    marginTop: 12, marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  label: { fontSize: 11, color: C.muted, marginTop: 8, marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13,
    backgroundColor: C.surfaceElevated,
  },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  modalActions: {
    flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
});

export default AdminPayoutsScreen;
