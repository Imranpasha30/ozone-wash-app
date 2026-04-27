/**
 * MisEcoScoreScreen — segment scores, badge mix, trend, feedback impact.
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
import { Star, Trophy } from '../../components/Icons';
import { MisEcoScore } from '../../types/mis';

const MisEcoScoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [range, setRange] = useState<QuickRange>('30d');
  const def = computeDefaultRange(30);
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);

  const [data, setData] = useState<MisEcoScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = (await misAPI.getEcoScore({ from, to })) as any;
        setData(res?.data || res);
      } catch (e: any) {
        setError(e?.message || 'Failed to load EcoScore data');
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
      <MisHeader title="EcoScore" subtitle="Sustainability KPIs" onBack={() => navigation.goBack()} />

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
            <SectionTitle title="Avg Score by Segment" />
            <Card>
              <Bars
                bars={[
                  { label: 'Domestic', value: data.avgScoreBySegment.domestic, max: 100, color: C.primary },
                  { label: 'Society', value: data.avgScoreBySegment.society, max: 100, color: C.success },
                  { label: 'Industrial', value: data.avgScoreBySegment.industrial, max: 100, color: C.warning },
                ]}
                formatValue={(n) => n.toFixed(1)}
              />
            </Card>

            <SectionTitle title="Badge Distribution" />
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Donut
                  size={160}
                  thickness={22}
                  centerLabel="Badges"
                  slices={[
                    { label: 'Platinum', value: data.badgeDistribution.platinum, color: C.platinum },
                    { label: 'Gold', value: data.badgeDistribution.gold, color: C.gold },
                    { label: 'Silver', value: data.badgeDistribution.silver, color: C.silver },
                    { label: 'Bronze', value: data.badgeDistribution.bronze, color: C.bronze },
                    { label: 'Unrated', value: data.badgeDistribution.unrated, color: C.surfaceHighlight },
                  ]}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <LegendRow color={C.platinum} label="Platinum" value={data.badgeDistribution.platinum} />
                  <LegendRow color={C.gold} label="Gold" value={data.badgeDistribution.gold} />
                  <LegendRow color={C.silver} label="Silver" value={data.badgeDistribution.silver} />
                  <LegendRow color={C.bronze} label="Bronze" value={data.badgeDistribution.bronze} />
                  <LegendRow color={C.surfaceHighlight} label="Unrated" value={data.badgeDistribution.unrated} />
                </View>
              </View>
            </Card>

            <SectionTitle title="Trend" />
            <Card>
              <Spark
                values={data.trend.map((t) => t.avg)}
                labels={data.trend.map((t) => t.month)}
                showAxisLabels
                width={300}
                height={64}
              />
              <Text style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
                Average EcoScore over time
              </Text>
            </Card>

            <SectionTitle title="Feedback & Streaks" />
            <View style={styles.grid}>
              <KpiTile
                label="Avg Rating"
                value={data.feedbackImpact.avgRating.toFixed(2)}
                color={C.warning}
                icon={<Star size={16} color={C.warning} weight="fill" />}
                hint={`${data.feedbackImpact.ratingsCount} reviews`}
              />
              <KpiTile
                label="Top Platinum Streak"
                value={data.streaks.topPlatinumStreak}
                color={C.platinum}
                icon={<Trophy size={16} color={C.platinum} />}
              />
              <KpiTile
                label="Top Agent Streak"
                value={data.streaks.topAgentStreak}
                color={C.success}
                icon={<Trophy size={16} color={C.success} />}
              />
            </View>

            <GapsPanel
              buckets={[
                { label: 'Low-Score Jobs', items: data.gaps.lowScoreJobs },
                { label: 'Repeat Bronze Customers', items: data.gaps.repeatBronzeCustomers },
                { label: 'Missing Reviews', items: data.gaps.missingReviews },
              ]}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const LegendRow = ({ color, label, value }: { color: string; label: string; value: number }) => {
  const C = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ flex: 1, fontSize: 12, color: C.foreground }}>{label}</Text>
      <Text style={{ fontSize: 12, color: C.muted, fontWeight: '700' }}>{value}</Text>
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
  });

export default MisEcoScoreScreen;
