/**
 * MisEngagementScreen — wallet, redemption, top rewards, AMC renewals.
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
import { Wallet, Sparkle, ArrowsClockwise, Users } from '../../components/Icons';
import { MisEngagement } from '../../types/mis';

const fmtRupees = (v: number) =>
  '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const MisEngagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [range, setRange] = useState<QuickRange>('30d');
  const def = computeDefaultRange(30);
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);

  const [data, setData] = useState<MisEngagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = (await misAPI.getEngagement({ from, to })) as any;
        setData(res?.data || res);
      } catch (e: any) {
        setError(e?.message || 'Failed to load engagement data');
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
      <MisHeader title="Customer Engagement" subtitle="Wallet, rewards, AMC" onBack={() => navigation.goBack()} />

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
            <SectionTitle title="Wallet" />
            <View style={styles.grid}>
              <KpiTile
                label="Avg Balance"
                value={fmtRupees(data.wallet.avgBalance)}
                color={C.primary}
                icon={<Wallet size={16} color={C.primary} />}
              />
              <KpiTile
                label="Total Outstanding"
                value={fmtRupees(data.wallet.totalOutstanding)}
                color={C.warning}
                icon={<Wallet size={16} color={C.warning} />}
              />
            </View>

            <SectionTitle title="Points & Redemption" />
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Donut
                  size={150}
                  thickness={20}
                  centerLabel="Redeem"
                  centerValue={`${Math.round(data.redemption.redemptionPct)}%`}
                  slices={[
                    { label: 'Redeemed', value: data.redemption.pointsRedeemed, color: C.success },
                    {
                      label: 'Unredeemed',
                      value: Math.max(0, data.redemption.pointsAccrued - data.redemption.pointsRedeemed),
                      color: C.warning,
                    },
                  ]}
                />
                <View style={{ flex: 1, gap: 8 }}>
                  <KpiRow label="Accrued" value={data.redemption.pointsAccrued.toLocaleString('en-IN')} C={C} />
                  <KpiRow label="Redeemed" value={data.redemption.pointsRedeemed.toLocaleString('en-IN')} C={C} />
                  <KpiRow label="Rate" value={`${Math.round(data.redemption.redemptionPct)}%`} C={C} />
                </View>
              </View>
            </Card>

            <SectionTitle title="Top Rewards" />
            {data.topRewards.length === 0 ? (
              <Card><Text style={{ color: C.muted, fontSize: 12 }}>No reward redemptions in range.</Text></Card>
            ) : (
              <Card>
                <Bars
                  bars={data.topRewards.slice(0, 6).map((r) => ({
                    label: r.name,
                    value: r.redeemed_count,
                    color: C.primary,
                  }))}
                />
              </Card>
            )}

            <SectionTitle title="Referrals & AMC" />
            <View style={styles.grid}>
              <KpiTile
                label="Referral Points"
                value={data.referrals.pointsEarned.toLocaleString('en-IN')}
                color={C.info}
                icon={<Sparkle size={16} color={C.info} />}
              />
              <KpiTile
                label="New Customers"
                value={data.referrals.newCustomersAcquired}
                color={C.success}
                icon={<Users size={16} color={C.success} />}
              />
              <KpiTile
                label="AMC Renewal Rate"
                value={`${Math.round(data.amcRenewalRate)}%`}
                color={data.amcRenewalRate >= 70 ? C.success : C.warning}
                icon={<ArrowsClockwise size={16} color={data.amcRenewalRate >= 70 ? C.success : C.warning} />}
              />
            </View>

            <GapsPanel
              buckets={[
                { label: 'High Balance, Low Redemption', items: data.gaps.highBalanceLowRedemption },
                { label: 'Low AMC Renewals', items: data.gaps.lowAmcRenewals },
              ]}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const KpiRow = ({ label, value, C }: { label: string; value: string; C: any }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Text style={{ fontSize: 12, color: C.muted }}>{label}</Text>
    <Text style={{ fontSize: 12, color: C.foreground, fontWeight: '700' }}>{value}</Text>
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
  });

export default MisEngagementScreen;
