/**
 * AdminAutoWashScreen — admin dashboard for the Ozone Auto Wash module.
 * Spec: Master Prompt v2.0 PART 4 + Auto Wash Scope PDF Section 5.
 *
 * Sections:
 *   • Today's KPIs: washes (scheduled/in-progress/completed), revenue,
 *     avg ticket value, add-on conversion %, subscription MRR + active count,
 *     water saved cumulative
 *   • Upcoming jobs list with status and crew
 *   • Add-on conversion analytics (top sold)
 *   • EV fleet snapshot
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { autoWashAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  ArrowLeft, Car, Drop, Lightning, Leaf, Trophy, Wrench,
} from '../../components/Icons';

function rupees(paise?: number): string {
  if (!paise) return '₹0';
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

export default function AdminAutoWashScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [evUnits, setEvUnits] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [d, j, a, e]: any[] = await Promise.all([
        autoWashAPI.getActiveSubscription ? Promise.resolve(null) : Promise.resolve(null), // placeholder; not used here
        // Use raw fetch via apiAdmin endpoints
        (await import('../../services/api')).default.get('/auto-wash/admin/dashboard'),
        (await import('../../services/api')).default.get('/auto-wash/admin/jobs?limit=10'),
        (await import('../../services/api')).default.get('/auto-wash/admin/analytics/addons'),
      ]);
      // 'd' is unused placeholder
      setDashboard(j?.data?.today ? j.data : j); // first call result
      setJobs(a?.data?.jobs || []);
      setAnalytics(e?.data?.analytics || []);
    } catch (err: any) {
      // soft-fail; show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Cleaner re-fetch without the awkward import-in-Promise pattern above.
  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const api = (await import('../../services/api')).default;
      const [dashRes, jobsRes, anaRes, evRes]: any[] = await Promise.all([
        api.get('/auto-wash/admin/dashboard'),
        api.get('/auto-wash/admin/jobs?limit=10'),
        api.get('/auto-wash/admin/analytics/addons'),
        api.get('/auto-wash/admin/ev-units'),
      ]);
      setDashboard(dashRes?.data);
      setJobs(jobsRes?.data?.jobs || []);
      setAnalytics(anaRes?.data?.analytics || []);
      setEvUnits(evRes?.data?.ev_units || []);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const styles = makeStyles(C);

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const today = dashboard?.today || {};
  const subs  = dashboard?.subscriptions || {};

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.primary, C.primaryDk || '#0369A1']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
            <ArrowLeft size={20} color="#fff" weight="bold" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Auto Wash</Text>
            <Text style={styles.headerSub}>EV doorstep car hygiene · live ops</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
      >
        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <KpiCard label="Washes today" value={`${(today.scheduled || 0) + (today.in_progress || 0) + (today.completed || 0)}`} sub={`${today.completed || 0} done`} Icon={Car} C={C} />
          <KpiCard label="Revenue today" value={rupees(today.revenue_paise)} sub={`avg ${rupees(today.avg_ticket_paise)}`} Icon={Trophy} C={C} />
          <KpiCard label="Add-on conv" value={`${today.addon_conversion_pct || 0}%`} sub="of completed" Icon={Lightning} C={C} />
          <KpiCard label="Water saved" value={`${today.water_saved_litres || 0} L`} sub="today" Icon={Drop} C={C} accent="green" />
          <KpiCard label="Subscription MRR" value={rupees(subs.mrr_paise)} sub={`${subs.active_count || 0} active`} Icon={Leaf} C={C} accent="green" />
          <KpiCard label="EV fleet" value={`${evUnits.length}`} sub={`${evUnits.filter((e) => e.status === 'active').length} active`} Icon={Wrench} C={C} />
        </View>

        {/* Upcoming jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming jobs</Text>
          {jobs.length === 0 && <Text style={styles.empty}>No auto-wash jobs yet.</Text>}
          {jobs.map((j) => (
            <View key={j.id} style={styles.jobCard}>
              <View style={[styles.statusDot, {
                backgroundColor: j.status === 'completed' ? (C.leaf || '#22C55E') :
                                 j.status === 'in_progress' ? C.primary :
                                 j.status === 'cancelled' ? '#EF4444' : C.muted
              }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.jobCustomer}>
                  {j.customer_name || 'Customer'} · {j.customer_phone || ''}
                </Text>
                <Text style={styles.jobMeta}>
                  {(j.vehicle_type || '').replace('_', ' ').toUpperCase()} · {j.registration_number || '—'} · {j.service_package?.toUpperCase()}
                </Text>
                <Text style={styles.jobSub}>
                  {new Date(j.scheduled_at).toLocaleString()} · {j.crew_name ? `Crew: ${j.crew_name}` : 'Unassigned'}
                  {j.gated_community ? ' · GATED' : ''}
                </Text>
              </View>
              <Text style={styles.jobPrice}>{rupees(j.total_price_paise)}</Text>
            </View>
          ))}
        </View>

        {/* Add-on analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top add-ons sold</Text>
          {analytics.length === 0 && <Text style={styles.empty}>No add-on sales yet.</Text>}
          {analytics.slice(0, 8).map((a) => (
            <View key={a.addon_code} style={styles.analyticsRow}>
              <Text style={styles.analyticsName}>{a.addon_code.replace(/_/g, ' ')}</Text>
              <Text style={styles.analyticsCount}>{a.times_sold}× sold</Text>
            </View>
          ))}
        </View>

        {/* EV fleet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EV fleet</Text>
          {evUnits.length === 0 && <Text style={styles.empty}>No EV units registered yet. Add via /admin/ev-units.</Text>}
          {evUnits.map((u) => (
            <View key={u.id} style={styles.evCard}>
              <View style={[styles.evStatus, { backgroundColor: u.status === 'active' ? (C.leaf || '#22C55E') : u.status === 'charging' ? '#F59E0B' : C.muted }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.evCode}>{u.unit_code}</Text>
                <Text style={styles.evMeta}>{u.model.replace('_', ' ')} · {u.registration_number}</Text>
                {u.hub_location && <Text style={styles.evSub}>{u.hub_location}</Text>}
              </View>
              <Text style={[styles.evStatusText, { color: u.status === 'active' ? (C.leaf || '#22C55E') : C.muted }]}>
                {u.status.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function KpiCard({ label, value, sub, Icon, C, accent }: any) {
  const styles = makeStyles(C);
  return (
    <View style={[styles.kpiCard, accent === 'green' && { borderColor: C.leaf || '#22C55E' }]}>
      <View style={[styles.kpiIcon, accent === 'green' && { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
        <Icon size={18} weight="duotone" color={accent === 'green' ? (C.leaf || '#16A34A') : C.primaryDk || '#0369A1'} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 18, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },

  body: { padding: 16, paddingBottom: 32, gap: 16 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    flex: 1, minWidth: '47%',
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  kpiIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: (C.primaryBg as any) || '#E0F2FE',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  kpiValue: { fontSize: 20, fontWeight: '800', color: C.foreground, letterSpacing: -0.4 },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: C.muted, marginTop: 2 },
  kpiSub: { fontSize: 10, color: C.muted, marginTop: 2 },

  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.foreground, marginBottom: 4 },
  empty: { fontSize: 13, color: C.muted, fontStyle: 'italic' },

  jobCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  jobCustomer: { fontSize: 14, fontWeight: '700', color: C.foreground },
  jobMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  jobSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  jobPrice: { fontSize: 14, fontWeight: '800', color: C.primaryDk || '#0369A1' },

  analyticsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  analyticsName: { fontSize: 13, color: C.foreground, fontWeight: '600', textTransform: 'capitalize' },
  analyticsCount: { fontSize: 13, fontWeight: '800', color: C.primaryDk || '#0369A1' },

  evCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  evStatus: { width: 8, height: 8, borderRadius: 4 },
  evCode: { fontSize: 14, fontWeight: '800', color: C.foreground },
  evMeta: { fontSize: 12, color: C.muted, textTransform: 'capitalize' },
  evSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  evStatusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
