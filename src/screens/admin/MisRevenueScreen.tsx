/**
 * MisRevenueScreen — agent turnover, tier distribution, incentives.
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
import { CurrencyInr, TrendUp, Medal } from '../../components/Icons';
import { MisRevenue, AgentTier } from '../../types/mis';

const fmtRupees = (v: number) =>
  '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const tierColor = (t: AgentTier, C: any) =>
  t === 'platinum' ? C.platinum : t === 'gold' ? C.gold : t === 'silver' ? C.silver : C.bronze;

const MisRevenueScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [range, setRange] = useState<QuickRange>('30d');
  const def = computeDefaultRange(30);
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);

  const [data, setData] = useState<MisRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = (await misAPI.getRevenue({ from, to })) as any;
        setData(res?.data || res);
      } catch (e: any) {
        setError(e?.message || 'Failed to load revenue data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [from, to]
  );

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const totalTurnover = useMemo(
    () => (data?.byAgent || []).reduce((sum, a) => sum + (a.turnover_ex_gst || 0), 0),
    [data]
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <MisHeader title="Revenue & Agents" subtitle="Turnover, tiers, incentives" onBack={() => navigation.goBack()} />

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
            <SectionTitle title="Headline" />
            <View style={styles.grid}>
              <KpiTile
                label="Total Turnover"
                value={fmtRupees(totalTurnover)}
                color={C.primary}
                icon={<CurrencyInr size={16} color={C.primary} />}
              />
              <KpiTile
                label="Incentives Paid"
                value={fmtRupees(data.incentivePayoutTotal)}
                color={C.success}
                icon={<Medal size={16} color={C.success} />}
              />
              <KpiTile
                label="Revenue Uplift"
                value={`${data.revenueUplift > 0 ? '+' : ''}${data.revenueUplift.toFixed(1)}%`}
                color={data.revenueUplift >= 0 ? C.success : C.danger}
                deltaPositive={data.revenueUplift >= 0}
                icon={<TrendUp size={16} color={data.revenueUplift >= 0 ? C.success : C.danger} />}
              />
            </View>

            <SectionTitle title="Tier Distribution" />
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Donut
                  size={150}
                  thickness={20}
                  centerLabel="Agents"
                  slices={[
                    { label: 'Platinum', value: data.tierDistribution.platinum, color: C.platinum },
                    { label: 'Gold', value: data.tierDistribution.gold, color: C.gold },
                    { label: 'Silver', value: data.tierDistribution.silver, color: C.silver },
                    { label: 'Bronze', value: data.tierDistribution.bronze, color: C.bronze },
                  ]}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  {(['platinum', 'gold', 'silver', 'bronze'] as AgentTier[]).map((t) => (
                    <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: tierColor(t, C) }} />
                      <Text style={{ flex: 1, fontSize: 12, color: C.foreground, textTransform: 'capitalize' }}>{t}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted }}>
                        {data.tierDistribution[t]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>

            <SectionTitle title="Top Agents by Turnover" />
            {(data.byAgent.length === 0) ? (
              <Card><Text style={{ color: C.muted, fontSize: 12 }}>No agent activity in range.</Text></Card>
            ) : (
              <Card>
                <Bars
                  bars={data.byAgent.slice(0, 8).map((a) => ({
                    label: a.name,
                    value: a.turnover_ex_gst,
                    color: tierColor(a.tier, C),
                  }))}
                  formatValue={(n) => fmtRupees(n)}
                />
              </Card>
            )}

            <SectionTitle title="Agent Detail" />
            <Card style={{ paddingVertical: 6, paddingHorizontal: 0 }}>
              <View style={[styles.row, styles.rowHead]}>
                <Text style={[styles.cell, { flex: 1.4, color: C.muted }]}>Agent</Text>
                <Text style={[styles.cell, { flex: 1, textAlign: 'right', color: C.muted }]}>Turnover</Text>
                <Text style={[styles.cell, { flex: 0.6, textAlign: 'right', color: C.muted }]}>Txns</Text>
                <Text style={[styles.cell, { flex: 0.8, textAlign: 'right', color: C.muted }]}>Up%</Text>
              </View>
              {data.byAgent.slice(0, 12).map((a) => (
                <View key={a.agent_id} style={styles.row}>
                  <View style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tierColor(a.tier, C) }} />
                    <Text style={{ fontSize: 12, color: C.foreground, fontWeight: '600' }} numberOfLines={1}>{a.name}</Text>
                  </View>
                  <Text style={[styles.cell, { flex: 1, textAlign: 'right', color: C.foreground }]}>
                    {fmtRupees(a.turnover_ex_gst)}
                  </Text>
                  <Text style={[styles.cell, { flex: 0.6, textAlign: 'right', color: C.foreground }]}>{a.transactions}</Text>
                  <Text style={[styles.cell, { flex: 0.8, textAlign: 'right', color: C.foreground }]}>
                    {Math.round(a.addon_conversion_pct)}%
                  </Text>
                </View>
              ))}
            </Card>

            <GapsPanel
              buckets={[
                { label: 'Low-Turnover Agents', items: data.gaps.lowTurnoverAgents },
                { label: 'Poor Upsell Agents', items: data.gaps.poorUpsellAgents },
                { label: 'Stuck at Bronze', items: data.gaps.stuckBronze },
              ]}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

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
    rowHead: {
      borderTopWidth: 0,
      paddingTop: 6,
      paddingBottom: 6,
    },
    cell: { fontSize: 12 },
  });

export default MisRevenueScreen;
