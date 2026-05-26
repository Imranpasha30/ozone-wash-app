/**
 * AdminInboxPanel — live activity panel for the admin dashboard.
 *
 * Polls /admin/alerts/inbox every 30 s and surfaces three primary buckets:
 *   1. Alerts        — scheduling conflicts, SLA breach, incidents, payments,
 *                      AMC, new bookings (admin_alerts table). Coloured by
 *                      severity (info/warning/critical).
 *   2. Job Requests  — field team waiting for admin approve / reject.
 *   3. Unassigned    — jobs in pipeline with no team yet (urgency rises as
 *                      slot approaches; coloured red if slot is in <1 h).
 *
 * Each row carries an action (Acknowledge / Approve / Assign / Open) so the
 * admin can resolve in-place without leaving the dashboard.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../utils/responsive';
import { adminAPI } from '../services/api';
import { confirm } from '../services/dialog';
import {
  Warning, X, ArrowRight, Bell, ShieldCheck, Wrench, Users, Hourglass,
  CheckCircle, Siren, CurrencyInr, Crown, Calendar, Sparkle, Car, Drop,
} from './Icons';

type Tab = 'alerts' | 'requests' | 'unassigned';

interface AlertRow {
  id: string; type: string; severity: 'info' | 'warning' | 'critical';
  title: string; message: string | null;
  related_booking_id: string | null; related_job_id: string | null;
  created_at: string;
}
interface RequestRow {
  request_id: string; requested_at: string;
  job_id: string; scheduled_at: string; job_type: string;
  team_name: string; team_phone: string; customer_name: string;
  tank_type: string | null; tank_size_litres: number | null; address: string | null;
  field_team_id: string | null; field_team_name: string | null;
}
interface UnassignedRow {
  job_id: string; scheduled_at: string; job_type: string;
  booking_id: string | null; created_at: string;
  customer_name: string; customer_phone: string;
  tank_type: string | null; tank_size_litres: number | null; address: string | null;
  vehicle_type: string | null; registration_number: string | null;
}

const TYPE_META: Record<string, { icon: any; label: string }> = {
  slot_conflict:     { icon: Calendar,    label: 'Slot conflict' },
  no_team_for_slot:  { icon: Users,       label: 'No team available' },
  team_overcommit:   { icon: Wrench,      label: 'Technician double-booked' },
  new_booking:       { icon: Sparkle,     label: 'New booking' },
  incident_reported: { icon: Siren,       label: 'Incident' },
  payment_pending:   { icon: CurrencyInr, label: 'Payment pending' },
  unassigned_aging:  { icon: Hourglass,   label: 'Job aging' },
  starting_soon:     { icon: Hourglass,   label: 'Starting soon · no team' },
  sla_breach:        { icon: Warning,     label: 'SLA breach' },
  amc_expiring:      { icon: Crown,       label: 'AMC expiring' },
  amc_expired:       { icon: Crown,       label: 'AMC expired' },
};

const AdminInboxPanel: React.FC = () => {
  const C = useTheme();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  // Right-rail kicks in only on truly wide screens. Below 1280 px (laptops at
  // narrower widths, tablets, all mobile) we render inline so the panel
  // doesn't collide with the dashboard content.
  const asRail = Platform.OS === 'web' && width >= 1280;
  const styles = useMemo(() => makeStyles(C, asRail), [C, asRail]);

  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('alerts');
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Keep the panel compact by default — show only the top 3 items per tab.
  // The admin can hit "Show all" to see everything; the list is still scrollable
  // inside the panel.
  const PREVIEW = 3;

  const load = useCallback(async () => {
    try {
      const res = await adminAPI.getInbox() as any;
      setAlerts(res.data?.alerts || []);
      setRequests(res.data?.requests || []);
      setUnassigned(res.data?.unassigned || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const total = alerts.length + requests.length + unassigned.length;

  const ackAlert = async (id: string) => {
    setBusy(id);
    try { await adminAPI.ackAlert(id); setAlerts((p) => p.filter((a) => a.id !== id)); }
    catch (_) {}
    finally { setBusy(null); }
  };

  const approveRequest = async (req: RequestRow) => {
    const target = req.field_team_name
      ? `Team ${req.field_team_name} (requested by ${req.team_name})`
      : req.team_name;
    const ok = await confirm({
      title: 'Approve request',
      message: req.field_team_name
        ? `Assign this job to Team ${req.field_team_name}? All team members will see it.`
        : `Assign this job to ${req.team_name}?`,
      confirmText: 'Approve',
    });
    if (!ok) return;
    setBusy(req.request_id);
    try { await adminAPI.approveJobRequest(req.request_id); await load(); }
    catch (_) {}
    finally { setBusy(null); }
  };

  const rejectRequest = async (req: RequestRow) => {
    const ok = await confirm({
      title: 'Reject request',
      message: `Reject ${req.team_name}'s request for this job?`,
      confirmText: 'Reject',
      destructive: true,
    });
    if (!ok) return;
    setBusy(req.request_id);
    try { await adminAPI.rejectJobRequest(req.request_id); await load(); }
    catch (_) {}
    finally { setBusy(null); }
  };

  if (loading && total === 0) return null;
  if (total === 0) {
    return (
      <View style={[styles.banner, { backgroundColor: C.successBg, borderColor: C.success }]}>
        <View style={[styles.iconWrap, { backgroundColor: C.success }]}>
          <CheckCircle size={18} weight="fill" color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.success }]}>All clear</Text>
          <Text style={[styles.sub, { color: C.success }]}>
            No alerts, pending requests, or unassigned jobs.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: critical > 0 ? '#DC2626' : C.border }]}>
      {/* Header with summary tiles for the 3 main areas */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: critical > 0 ? '#DC2626' : C.warning }]}>
          <Bell size={18} weight="fill" color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {total} item{total !== 1 ? 's' : ''} need attention
            {critical > 0 ? ` · ${critical} critical` : ''}
          </Text>
          <Text style={styles.sub}>Live activity · refreshes every 30 s</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {[
          { key: 'alerts',     label: 'Alerts',     count: alerts.length,     accent: '#DC2626' },
          { key: 'requests',   label: 'Requests',   count: requests.length,   accent: C.primary },
          { key: 'unassigned', label: 'Unassigned', count: unassigned.length, accent: C.warning },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, active && { backgroundColor: t.accent + '22', borderColor: t.accent }]}
              onPress={() => setTab(t.key as Tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, active && { color: t.accent }]}>{t.label}</Text>
              <View style={[styles.tabCount, active && { backgroundColor: t.accent }]}>
                <Text style={[styles.tabCountText, active && { color: '#fff' }]}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.list, expanded ? styles.listExpanded : null]}>
        {tab === 'alerts' && alerts.length === 0 && <EmptyMini text="No active alerts." C={C} />}
        {tab === 'alerts' && (expanded ? alerts : alerts.slice(0, PREVIEW)).map((a) => {
          const meta = TYPE_META[a.type] || { icon: Warning, label: a.type };
          const Icon = meta.icon;
          const sevColor = a.severity === 'critical' ? '#DC2626'
                          : a.severity === 'warning' ? '#D97706'
                          : C.primary;
          return (
            <View key={a.id} style={[styles.row, { borderLeftColor: sevColor }]}>
              <View style={[styles.rowIcon, { backgroundColor: sevColor + '18' }]}>
                <Icon size={16} weight="fill" color={sevColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{a.title}</Text>
                {a.message ? <Text style={styles.rowMsg} numberOfLines={2}>{a.message}</Text> : null}
                <Text style={styles.rowMeta}>{meta.label} · {timeAgo(a.created_at)}</Text>
              </View>
              {a.related_booking_id ? (
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('AdminBookings')} activeOpacity={0.7}>
                  <ArrowRight size={14} weight="bold" color={C.primary} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => ackAlert(a.id)}
                disabled={busy === a.id}
                activeOpacity={0.7}
              >
                {busy === a.id ? <ActivityIndicator size="small" color={C.muted} /> : <X size={14} weight="bold" color={C.muted} />}
              </TouchableOpacity>
            </View>
          );
        })}

        {tab === 'requests' && requests.length === 0 && <EmptyMini text="No pending requests." C={C} />}
        {tab === 'requests' && (expanded ? requests : requests.slice(0, PREVIEW)).map((r) => (
          <View key={r.request_id} style={[styles.row, { borderLeftColor: C.primary }]}>
            <View style={[styles.rowIcon, { backgroundColor: C.primaryBg }]}>
              <ShieldCheck size={16} weight="fill" color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {r.field_team_name
                  ? `Team ${r.field_team_name} requested a job`
                  : `${r.team_name} requested a job`}
              </Text>
              {r.field_team_name ? (
                <Text style={styles.rowMeta}>via {r.team_name}</Text>
              ) : null}
              <Text style={styles.rowMsg} numberOfLines={2}>
                {r.customer_name} · {r.job_type === 'auto_wash' ? 'Car wash' : `${r.tank_type?.toUpperCase()} ${r.tank_size_litres}L`} · {new Date(r.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.rowMeta}>Requested {timeAgo(r.requested_at)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.success + '22', borderColor: C.success }]}
              onPress={() => approveRequest(r)}
              disabled={busy === r.request_id}
              activeOpacity={0.8}
            >
              {busy === r.request_id ? <ActivityIndicator size="small" color={C.success} /> : (
                <Text style={[styles.actionBtnText, { color: C.success }]}>Approve</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.danger + '15', borderColor: C.danger, marginLeft: 6 }]}
              onPress={() => rejectRequest(r)}
              disabled={busy === r.request_id}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: C.danger }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        ))}

        {tab === 'unassigned' && unassigned.length === 0 && <EmptyMini text="Every job has a team." C={C} />}
        {tab === 'unassigned' && (expanded ? unassigned : unassigned.slice(0, PREVIEW)).map((u) => {
          const isAuto = u.job_type === 'auto_wash';
          const slot = new Date(u.scheduled_at);
          const urgent = slot.getTime() - Date.now() < 60 * 60 * 1000;
          const accent = urgent ? '#DC2626' : C.warning;
          return (
            <View key={u.job_id} style={[styles.row, { borderLeftColor: accent }]}>
              <View style={[styles.rowIcon, { backgroundColor: accent + '18' }]}>
                {isAuto ? <Car size={16} weight="fill" color={accent} /> : <Drop size={16} weight="fill" color={accent} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {u.customer_name} · {isAuto
                    ? `${(u.vehicle_type || 'vehicle').toUpperCase()} ${u.registration_number || ''}`
                    : `${(u.tank_type || 'tank').toUpperCase()} ${u.tank_size_litres ?? ''}L`}
                </Text>
                <Text style={styles.rowMsg} numberOfLines={1}>
                  Scheduled {slot.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  {urgent ? ' · URGENT (<1 h)' : ''}
                </Text>
                {u.address ? <Text style={styles.rowMeta} numberOfLines={1}>{u.address}</Text> : null}
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={() => navigation.navigate('AdminJobs')}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnText, { color: C.primaryFg }]}>Assign</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Show all / Collapse toggle — keeps the panel compact by default so it
          doesn't push the rest of the dashboard off-screen. */}
      {(() => {
        const visible = tab === 'alerts' ? alerts.length
                       : tab === 'requests' ? requests.length
                       : unassigned.length;
        if (visible <= PREVIEW) return null;
        return (
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, { color: C.primary }]}>
              {expanded ? 'Collapse' : `Show all ${visible}`}
            </Text>
          </TouchableOpacity>
        );
      })()}
    </View>
  );
};

