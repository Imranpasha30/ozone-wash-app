/**
 * AdminCustomerDetailScreen — full drill-in for one customer:
 *   - Profile + AMC badge if active
 *   - Lifetime stats: total spent, services done, bookings count, cancellations
 *   - Split tile: tank vs auto-wash count + spend
 *   - EcoScore tier (if available)
 *   - Recent activity (last 20 bookings/jobs)
 *
 * Reached by tapping any card on AdminCustomersScreen.
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Platform, TouchableOpacity, Linking,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../utils/responsive';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { confirm as showConfirm, alert as showAlert } from '../../services/dialog';
import ScreenHeader from '../../components/ScreenHeader';
import WebContainer from '../../components/WebContainer';
import {
  UserCircle, Phone, ChatCircle, CurrencyInr, CheckCircle, ClipboardText,
  XCircle, Crown, Drop, Car, Star, Trophy,
} from '../../components/Icons';

const rupees = (paise: number) =>
  '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const AdminCustomerDetailScreen = () => {
  const C = useTheme();
  const route = useRoute<any>();
  const customerId: string = route.params?.id;
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const { isLarge } = useResponsive();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminAPI.getCustomerStats(customerId) as any;
        setData(res.data || null);
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, [customerId]);

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Customer" fallbackRoute="AdminCustomers" />
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      </View>
    );
  }
  if (!data?.profile) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Customer" fallbackRoute="AdminCustomers" />
        <View style={styles.center}><Text style={{ color: C.muted }}>Customer not found.</Text></View>
      </View>
    );
  }

  const { profile, lifetime, tank, auto_wash, amc, ecoscore, recent } = data;
  const amcActive = amc && amc.status === 'active' && new Date(amc.end_date) > new Date();

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={profile.name || 'Customer'}
        subtitle={`Joined ${new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        fallbackRoute="AdminCustomers"
      />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }}>
        <WebContainer>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <UserCircle size={56} weight="fill" color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.name}>{profile.name || 'Customer'}</Text>
              {amcActive ? (
                <View style={styles.amcBadge}>
                  <Crown size={11} weight="fill" color={C.gold} />
                  <Text style={styles.amcBadgeText}>{amc.plan_type?.toUpperCase()} AMC</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.phone}>{profile.phone}</Text>
            {profile.email ? <Text style={styles.email}>{profile.email}</Text> : null}
          </View>
          <View style={{ gap: 8 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${profile.phone}`)} activeOpacity={0.7}>
              <Phone size={16} weight="fill" color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.successBg }]} onPress={() => Linking.openURL(`https://wa.me/91${profile.phone}`)} activeOpacity={0.7}>
              <ChatCircle size={16} weight="fill" color={C.success} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Role switcher — promote between Customer and Field Team. New
            signups default to 'customer'; this is how admins create agents. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account role</Text>
          <View style={styles.roleRow}>
            {(['customer', 'field_team'] as const).map((r) => {
              const active = profile.role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.rolePill, active && styles.rolePillActive]}
                  onPress={async () => {
                    if (active) return;
                    const ok = await showConfirm({
                      title: r === 'field_team' ? 'Promote to field team?' : 'Demote to customer?',
                      message: r === 'field_team'
                        ? 'They will get access to the field-team app, job board, and incentive ledger.'
                        : 'They will lose field-team access. Active team memberships and assigned jobs must be cleared first.',
                      confirmText: r === 'field_team' ? 'Promote' : 'Demote',
                      destructive: r === 'customer',
                    });
                    if (!ok) return;
                    try {
                      await adminAPI.setUserRole(profile.id, r);
                      setData((prev: any) => prev ? { ...prev, profile: { ...prev.profile, role: r } } : prev);
                    } catch (err: any) {
                      await showAlert({
                        title: 'Could not change role',
                        message: err?.response?.data?.message || err?.message || 'Try again.',
                      });
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.rolePillText, active && styles.rolePillTextActive]}>
                    {r === 'field_team' ? 'Field team' : 'Customer'}
                  </Text>
                  {active ? <CheckCircle size={14} weight="fill" color={C.primaryFg} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.helper}>
            New signups default to <Text style={{ fontWeight: '700' }}>Customer</Text>.
            Promote to Field team to give them access to the agent app and job board.
          </Text>
        </View>

        {/* Lifetime stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifetime stats</Text>
          <View style={[styles.grid, isLarge && { flexDirection: 'row', flexWrap: 'wrap' }]}>
            <Stat C={C} styles={styles} label="Revenue"     value={rupees(lifetime.total_spent_paise)} color={C.primary} icon={<CurrencyInr  size={20} weight="bold" color={C.primary} />} />
            <Stat C={C} styles={styles} label="Services"    value={String(lifetime.total_services)}    color="#16A34A"  icon={<CheckCircle  size={20} weight="bold" color="#16A34A" />} />
            <Stat C={C} styles={styles} label="Bookings"    value={String(lifetime.total_bookings)}    color="#7C3AED"  icon={<ClipboardText size={20} weight="bold" color="#7C3AED" />} />
            <Stat C={C} styles={styles} label="Cancellations" value={String(lifetime.cancellations)}    color={C.danger}  icon={<XCircle     size={20} weight="bold" color={C.danger} />} />
          </View>
        </View>

        {/* Service split */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By service type</Text>
          <View style={[styles.splitRow, isLarge && { flexDirection: 'row' }]}>
            <View style={[styles.splitCard, { borderColor: C.primary + '55' }]}>
              <View style={[styles.splitIcon, { backgroundColor: C.primaryBg }]}>
                <Drop size={22} weight="fill" color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.splitLabel}>Tank cleaning</Text>
                <Text style={styles.splitValue}>{rupees(tank.spent_paise)}</Text>
                <Text style={styles.splitMeta}>
                  {tank.completed} done · {tank.bookings} total
                </Text>
              </View>
            </View>
            <View style={[styles.splitCard, { borderColor: '#16A34A55' }]}>
              <View style={[styles.splitIcon, { backgroundColor: '#16A34A22' }]}>
                <Car size={22} weight="fill" color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.splitLabel}>Auto wash</Text>
                <Text style={styles.splitValue}>{rupees(auto_wash.spent_paise)}</Text>
                <Text style={styles.splitMeta}>
                  {auto_wash.completed} done · {auto_wash.bookings} total
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* AMC card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AMC membership</Text>
          {amc ? (
            <View style={[styles.amcCard, amcActive ? { borderColor: C.gold } : { borderColor: C.border }]}>
              <View style={[styles.amcIcon, { backgroundColor: amcActive ? C.goldBg : C.surfaceElevated }]}>
                <Crown size={22} weight="fill" color={amcActive ? C.gold : C.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.amcPlan}>{amc.plan_type?.toUpperCase()} PLAN</Text>
                <Text style={styles.amcMeta}>
                  {amcActive ? 'Active' : 'Inactive'} · Expires {new Date(amc.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                {amc.services_total != null ? (
                  <Text style={styles.amcMeta}>
                    {amc.services_availed ?? 0} / {amc.services_total} services used
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Not an AMC member.</Text>
            </View>
          )}
        </View>

        {/* EcoScore */}
        {ecoscore ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EcoScore</Text>
            <View style={styles.ecoCard}>
              <View style={styles.ecoIcon}>
                <Trophy size={22} weight="fill" color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ecoScore}>{ecoscore.score} <Text style={styles.ecoBadge}>· {ecoscore.badge?.toUpperCase()}</Text></Text>
                {ecoscore.rationale ? <Text style={styles.ecoRationale} numberOfLines={2}>{ecoscore.rationale}</Text> : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* Recent activity — capped height with internal scroll so the page
            stays a predictable length even for customers with 50+ bookings. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {recent.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No bookings yet.</Text>
            </View>
          ) : <View style={styles.activityScroll}>{recent.map((r: any) => {
            const isAuto = r.kind === 'auto_wash';
            return (
              <View key={r.kind + '-' + r.id} style={styles.activityRow}>
                <View style={[styles.actIcon, { backgroundColor: isAuto ? '#16A34A22' : C.primaryBg }]}>
                  {isAuto ? <Car size={14} weight="fill" color="#16A34A" /> : <Drop size={14} weight="fill" color={C.primary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.actTopRow}>
                    <Text style={styles.actLabel}>
                      {isAuto ? 'Auto wash' : 'Tank cleaning'}
                      {r.label ? ` · ${String(r.label).toUpperCase()}` : ''}
                    </Text>
                    <Text style={styles.actAmount}>{rupees(Number(r.amount_paise || 0))}</Text>
                  </View>
                  <Text style={styles.actMeta}>
                    {r.scheduled ? new Date(r.scheduled).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    {' · '}
                    <Text style={{ color: statusColor(r.status, C), fontWeight: '700' }}>{r.status?.toUpperCase()}</Text>
                  </Text>
                </View>
              </View>
            );
          })}</View>}
        </View>

        </WebContainer>
      </ScrollView>
    </View>
  );
};

const statusColor = (s: string, C: any) => {
  if (s === 'completed') return C.success;
  if (s === 'cancelled') return C.danger;
  if (s === 'in_progress') return C.warning;
  if (s === 'confirmed' || s === 'scheduled') return C.primary;
  return C.muted;
};

const Stat = ({ C, styles, label, value, color, icon }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>{icon}</View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: 16,
    padding: 16, marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: C.border,
  },
  avatar: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: C.foreground },
  phone: { fontSize: 13, color: C.muted, marginTop: 2 },
  email: { fontSize: 11, color: C.muted, marginTop: 1 },
  amcBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, backgroundColor: C.goldBg,
  },
  amcBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: C.gold },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },

  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10 },
  helper: { fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 16 },
  roleRow: { flexDirection: 'row', gap: 10 },
  rolePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  rolePillActive: { backgroundColor: C.primary, borderColor: C.primary },
  rolePillText: { fontSize: 13, fontWeight: '700', color: C.muted },
  rolePillTextActive: { color: C.primaryFg },

  grid: { gap: 10 },
  statCard: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, gap: 6,
    borderWidth: 1, borderColor: C.border,
    flexGrow: 1, minWidth: 140,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: C.foreground },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },

  splitRow: { gap: 12 },
  splitCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, borderWidth: 1,
  },
  splitIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  splitLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  splitValue: { fontSize: 20, fontWeight: '800', color: C.foreground, marginTop: 2 },
  splitMeta: { fontSize: 11, color: C.muted, marginTop: 2 },

  amcCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, borderWidth: 1,
  },
  amcIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  amcPlan: { fontSize: 14, fontWeight: '700', color: C.foreground },
  amcMeta: { fontSize: 12, color: C.muted, marginTop: 2 },

  ecoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.border,
  },
  ecoIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F59E0B22',
    alignItems: 'center', justifyContent: 'center',
  },
  ecoScore: { fontSize: 20, fontWeight: '800', color: C.foreground },
  ecoBadge: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  ecoRationale: { fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 14 },

  // Cap the activity feed at a fixed height with internal scroll on web —
  // prevents the detail page from growing unboundedly for power customers.
  activityScroll: Platform.OS === 'web'
    ? ({ maxHeight: 420, overflow: 'auto', paddingRight: 4 } as any)
    : { maxHeight: 420 },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  actIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actLabel: { fontSize: 13, fontWeight: '700', color: C.foreground },
  actAmount: { fontSize: 13, fontWeight: '700', color: C.foreground },
  actMeta: { fontSize: 11, color: C.muted, marginTop: 2 },

  empty: { padding: 16, alignItems: 'center' },
  emptyText: { fontSize: 12, color: C.muted, fontStyle: 'italic' },
});

export default AdminCustomerDetailScreen;
