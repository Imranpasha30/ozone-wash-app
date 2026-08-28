import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useFocusEffect } from '@react-navigation/native';
import { invoiceAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { CurrencyInr, Receipt, FileText } from '../../components/Icons';
import ScreenHeader from '../../components/ScreenHeader';
import WebContainer from '../../components/WebContainer';

const num = (v: any) => Number(v) || 0;
const inr = (paise: any) => '₹' + (num(paise) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type RangeKey = '30d' | 'month' | 'fy';

const rangeFor = (key: RangeKey): { from: string; to: string; label: string } => {
  const now = new Date();
  const to = ymd(now);
  if (key === 'month') {
    return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to, label: 'This month' };
  }
  if (key === 'fy') {
    // Indian FY starts Apr 1
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: ymd(new Date(startYear, 3, 1)), to, label: 'This FY' };
  }
  const d = new Date(now); d.setDate(d.getDate() - 30);
  return { from: ymd(d), to, label: 'Last 30 days' };
};

const AdminTaxReportScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const [range, setRange] = useState<RangeKey>('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (key: RangeKey, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const r = rangeFor(key);
      const res = await invoiceAPI.taxSummary({ from: r.from, to: r.to }) as any;
      setData(res.data || null);
    } catch (_) {} finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(range); }, [range]));

  const totals = data?.totals || {};
  const r = rangeFor(range);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={styles.body}
      refreshControl={Platform.OS !== 'web' ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(range, true)} tintColor={C.primary} /> : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <ScreenHeader title="GST Tax Report" subtitle="CGST / SGST settlement" fallbackRoute="AdminDashboard" />

      <WebContainer variant="default">
        {/* Range chips */}
        <View style={styles.chips}>
          {(['30d', 'month', 'fy'] as RangeKey[]).map((k) => {
            const on = k === range;
            return (
              <TouchableOpacity key={k} style={[styles.chip, on && styles.chipOn]} onPress={() => setRange(k)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{rangeFor(k).label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.periodText}>{r.from} → {r.to}</Text>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
        ) : (
          <>
            {/* Total collected */}
            <View style={styles.totalCard}>
              <View style={styles.totalIconBox}>
                <CurrencyInr size={26} weight="bold" color={C.primaryFg} />
              </View>
              <Text style={styles.totalLabel}>Total collected (incl. GST)</Text>
              <Text style={styles.totalValue}>{inr(totals.total_paise)}</Text>
              <Text style={styles.totalSub}>{num(totals.invoice_count)} invoice{num(totals.invoice_count) !== 1 ? 's' : ''}</Text>
            </View>

            {/* Tax breakdown */}
            <View style={styles.grid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Taxable value</Text>
                <Text style={styles.statValue}>{inr(totals.taxable_value_paise)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>CGST (9%)</Text>
                <Text style={[styles.statValue, { color: C.primary }]}>{inr(totals.cgst_paise)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>SGST (9%)</Text>
                <Text style={[styles.statValue, { color: C.primary }]}>{inr(totals.sgst_paise)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total GST</Text>
                <Text style={[styles.statValue, { color: C.success }]}>{inr(num(totals.cgst_paise) + num(totals.sgst_paise))}</Text>
              </View>
            </View>

            {!data?.seller_gstin && (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>
                  Seller GSTIN is not configured (SELLER_GSTIN). Set it before filing — invoices currently print without it.
                </Text>
              </View>
            )}

            {/* By SAC */}
            {Array.isArray(data?.by_sac) && data.by_sac.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>By SAC code</Text>
                {data.by_sac.map((row: any) => (
                  <View key={row.sac_code} style={styles.row}>
                    <FileText size={18} weight="regular" color={C.muted} />
                    <Text style={styles.rowLabel}>SAC {row.sac_code}</Text>
                    <Text style={styles.rowCount}>{num(row.invoice_count)} inv</Text>
                    <Text style={styles.rowAmount}>{inr(row.total_paise)}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Daily breakdown */}
            {Array.isArray(data?.by_day) && data.by_day.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Daily breakdown</Text>
                {data.by_day.map((row: any) => (
                  <View key={row.day} style={styles.row}>
                    <Receipt size={18} weight="regular" color={C.muted} />
                    <Text style={styles.rowLabel}>{row.day}</Text>
                    <Text style={styles.rowCount}>{num(row.invoice_count)} inv</Text>
                    <Text style={styles.rowAmount}>{inr(row.total_paise)}</Text>
                  </View>
                ))}
              </>
            )}

            {num(totals.invoice_count) === 0 && (
              <View style={styles.emptyBox}>
                <Receipt size={40} weight="fill" color={C.muted} />
                <Text style={styles.emptyText}>No invoices issued in this period.</Text>
              </View>
            )}
          </>
        )}
      </WebContainer>
    </ScrollView>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  body: { paddingBottom: 40 },
  center: { padding: 40, alignItems: 'center' },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: C.muted },
  chipTextOn: { color: C.primaryFg },
  periodText: { fontSize: 12, color: C.muted, paddingHorizontal: 16, marginTop: 8 },
  totalCard: { margin: 16, backgroundColor: C.primary, borderRadius: 20, padding: 24, alignItems: 'center' },
  totalIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  totalValue: { fontSize: 34, fontWeight: '700', color: '#FFF', marginTop: 4 },
  totalSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  statCard: { width: '47%', backgroundColor: C.surface, borderRadius: 16, padding: 16, gap: 6, borderWidth: 1, borderColor: C.border },
  statLabel: { fontSize: 12, color: C.muted },
  statValue: { fontSize: 20, fontWeight: '700', color: C.foreground },
  warnBox: { margin: 16, backgroundColor: C.warningBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.warning },
  warnText: { fontSize: 12, color: C.warning, lineHeight: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  row: { marginHorizontal: 16, marginBottom: 8, backgroundColor: C.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: C.foreground },
  rowCount: { fontSize: 12, color: C.muted, marginRight: 10 },
  rowAmount: { fontSize: 15, fontWeight: '700', color: C.foreground },
  emptyBox: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 14, color: C.muted },
});

export default AdminTaxReportScreen;