const EmptyMini = ({ text, C }: { text: string; C: any }) => (
  <View style={{ paddingVertical: 18, alignItems: 'center' }}>
    <Text style={{ color: C.muted, fontSize: 12 }}>{text}</Text>
  </View>
);

const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

const makeStyles = (C: any, asRail: boolean) => StyleSheet.create({
  // On web large screens (>=768 px) the panel docks to the right edge as a
  // sticky sidebar (320 px wide, full viewport tall, scrolls independently).
  // On mobile/tablet it renders inline as a card at the top of the dashboard.
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
    ...(asRail ? ({
      position: 'fixed', top: 16, right: 16, width: 360, zIndex: 50,
      maxWidth: 360, margin: 0,
    } as any) : {}),
  },
  card: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    borderRadius: 16, borderWidth: 1,
    backgroundColor: C.surface,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    ...Platform.select({
      default: { boxShadow: '0 6px 16px rgba(0,0,0,0.06)' } as any,
      android: { elevation: 3 },
    }),
    ...(asRail ? ({
      // Right-rail sidebar. `position: fixed` is web-only so the panel stays
      // visible while the main dashboard scrolls underneath.
      position: 'fixed', top: 16, right: 16, width: 360, zIndex: 50,
      maxHeight: 'calc(100vh - 32px)',
      overflow: 'auto', margin: 0,
    } as any) : {}),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: C.foreground },
  sub:   { fontSize: 11, color: C.muted, marginTop: 2 },

  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    backgroundColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '600', color: C.muted },
  tabCount: {
    minWidth: 22, height: 18, paddingHorizontal: 6, borderRadius: 9,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  tabCountText: { fontSize: 10, fontWeight: '700', color: C.muted },

  list: { gap: 8 },
  // When the admin chooses "Show all", cap the list at a viewport-friendly
  // height and scroll inside. Prevents the panel from pushing the rest of
  // the dashboard off-screen.
  listExpanded: Platform.OS === 'web'
    ? ({ maxHeight: 360, overflow: 'auto' } as any)
    : { maxHeight: 360 },
  toggleRow: {
    paddingVertical: 10, paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border,
    marginTop: 8,
  },
  toggleText: { fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 10, backgroundColor: C.surfaceElevated,
    borderLeftWidth: 3,
  },
  rowIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: C.foreground },
  rowMsg:   { fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 14 },
  rowMeta:  { fontSize: 10, color: C.muted, marginTop: 2, fontStyle: 'italic' },
  iconBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface,
  },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
});

export default AdminInboxPanel;
