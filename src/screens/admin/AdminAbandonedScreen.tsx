/**
 * AdminAbandonedScreen — "Lost Leads" workbench.
 *
 * Shows customers who started the booking flow but left before placing the
 * order, with the exact step they abandoned ("Left at Step 2 — Date & time").
 * The team calls/WhatsApps the customer, then moves the lead through
 * pending → ongoing → solved. `handled_by` shows which admin claimed the
 * lead so two admins never chase the same customer.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Linking, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { funnelAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import ScreenHeader from '../../components/ScreenHeader';
import WebContainer from '../../components/WebContainer';
import {
  Phone, ChatCircle, Hourglass, CheckCircle, Clock, User,
} from '../../components/Icons';

type LeadStatus = 'pending' | 'ongoing' | 'solved';

interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  step_reached: number;
  step_name: string;
  draft: any;
  status: LeadStatus;
  handled_by: string | null;
  admin_note: string | null;
  last_activity_at: string;
  in_session: boolean;
}

const FILTERS: { label: string; value: LeadStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Ongoing', value: 'ongoing' },
  { label: 'Solved', value: 'solved' },
];

const timeAgo = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

const AdminAbandonedScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<{ pending: number; ongoing: number; solved: number; total: number } | null>(null);
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res: any = await funnelAPI.getAbandoned(filter === 'all' ? {} : { status: filter });
      const d = res.data?.data || res.data || {};
      setLeads(d.leads || []);
      setStats(d.stats || null);
    } catch { /* keep last data */ } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchLeads(); }, [fetchLeads]));

  const setStatus = async (lead: Lead, status: LeadStatus) => {
    setUpdating(lead.id);
    try {
      await funnelAPI.updateLead(lead.id, status);
      await fetchLeads();
    } catch { /* refetch keeps truth */ } finally {
      setUpdating(null);
    }
  };

  const call = (phone: string) => Linking.openURL(`tel:+91${phone}`).catch(() => {});
  const whatsapp = (phone: string, lead: Lead) => {
    const msg = encodeURIComponent(
      `Hi ${lead.customer_name || ''}! This is Ozone Wash. We noticed you were booking a tank cleaning but didn't finish. Can we help you complete it or answer any questions?`
    );
    Linking.openURL(`https://wa.me/91${phone}?text=${msg}`).catch(() => {});
  };

  const statusColor = (s: LeadStatus) =>
    s === 'solved' ? C.success : s === 'ongoing' ? C.warning : C.danger;

  const draftSummary = (d: any) => {
    if (!d) return null;
    const bits: string[] = [];
    if (Array.isArray(d.tanks)) {
      bits.push(typeof d.tanks === 'number' ? `${d.tanks} tank(s)` : `${d.tanks.length} tank(s)`);
      const first = d.tanks[0];
      if (first?.litres) bits.push(`${first.litres} L`);
      else if (typeof first === 'number') bits.push(`${first} L`);
    } else if (d.tanks) {
      bits.push(`${d.tanks} tank(s)`);
    }
    if (d.plan && d.plan !== 'one_time') bits.push(String(d.plan).replace('_', '-'));
    if (d.total) bits.push(`₹${Number(d.total).toLocaleString('en-IN')}`);
    return bits.join(' · ') || null;
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Lost Leads"
        subtitle={stats ? `${stats.pending} pending · ${stats.ongoing} ongoing · ${stats.solved} solved` : 'Abandoned bookings'}
      />
      <WebContainer variant="narrow">

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.filterText, active && { color: C.primaryFg }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : leads.length === 0 ? (
        <View style={styles.emptyBox}>
          <CheckCircle size={36} weight="duotone" color={C.success} />
          <Text style={styles.emptyText}>No abandoned bookings — every customer finished checkout 🎉</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {leads.map((lead) => (
            <View key={lead.id} style={styles.card}>
              {/* Top row: customer + status */}
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{lead.customer_name || 'Customer'}</Text>
                  <Text style={styles.phone}>+91 {lead.customer_phone}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor(lead.status) + '18', borderColor: statusColor(lead.status) }]}>
                  <Text style={[styles.statusText, { color: statusColor(lead.status) }]}>{lead.status.toUpperCase()}</Text>
                </View>
              </View>

              {/* Where they left + when */}
              <View style={styles.stepRow}>
                <Hourglass size={14} weight="fill" color={C.warning} />
                <Text style={styles.stepText}>
                  Left at Step {lead.step_reached} — {lead.step_name || 'Booking'}
                </Text>
                <Clock size={12} weight="regular" color={C.muted} />
                <Text style={styles.timeText}>{timeAgo(lead.last_activity_at)}</Text>
              </View>
              {lead.in_session && (
                <Text style={styles.inSession}>● Active in the last 15 min — may still be booking, wait before calling</Text>
              )}
              {draftSummary(lead.draft) && (
                <Text style={styles.draftText}>{draftSummary(lead.draft)}</Text>
              )}
              {lead.handled_by && (
                <View style={styles.handlerRow}>
                  <User size={12} weight="fill" color={C.primary} />
                  <Text style={styles.handlerText}>Handled by {lead.handled_by}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.contactBtn} onPress={() => call(lead.customer_phone)}>
                  <Phone size={15} weight="fill" color={C.primary} />
                  <Text style={styles.contactText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactBtn} onPress={() => whatsapp(lead.customer_phone, lead)}>
                  <ChatCircle size={15} weight="fill" color={C.success} />
                  <Text style={[styles.contactText, { color: C.success }]}>WhatsApp</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                {updating === lead.id ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <>
                    {lead.status === 'pending' && (
                      <TouchableOpacity style={[styles.stateBtn, { backgroundColor: C.warningBg }]} onPress={() => setStatus(lead, 'ongoing')}>
                        <Text style={[styles.stateBtnText, { color: C.warning }]}>Start Follow-up</Text>
                      </TouchableOpacity>
                    )}
                    {lead.status === 'ongoing' && (
                      <TouchableOpacity style={[styles.stateBtn, { backgroundColor: C.successBg }]} onPress={() => setStatus(lead, 'solved')}>
                        <Text style={[styles.stateBtnText, { color: C.success }]}>Mark Solved</Text>
                      </TouchableOpacity>
                    )}
                    {lead.status === 'solved' && (
                      <TouchableOpacity style={[styles.stateBtn, { backgroundColor: C.surfaceElevated }]} onPress={() => setStatus(lead, 'pending')}>
                        <Text style={[styles.stateBtnText, { color: C.muted }]}>Reopen</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      </WebContainer>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: C.surfaceElevated, borderWidth: 1, borderColor: C.border,
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 12.5, fontWeight: '700', color: C.muted },
  emptyBox: { alignItems: 'center', gap: 10, marginTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '700', color: C.foreground },
  phone: { fontSize: 12, color: C.muted, marginTop: 1 },
  statusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepText: { fontSize: 12.5, fontWeight: '600', color: C.foreground, flexShrink: 1 },
  timeText: { fontSize: 11, color: C.muted },
  inSession: { fontSize: 11, color: C.warning, marginTop: 4, fontWeight: '600' },
  draftText: { fontSize: 12, color: C.muted, marginTop: 4 },
  handlerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  handlerText: { fontSize: 11, color: C.primary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.surfaceElevated, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  contactText: { fontSize: 12, fontWeight: '700', color: C.primary },
  stateBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  stateBtnText: { fontSize: 12, fontWeight: '800' },
});

export default AdminAbandonedScreen;
