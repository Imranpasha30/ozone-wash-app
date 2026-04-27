/**
 * MisSalesScreen — funnel, revenue segments, CAC vs LTV, growth.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Platform, StatusBar, StyleSheet,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useTheme } from '../../hooks/useTheme';
import { misAPI } from '../../services/api';
import {
  MisHeader, DateRangeFilter, Skeleton, ErrorState, GapsPanel, SectionTitle, Card,
  computeDefaultRange, QuickRange,
} from '../../components/charts/MisScaffold';
import KpiTile from '../../components/charts/KpiTile';
import Donut from '../../components/charts/Donut';
import Bars from '../../components/charts/Bars';
import Spark from '../../components/charts/Spark';
import { TrendUp, CurrencyInr, Users } from '../../components/Icons';
import { MisSales } from '../../types/mis';

const fmtRupees = (v: number) =>
  '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const MisSalesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [range, setRange] = useState<QuickRange>('30d');
  const def = computeDefaultRange(30);
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);

  const [data, setData] = useState<MisSales | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = (await misAPI.getSales({ from, to })) as any;
        setData(res?.data || res);
      } catch (e: any) {
        setError(e?.message || 'Failed to load sales data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [from, to]
  );

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <MisHeader title="Sales" subtitle="Funnel, growth & profitability" onBack={() => navigation.goBack()} />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
          ) : undefined
        }
      >
        <DateRangeFilter
          range={range}
          from={from}
          to={to}
          onChange={(r, f, t) => { setRange(r); setFrom(f); setTo(t); }}
        />

        {loading ? (
          <Skeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchData()} />
        ) : data ? (
          <>
            <SectionTitle title="Lead Funnel" />
            <View style={styles.grid}>
              <KpiTile label="Leads" value={data.funnel.leads} color={C.primary}
                icon={<Users size={16} color={C.primary} />} />
              <KpiTile label="Converted" value={data.funnel.converted} color={C.success}
                icon={<TrendUp size={16} color={C.success} />} />
              <KpiTile label="Lost" value={data.funnel.lost} color={C.danger} />
              <KpiTile
                label="Conv. Rate"
                value={
                  data.funnel.leads > 0
                    ? `${Math.round((data.funnel.converted / data.funnel.leads) * 100)}%`
                    : '0%'
                }
                color={C.info}
              />
            </View>

            <SectionTitle title="Revenue Segments" />
            <Card>
              <Bars
                bars={[
                  { label: 'AMC Renewals', value: data.revenueSegments.amcRenewals, color: C.success },
                  { label: 'New Contracts', value: data.revenueSegments.newContracts, color: C.primary },
                  { label: 'Add-ons', value: data.revenueSegments.addons, color: C.warning },
                  { label: 'Partner', value: data.revenueSegments.partner, color: C.info },
                ]}
                formatValue={(n) => fmtRupees(n)}
              />
            </Card>

            <SectionTitle title="CAC vs LTV" />
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Donut
                  size={140}
                  thickness={20}
                  centerLabel="LTV/CAC"
                  centerValue={data.cacVsLtv.ratio.toFixed(2) + 'x'}
                  slices={[
                    { label: 'CAC', value: data.cacVsLtv.cac, color: C.warning },
                    { label: 'LTV', value: data.cacVsLtv.ltv, color: C.success },
                  ]}
                />
                <View style={{ flex: 1, gap: 8 }}>
                  <Row label="CAC" value={fmtRupees(data.cacVsLtv.cac)} color={C.warning} C={C} />
                  <Row label="LTV" value={fmtRupees(data.cacVsLtv.ltv)} color={C.success} C={C} />
                  <Row label="Ratio" value={`${data.cacVsLtv.ratio.toFixed(2)}x`} color={C.primary} C={C} />
                </View>
              </View>
            </Card>

            <SectionTitle title="Segment Profitability" />
            <Card>
              <Bars
                bars={[
                  { label: 'Domestic', value: data.segmentProfitability.domestic, color: C.primary },
                  { label: 'Society', value: data.segmentProfitability.society, color: C.success },
                  { label: 'Industrial', value: data.segmentProfitability.industrial, color: C.warning },
                ]}
                formatValue={(n) => fmtRupees(n)}
              />
            </Card>

            <SectionTitle title="Revenue Growth Trend" />
            <Card>
              <Spark
                values={data.growthTrend.map((g) => g.revenue)}
                labels={data.growthTrend.map((g) => g.month)}
                showAxisLabels
                width={300}
                height={70}
                color={C.success}
              />
              <Text style={{ marginTop: 6, fontSize: 11, color: C.muted }}>
                Cross-sell rate: {Math.round(data.crossSell.rate)}%
              </Text>
            </Card>

            <SectionTitle title="Sales Team Performance" />
            <Card style={{ paddingHorizontal: 0, paddingVertical: 6 }}>
              <View style={[styles.row, styles.rowHead]}>
                <Text style={[styles.cell, { flex: 1.2, color: C.muted }]}>Rep</Text>
                <Text style={[styles.cell, { flex: 1, textAlign: 'right', color: C.muted }]}>Target</Text>
                <Text style={[styles.cell, { flex: 1, textAlign: 'right', color: C.muted }]}>Achieved</Text>
                <Text style={[styles.cell, { flex: 0.6, textAlign: 'right', color: C.muted }]}>%</Text>
              </View>
              {data.salesTeam.length === 0 ? (
                <View style={{ padding: 14 }}>
                  <Text style={{ fontSize: 12, color: C.muted }}>No sales activity in range.</Text>
                </View>
              ) : (
                data.salesTeam.map((s, i) => (
                  <View key={i} style={styles.row}>
                    <Text style={[styles.cell, { flex: 1.2, color: C.foreground, fontWeight: '600' }]} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={[styles.cell, { flex: 1, textAlign: 'right', color: C.foreground }]}>
                      {fmtRupees(s.target)}
                    </Text>
                    <Text style={[styles.cell, { flex: 1, textAlign: 'right', color: C.foreground }]}>
                      {fmtRupees(s.achieved)}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        {
                          flex: 0.6,
                          textAlign: 'right',
                          color: s.pct >= 100 ? C.success : s.pct >= 70 ? C.warning : C.danger,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {Math.round(s.pct)}%
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <GapsPanel
              buckets={[
                { label: 'Declining Renewals', items: data.gaps.decliningRenewals },
                { label: 'High CAC Segments', items: data.gaps.highCacSegments },
                { label: 'Weak Upsell', items: data.gaps.weakUpsell },
              ]}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const Row = ({
  label, value, color, C,
}: { label: string; value: string; color: string; C: any }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
    <Text style={{ flex: 1, fontSize: 12, color: C.foreground }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: '700', color: C.foreground }}>{value}</Text>
  </View>
);

const makeStyles = (C: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.border,
    },
    rowHead: { borderTopWidth: 0, paddingTop: 6, paddingBottom: 6 },
    cell: { fontSize: 12 },
  });

export default MisSalesScreen;
