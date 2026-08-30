import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar, TextInput, Modal, Pressable,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { CurrencyInr, TrendUp, Receipt, Wrench, MagnifyingGlass, X } from '../../components/Icons';
import ScreenHeader from '../../components/ScreenHeader';
import WebContainer from '../../components/WebContainer';

const RANGES = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: '1y', label: '1 year', days: 365 },
];

const REASON_LABEL: Record<string, string> = {
  addon_upsell: 'Add-on upsell',
  high_ecoscore: 'High EcoScore',
  referral_bonus: 'Referral bonus',
  monthly_target: 'Monthly target',
  rating_bonus: 'Rating bonus',
  base_completion: 'Job completion',
  other: 'Other',
};

const AdminLedgerScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const [rangeKey, setRangeKey] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');        // filter txns by party / booking id
  const [selectedTx, setSelectedTx] = useState<any>(null); // tapped row → detail modal

  const fetchData = async (isRefresh = false, rk = rangeKey) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const days = (RANGES.find((r) => r.key === rk) || RANGES[1]).days;
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const toD = new Date();
    const fromD = new Date(toD.getTime() - (days - 1) * 86400000);
    try {
      const res = await adminAPI.getLedger({ from: iso(fromD), to: iso(toD), limit: 200 }) as any;
      setData(res.data || null);
    } catch (_) {} finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(false, rangeKey); }, [rangeKey]));

  const fmt = (paise: number) =>
    '₹' + (Math.abs(Number(paise) || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const s = data?.summary || {};
  const net = Number(s.net_paise || 0);
  const bonuses: any[] = data?.bonuses_by_reason || [];
  const txns: any[] = data?.transactions || [];
  const q = search.trim().toLowerCase();
  const filteredTxns = q
    ? txns.filter((t) => [t.party, t.ref, t.type, t.detail]
        .filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q)))
    : txns;

  const typeMeta = (t: string) => {
    if (t === 'refund') return { color: C.danger, Icon: Receipt, label: 'Refund' };
    if (t === 'crew_payout') return { color: C.warning, Icon: Wrench, label: 'Crew payout' };
    return { color: C.success, Icon: CurrencyInr, label: 'Payment' };
  };

  const fmtDate = (ts: string) => {
    try {
      return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return '—'; }
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={styles.body}
      refreshControl={Platform.OS !== 'web' ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} /> : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <ScreenHeader title="Ledger" subtitle="Money in & out" fallbackRoute="AdminDashboard" />

      <WebContainer variant="default">
        {/* Range selector */}
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangeChip, rangeKey === r.key && styles.rangeChipActive]}
              onPress={() => setRangeKey(r.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.rangeChipText, rangeKey === r.key && styles.rangeChipTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Net card */}
        <View style={[styles.netCard, { backgroundColor: net >= 0 ? C.primary : C.danger }]}>
          <Text style={styles.netLabel}>Net {net >= 0 ? 'inflow' : 'outflow'}</Text>
          <Text style={styles.netValue}>{net < 0 ? '−' : ''}{fmt(net)}</Text>
          <Text style={styles.netSub}>
            In {fmt(s.gross_in_paise)}  ·  Out {fmt(Number(s.refunds_out_paise || 0) + Number(s.crew_payouts_paise || 0))}
          </Text>
        </View>

        {/* Money in / out grid */}
        <View style={styles.grid}>
          <View style={styles.cell}>
            <TrendUp size={20} weight="regular" color={C.success} />
            <Text style={[styles.cellValue, { color: C.success }]}>{fmt(s.gross_in_paise)}</Text>
            <Text style={styles.cellLabel}>Money in ({s.payments_count || 0})</Text>
          </View>
          <View style={styles.cell}>
            <Receipt size={20} weight="regular" color={C.danger} />
            <Text style={[styles.cellValue, { color: C.danger }]}>−{fmt(s.refunds_out_paise)}</Text>
            <Text style={styles.cellLabel}>Refunds ({s.refunds_count || 0})</Text>
          </View>
          <View style={styles.cell}>
            <Wrench size={20} weight="regular" color={C.warning} />
            <Text style={[styles.cellValue, { color: C.warning }]}>−{fmt(s.crew_payouts_paise)}</Text>
            <Text style={styles.cellLabel}>Crew paid ({s.crew_payouts_count || 0})</Text>
          </View>
          <View style={styles.cell}>
            <CurrencyInr size={20} weight="regular" color={C.muted} />
            <Text style={[styles.cellValue, { color: C.foreground }]}>{fmt(s.pending_payouts_paise)}</Text>
            <Text style={styles.cellLabel}>Payout pending</Text>
          </View>
        </View>

        {/* GST line */}
        <View style={styles.gstRow}>
          <Text style={styles.gstLabel}>GST collected in this window</Text>
          <Text style={styles.gstValue}>{fmt(s.gst_collected_paise)}</Text>
        </View>

        {/* Bonus / incentive breakdown */}
        {bonuses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Crew incentives accrued</Text>
            <View style={styles.bonusCard}>
              {bonuses.map((b, i) => (
                <View key={b.reason} style={[styles.bonusRow, i < bonuses.length - 1 && styles.bonusDivider]}>
                  <Text style={styles.bonusReason}>{REASON_LABEL[b.reason] || b.reason}</Text>
                  <Text style={styles.bonusCount}>{b.count}</Text>
                  <Text style={styles.bonusAmt}>{fmt(b.amount_paise)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Unified transaction feed */}
        <Text style={styles.sectionTitle}>Transactions</Text>

        {/* Search by customer / booking id */}
        <View style={styles.searchWrap}>
          <MagnifyingGlass size={16} weight="bold" color={C.muted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search customer, booking id, type…"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} weight="bold" color={C.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {filteredTxns.length === 0 ? (
          <Text style={styles.empty}>{q ? 'No matching transactions.' : 'No transactions in this window.'}</Text>
        ) : (
          filteredTxns.map((t, i) => {
            const meta = typeMeta(t.type);
            const isIn = t.direction === 'in';
            const shortRef = t.ref ? String(t.ref).slice(0, 8).toUpperCase() : null;
            return (
              <TouchableOpacity key={i} style={styles.txCard} onPress={() => setSelectedTx(t)} activeOpacity={0.7}>
                <View style={[styles.txIcon, { backgroundColor: meta.color + '18' }]}>
                  <meta.Icon size={16} weight="bold" color={meta.color} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txParty} numberOfLines={1}>{t.party || '—'}</Text>
                  <Text style={styles.txMeta} numberOfLines={1}>
                    {meta.label}{t.detail ? ` · ${String(t.detail).toUpperCase()}` : ''} · {fmtDate(t.ts)}
                  </Text>
                  {shortRef ? <Text style={styles.txRef}>Booking #{shortRef}</Text> : null}
                </View>
                <Text style={[styles.txAmt, { color: isIn ? C.success : C.danger }]}>
                  {isIn ? '+' : '−'}{fmt(t.amount_paise)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </WebContainer>

      {/* Transaction detail */}
      <Modal visible={!!selectedTx} transparent animationType="fade" onRequestClose={() => setSelectedTx(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedTx(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedTx && (() => {
              const meta = typeMeta(selectedTx.type);
              const isIn = selectedTx.direction === 'in';
              const rows: [string, string][] = [
                ['Type', meta.label],
                ['Direction', isIn ? 'Money in' : 'Money out'],
                ['Amount', `${isIn ? '+' : '−'}${fmt(selectedTx.amount_paise)}`],
                ['Customer', selectedTx.party || '—'],
                ['Booking / ref', selectedTx.ref ? String(selectedTx.ref) : '—'],
                ['Detail', selectedTx.detail ? String(selectedTx.detail) : '—'],
                ['Date', fmtDate(selectedTx.ts)],
              ];
              return (
                <>
                  <View style={styles.modalHead}>
                    <View style={[styles.txIcon, { backgroundColor: meta.color + '18' }]}>
                      <meta.Icon size={16} weight="bold" color={meta.color} />
                    </View>
                    <Text style={styles.modalTitle}>{meta.label} details</Text>
                    <TouchableOpacity onPress={() => setSelectedTx(null)}><X size={16} weight="bold" color={C.muted} /></TouchableOpacity>
                  </View>
                  {rows.map(([k, v]) => (
                    <View key={k} style={styles.mRow}>
                      <Text style={styles.mKey}>{k}</Text>
                      <Text style={styles.mVal} selectable numberOfLines={2}>{v}</Text>
                    </View>
                  ))}
                  <Text style={styles.mHint}>Full booking info (service, tank, status) is on the Bookings tab — search the same customer or id there.</Text>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  body: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  rangeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, flexWrap: 'wrap' },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  rangeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  rangeChipText: { fontSize: 13, fontWeight: '600', color: C.foreground },
  rangeChipTextActive: { color: C.primaryFg, fontWeight: '700' },
  netCard: {
    margin: 16, borderRadius: 20, padding: 22, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  netLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  netValue: { fontSize: 36, fontWeight: '800', color: '#FFF', marginTop: 4 },
  netSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  cell: {
    width: '47%', backgroundColor: C.surface, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cellValue: { fontSize: 20, fontWeight: '700' },
  cellLabel: { fontSize: 11, color: C.muted, textAlign: 'center' },
  gstRow: {
    marginHorizontal: 16, marginTop: 12, backgroundColor: C.surface, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: C.border,
  },
  gstLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  gstValue: { fontSize: 15, fontWeight: '700', color: C.foreground },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 22, marginBottom: 10 },
  bonusCard: { marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border },
  bonusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  bonusDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  bonusReason: { flex: 1, fontSize: 14, color: C.foreground, fontWeight: '600' },
  bonusCount: { fontSize: 12, color: C.muted, marginRight: 14 },
  bonusAmt: { fontSize: 14, fontWeight: '700', color: C.warning },
  txCard: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: C.surface, borderRadius: 14,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  txIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txParty: { fontSize: 14, fontWeight: '700', color: C.foreground },
  txMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  txRef: { fontSize: 10, color: C.primary, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  txAmt: { fontSize: 15, fontWeight: '800' },
  empty: { textAlign: 'center', color: C.muted, fontSize: 13, paddingVertical: 24 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12,
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.foreground, paddingVertical: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 440, backgroundColor: C.surface, borderRadius: 18, padding: 18 },
  modalHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: C.foreground },
  mRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  mKey: { fontSize: 13, color: C.muted, fontWeight: '600' },
  mVal: { flex: 1, fontSize: 13, color: C.foreground, fontWeight: '700', textAlign: 'right' },
  mHint: { fontSize: 11, color: C.muted, fontStyle: 'italic', marginTop: 12, lineHeight: 16 },
});

export default AdminLedgerScreen;
