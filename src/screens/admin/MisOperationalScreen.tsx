/**
 * MisOperationalScreen — jobs, SLA, checklist & digital compliance.
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
import { ChartBar, ShieldCheck, Wrench, Warning } from '../../components/Icons';
import { MisOperational } from '../../types/mis';

const MisOperationalScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [range, setRange] = useState<QuickRange>('30d');
  const def = computeDefaultRange(30);
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);

  const [data, setData] = useState<MisOperational | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = (await misAPI.getOperational({ from, to })) as any;
        const payload: MisOperational = res?.data || res;
        setData(payload);
      } catch (e: any) {
        setError(e?.message || 'Failed to load operational data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [from, to]
  );

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRangeChange = (r: QuickRange, f: string, t: string) => {
    setRange(r);
    setFrom(f);
    setTo(t);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <MisHeader title="Operational" subtitle="Jobs, SLA & compliance" onBack={() => navigation.goBack()} />

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
        <DateRangeFilter range={range} from={from} to={to} onChange={onRangeChange} />

        {loading ? (
          <Skeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchData()} />
        ) : data ? (
          <>
            <SectionTitle title="Jobs" />
            <View style={styles.grid}>
              <KpiTile label="Completed" value={data.jobs.completed} color={C.success}
                icon={<ShieldCheck size={16} color={C.success} />} />
              <KpiTile label="Pending" value={data.jobs.pending} color={C.warning}
                icon={<Wrench size={16} color={C.warning} />} />
              <KpiTile label="Overdue" value={data.jobs.overdue} color={C.danger}
                icon={<Warning size={16} color={C.danger} />} />
              <KpiTile label="Total" value={data.jobs.total} color={C.primary}
                icon={<ChartBar size={16} color={C.primary} />} />
            </View>

            <SectionTitle title="SLA Compliance" />
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Donut
                  size={140}
                  thickness={20}
                  centerLabel="SLA"
                  centerValue={`${Math.round(data.sla.compliancePct)}%`}
                  slices={[
                    { label: 'OK', value: data.sla.compliancePct, color: C.success },
                    { label: 'Breach', value: 100 - data.sla.compliancePct, color: C.danger },
                  ]}
                />
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.kpiInline}>
                    <Text style={[styles.kpiBig, { color: C.danger }]}>{data.sla.breachCount}</Text>
                    <Text style={styles.kpiLabel}>  breaches</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>
                    Top breaches:
                  </Text>
                  {data.sla.breaches.slice(0, 3).map((b) => (
                    <Text key={b.job_id} style={{ fontSize: 12, color: C.foreground }} numberOfLines={1}>
                      • {b.customer} — {b.hours_late}h late
                    </Text>
                  ))}
                  {data.sla.breaches.length === 0 ? (
                    <Text style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>None</Text>
                  ) : null}
                </View>
              </View>
            </Card>

            <SectionTitle title="Time & Quality" />
            <View style={styles.grid}>
              <KpiTile
                label="Avg Time / Job"
                value={`${data.avgMinutesPerJob} min`}
                color={data.avgMinutesPerJob <= data.benchmarkMinutes ? C.success : C.warning}
                hint={`Benchmark: ${data.benchmarkMinutes} min`}
              />
              <KpiTile
                label="First-Time Fix"
                value={`${Math.round(data.firstTimeFixRate * 100) / 100}%`}
                color={C.primary}
              />
              <KpiTile
                label="Checklist Compliance"
                value={`${Math.round(data.checklistCompliancePct)}%`}
                color={C.success}
              />
              <KpiTile
                label="Digital Compliance"
                value={`${Math.round(data.digitalCompliancePct)}%`}
                color={C.info}
              />
            </View>

            <SectionTitle title="Compliance Mix" />
            <Card>
              <Bars
                bars={[
                  { label: 'Checklist', value: data.checklistCompliancePct, max: 100, color: C.success },
                  { label: 'Digital Logs', value: data.digitalCompliancePct, max: 100, color: C.info },
                  { label: 'SLA', value: data.sla.compliancePct, max: 100, color: C.primary },
                ]}
                formatValue={(n) => `${Math.round(n)}%`}
              />
            </Card>

            <GapsPanel
              buckets={[
                { label: 'Missing Checklist Jobs', items: data.gaps.missingChecklistJobs },
                { label: 'Incomplete Logs', items: data.gaps.incompleteLogs },
                { label: 'Delayed Uploads', items: data.gaps.delayedUploads },
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
    kpiInline: { color: C.foreground },
    kpiBig: { fontSize: 22, fontWeight: '700' },
    kpiLabel: { fontSize: 12, color: C.muted },
  });

export default MisOperationalScreen;
