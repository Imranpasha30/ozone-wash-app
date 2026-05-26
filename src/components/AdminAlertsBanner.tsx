/**
 * AdminAlertsBanner — surfaces backend-detected scheduling conflicts on the
 * admin dashboard. Polls /admin/alerts/count + /admin/alerts every 30 s, shows
 * a coloured banner when unacknowledged alerts exist, and lets the admin
 * dismiss each alert with a single tap.
 *
 * Alert types come from admin-alerts.service.js:
 *   slot_conflict    → warning (yellow)
 *   no_team_for_slot → critical (red)
 *   team_overcommit  → critical (red)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { adminAPI } from '../services/api';
import { Warning, X, ArrowRight } from './Icons';

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string | null;
  related_booking_id: string | null;
  related_job_id: string | null;
  related_team_id: string | null;
  acknowledged: boolean;
  created_at: string;
}

const AdminAlertsBanner: React.FC = () => {
  const C = useTheme();
  const navigation = useNavigation<any>();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [acking, setAcking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminAPI.getAlerts(true) as any;
      setAlerts(res.data?.alerts || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const ack = async (id: string) => {
    setAcking(id);
    try {
      await adminAPI.ackAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (_) {}
    finally { setAcking(null); }
  };

  if (loading && alerts.length === 0) return null;
  if (alerts.length === 0) return null;

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const tone = critical > 0 ? 'critical' : 'warning';
  const t = TONES[tone];

  const visible = expanded ? alerts : alerts.slice(0, 1);

  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: t.icon }]}>
          <Warning size={18} weight="fill" color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.fg }]}>
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} need attention
            {critical > 0 ? ` · ${critical} critical` : ''}
          </Text>
          <Text style={[styles.sub, { color: t.fg }]}>
            Tap an item to act, or dismiss once resolved.
          </Text>
        </View>
        {alerts.length > 1 && (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={10}>
            <Text style={[styles.toggle, { color: t.fg }]}>
              {expanded ? 'Collapse' : `Show all (${alerts.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {visible.map((a) => (
        <View key={a.id} style={[styles.alertRow, { borderColor: t.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { color: t.fg }]}>{a.title}</Text>
            {a.message ? (
              <Text style={[styles.alertMsg, { color: t.fg }]} numberOfLines={3}>
                {a.message}
              </Text>
            ) : null}
          </View>
          {a.related_booking_id && (
            <TouchableOpacity
              style={styles.openBtn}
              onPress={() => navigation.navigate('AdminBookings')}
              activeOpacity={0.7}
            >
              <Text style={[styles.openBtnText, { color: t.fg }]}>Open</Text>
              <ArrowRight size={14} weight="bold" color={t.fg} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => ack(a.id)}
            disabled={acking === a.id}
            activeOpacity={0.7}
          >
            {acking === a.id ? <ActivityIndicator size="small" color={t.fg} /> : <X size={16} weight="bold" color={t.fg} />}
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const TONES = {
  warning:  { bg: '#FEF3C7', border: '#F59E0B', fg: '#92400E', icon: '#D97706' },
  critical: { bg: '#FEE2E2', border: '#DC2626', fg: '#991B1B', icon: '#DC2626' },
};

const makeStyles = (C: any) => StyleSheet.create({
  banner: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    ...Platform.select({
      default: { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' } as any,
      android: { elevation: 2 },
    }),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700' },
  sub:   { fontSize: 11, marginTop: 2, opacity: 0.85 },
  toggle: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1,
  },
  alertTitle: { fontSize: 13, fontWeight: '700' },
  alertMsg:   { fontSize: 11, marginTop: 2, opacity: 0.9, lineHeight: 16 },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  openBtnText: { fontSize: 12, fontWeight: '700' },
  dismissBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});

export default AdminAlertsBanner;
