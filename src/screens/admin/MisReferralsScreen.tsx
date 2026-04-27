/**
 * MisReferralsScreen — referral sources, tier breakdown, ROI uplift.
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
import { Buildings, TrendUp, CurrencyInr, Star } from '../../components/Icons';
import { MisReferrals, ReferralSourceType } from '../../types/mis';

const fmtRupees = (v: number) =>
  '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const sourceLabel: Record<ReferralSourceType, string> = {
  facilities_manager: 'Facilities Manager',
  watchman: 'Watchman',
  apartment_manager: 'Apartment Manager',
  society_secretary: 'Society Secretary',
  other: 'Other',
};

const MisReferralsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [range, setRange] = useState<QuickRange>('30d');
  const def = computeDefaultRange(30);
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);

  const [data, setData] = useState<MisReferrals | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = (await misAPI.getReferrals({ from, to })) as any;
        setData(res?.data || res);
      } catch (e: any) {
        setError(e?.message || 'Failed to load referrals data');
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
      <MisHeader title="Referrals" subtitle="Sources, tiers, ROI" onBack={() => navigation.goBack()} />

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
                label="Total Referrals"
                value={data.totalReferrals}
                color={C.primary}
                icon={<Buildings size={16} color={C.primary} />}
              />
              <KpiTile
                label="Conversion"
                value={`${Math.round(data.conversionPct)}%`}
                color={data.conversionPct >= 30 ? C.success : C.warning}
                icon={<TrendUp size={16} color={data.conversionPct >= 30 ? C.success : C.warning} />}
              />
              <KpiTile
                label="Incentives"
                value={fmtRupees(data.incentivesDisbursed)}
                color={C.warning}
                icon={<CurrencyInr size={16} color={C.warning} />}
              />
              <KpiTile
                label="ROI Uplift"
                value={`${data.roiUplift > 0 ? '+' : ''}${data.roiUplift.toFixed(1)}%`}
                color={data.roiUplift >= 0 ? C.success : C.danger}
                deltaPositive={data.roiUplift >= 0}
              />
            </View>

            <SectionTitle title="Tier Breakdown" />
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Donut
                  size={150}
                  thickness={20}
                  centerLabel="Tiers"
                  slices={[
                    { label: '1-3 jobs', value: data.tierBreakdown.tier1_3, color: C.bronze },
                    { label: '4-6 jobs', value: data.tierBreakdown.tier4_6, color: C.silver },
                    { label: '7+ jobs', value: data.tierBreakdown.tier7plus, color: C.gold },
                  ]}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  <TierRow color={C.bronze} label="1–3 jobs" value={data.tierBreakdown.tier1_3} C={C} />
                  <TierRow color={C.silver} label="4–6 jobs" value={data.tierBreakdown.tier4_6} C={C} />
                  <TierRow color={C.gold} label="7+ jobs" value={data.tierBreakdown.tier7plus} C={C} />
                </View>
              </View>
            </Card>

            <SectionTitle title="Top Sources" />
            {data.topSources.length === 0 ? (
              <Card><Text style={{ color: C.muted, fontSize: 12 }}>No top sources in range.</Text></Card>
            ) : (
              <Card>
                <Bars
                  bars={data.topSources.slice(0, 6).map((s) => ({
                    label: s.name,
                    value: s.score,
                    color: C.gold,
                  }))}
                />
                <View style={{ marginTop: 8, gap: 4 }}>
                  {data.topSources.slice(0, 3).map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Star size={12} color={C.gold} weight="fill" />
                      <Text style={{ fontSize: 12, color: C.foreground, fontWeight: '600' }}>
                        {s.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: C.muted }}>· {s.phone}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            <SectionTitle title="All Referral Sources" />
            <Card style={{ paddingHorizontal: 0, paddingVertical: 6 }}>
              <View style={[styles.row, styles.rowHead]}>
                <Text style={[styles.cell, { flex: 1.4, color: C.muted }]}>Name</Text>
                <Text style={[styles.cell, { flex: 0.6, textAlign: 'right', color: C.muted }]}>Jobs</Text>
                <Text style={[styles.cell, { flex: 0.6, textAlign: 'right', color: C.muted }]}>AMC</Text>
                <Text style={[styles.cell, { flex: 0.7, textAlign: 'right', color: C.muted }]}>Pts</Text>
              </View>
              {data.sources.length === 0 ? (
                <View style={{ padding: 14 }}>
                  <Text style={{ fontSize: 12, color: C.muted }}>No referral sources in range.</Text>
                </View>
              ) : (
                data.sources.slice(0, 12).map((s, i) => (
                  <View key={i} style={styles.row}>
                    <View style={{ flex: 1.4 }}>
                      <Text style={{ fontSize: 12, color: C.foreground, fontWeight: '600' }} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: C.muted }} numberOfLines={1}>
                        {sourceLabel[s.type]} · {s.phone}
                      </Text>
                    </View>
                    <Text style={[styles.cell, { flex: 0.6, textAlign: 'right', color: C.foreground }]}>
                      {s.jobs_acquired}
                    </Text>
                    <Text style={[styles.cell, { flex: 0.6, textAlign: 'right', color: C.foreground }]}>
                      {s.amcs_acquired}
                    </Text>
                    <Text style={[styles.cell, { flex: 0.7, textAlign: 'right', color: C.foreground, fontWeight: '700' }]}>
                      {s.points_earned}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <GapsPanel
              buckets={[
                { label: 'Inactive Societies', items: data.gaps.inactiveSocieties },
                { label: 'Unengaged Managers', items: data.gaps.unengagedManagers },
              ]}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const TierRow = ({ color, label, value, C }: { color: string; label: string; value: number; C: any }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
    <Text style={{ flex: 1, fontSize: 12, color: C.foreground }}>{label}</Text>
    <Text style={{ fontSize: 12, color: C.muted, fontWeight: '700' }}>{value}</Text>
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

export default MisReferralsScreen;
