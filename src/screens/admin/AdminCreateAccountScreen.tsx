/**
 * AdminCreateAccountScreen — super_admin-only screen for adding new admin
 * accounts (any role). Backend enforces super_admin check; this screen is
 * also gated client-side via the admin_role in the JWT.
 *
 * Spec: Master Prompt v2.0 PART 2.2.6.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminAuthAPI } from '../../services/api';
import useAuthStore from '../../store/auth.store';
import { useTheme } from '../../hooks/useTheme';
import WebContainer from '../../components/WebContainer';
import {
  ArrowLeft, Plus, ShieldCheck, CheckCircle, Warning, UserCircle, Trophy,
} from '../../components/Icons';

type AdminRole = 'super_admin' | 'ops_manager' | 'finance' | 'support' | 'read_only';

const ROLE_OPTIONS: { code: AdminRole; label: string; sub: string }[] = [
  { code: 'ops_manager', label: 'Ops Manager', sub: 'Assigns crews, cancels bookings, views MIS' },
  { code: 'finance',     label: 'Finance',     sub: 'Approves refunds, views payouts + MIS' },
  { code: 'support',     label: 'Support',     sub: 'Cancels bookings, views customer data' },
  { code: 'read_only',   label: 'Read-only',   sub: 'Views payouts + MIS + customer data — no actions' },
  { code: 'super_admin', label: 'Super Admin', sub: '⚠ Full control. Can create/deactivate other admins.' },
];

type AdminRow = {
  id: string;
  username: string;
  email: string;
  full_name: string;
  admin_role: AdminRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

export default function AdminCreateAccountScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const me = useAuthStore((s) => s.user);

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [adminRole, setAdminRole] = useState<AdminRole>('ops_manager');

  // Result modal: shown once after creation to display temp password
  const [createdResult, setCreatedResult] = useState<{ username: string; tempPassword: string } | null>(null);

  const loadAdmins = useCallback(async () => {
    setRefreshing(true);
    try {
      const r: any = await adminAuthAPI.listAccounts();
      setAdmins(r.data?.admins || []);
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not load admin list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const submit = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim()) {
      Alert.alert('Missing info', 'Name, username, and email are required.');
      return;
    }
    setSubmitting(true);
    try {
      // Leaving password empty → backend auto-generates a strong temp password
      // and returns it ONCE in the response. We show it to the operator.
      const r: any = await adminAuthAPI.createAccount({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        admin_role: adminRole,
      });
      const created = r.data?.admin || r.data;
      const temp = r.data?.temp_password;
      if (temp) {
        setCreatedResult({ username: created.username, tempPassword: temp });
      }
      // Reset form
      setFullName(''); setUsername(''); setEmail(''); setPhone('');
      setAdminRole('ops_manager'); setShowForm(false);
      await loadAdmins();
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Could not create admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async (admin: AdminRow) => {
    if (admin.id === me?.id) {
      Alert.alert('Not allowed', 'You cannot deactivate your own account.');
      return;
    }
    Alert.alert(
      'Deactivate admin?',
      `${admin.username} will be logged out of all devices and unable to sign in.`,
      [
        { text: 'Cancel' },
        {
          text: 'Deactivate', style: 'destructive',
          onPress: async () => {
            try {
              await adminAuthAPI.deactivateAccount(admin.id);
              await loadAdmins();
            } catch (e: any) {
              Alert.alert('Failed', e?.message || 'Could not deactivate.');
            }
          },
        },
      ],
    );
  };

  const revokeSessions = async (admin: AdminRow) => {
    try {
      await adminAuthAPI.revokeSessions(admin.id);
      Alert.alert('Done', `${admin.username} has been logged out of all devices.`);
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not revoke sessions.');
    }
  };

  const styles = makeStyles(C);

  // Gate: only super_admin can use this screen.
  if (me?.admin_role !== 'super_admin') {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Warning size={36} weight="duotone" color={C.muted} />
        <Text style={[styles.gateTitle, { color: C.foreground }]}>Super-admin only</Text>
        <Text style={[styles.gateSub, { color: C.muted }]}>
          Adding admin accounts is restricted to the super_admin role.
          Ask your super-admin if you need access.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.gateBtn}>
          <Text style={styles.gateBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.primary, C.primary || '#0369A1']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
            <ArrowLeft size={20} color="#fff" weight="bold" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Admin Accounts</Text>
            <Text style={styles.headerSub}>{admins.length} account{admins.length === 1 ? '' : 's'} · super_admin: {me?.username}</Text>
          </View>
          {!showForm && (
            <TouchableOpacity onPress={() => setShowForm(true)} style={styles.headerCta} activeOpacity={0.85}>
              <Plus size={16} weight="bold" color={C.primary || '#0369A1'} />
              <Text style={styles.headerCtaText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAdmins} />}
      >
        <WebContainer variant="narrow">
        {/* Created-result banner (shown after a successful create) */}
        {createdResult && (
          <View style={styles.resultBox}>
            <CheckCircle size={20} weight="fill" color={C.success || '#22C55E'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>Account created — share these securely</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Username</Text>
                <Text style={styles.resultValue}>{createdResult.username}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Temp password</Text>
                <Text style={[styles.resultValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>{createdResult.tempPassword}</Text>
              </View>
              <Text style={styles.resultWarning}>
                This is the only time you will see this password. Share via a secure channel.
                The admin must change it on first login.
              </Text>
              <TouchableOpacity onPress={() => setCreatedResult(null)} style={styles.resultDismiss}>
                <Text style={styles.resultDismissText}>Got it — dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Create form (toggleable) */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New admin account</Text>

            <Text style={styles.label}>FULL NAME *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} placeholder="Ramesh Kumar" placeholderTextColor={C.muted}
                value={fullName} onChangeText={setFullName} />
            </View>

            <Text style={styles.label}>USERNAME *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} placeholder="ramesh.admin" placeholderTextColor={C.muted}
                value={username} onChangeText={setUsername} autoCapitalize="none" />
            </View>

            <Text style={styles.label}>EMAIL *</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} placeholder="ramesh@ozonewash.in" placeholderTextColor={C.muted}
                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <Text style={styles.label}>PHONE (optional, emergency only)</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} placeholder="9876543210" placeholderTextColor={C.muted}
                value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={15} />
            </View>

            <Text style={styles.label}>ROLE</Text>
            <View style={{ gap: 8, marginBottom: 14 }}>
              {ROLE_OPTIONS.map((r) => {
                const active = r.code === adminRole;
                return (
                  <TouchableOpacity
                    key={r.code}
                    onPress={() => setAdminRole(r.code)}
                    style={[styles.roleCard, active && styles.roleCardActive]}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.roleRadio, active && { borderColor: C.primary }]}>
                      {active && <View style={[styles.roleRadioDot, { backgroundColor: C.primary }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roleLabel}>{r.label}</Text>
                      <Text style={styles.roleSub}>{r.sub}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.formHelper}>
              A strong temp password will be auto-generated. You'll see it once on
              the next screen — share it securely with the new admin.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.btnSecondary} activeOpacity={0.85}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submit}
                disabled={submitting}
                style={[styles.btnPrimary, submitting && { opacity: 0.6 }]}
                activeOpacity={0.85}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Create account</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Admin list */}
        <Text style={styles.listTitle}>All admins</Text>
        {admins.map((a) => (
          <View key={a.id} style={[styles.adminCard, !a.is_active && { opacity: 0.5 }]}>
            <View style={styles.adminAvatar}>
              {a.admin_role === 'super_admin'
                ? <ShieldCheck size={20} weight="fill" color={C.primary || '#0369A1'} />
                : <UserCircle size={22} weight="duotone" color={C.primary || '#0369A1'} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminName}>
                {a.full_name} {a.id === me?.id ? '(you)' : ''}
              </Text>
              <Text style={styles.adminMeta}>{a.username} · {a.email}</Text>
              <View style={styles.adminRoleRow}>
                <View style={[styles.rolePill, a.admin_role === 'super_admin' && { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                  <Text style={[styles.rolePillText, a.admin_role === 'super_admin' && { color: '#B45309' }]}>
                    {a.admin_role.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                {!a.is_active && (
                  <View style={[styles.rolePill, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.rolePillText, { color: '#991B1B' }]}>DEACTIVATED</Text>
                  </View>
                )}
              </View>
              {a.last_login_at && (
                <Text style={styles.adminLast}>Last login: {new Date(a.last_login_at).toLocaleString()}</Text>
              )}
            </View>
            {a.is_active && a.id !== me?.id && (
              <View style={{ gap: 6 }}>
                <TouchableOpacity onPress={() => revokeSessions(a)} style={styles.smallBtn} activeOpacity={0.85}>
                  <Text style={styles.smallBtnText}>Logout</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deactivate(a)} style={[styles.smallBtn, styles.smallBtnDanger]} activeOpacity={0.85}>
                  <Text style={[styles.smallBtnText, { color: '#991B1B' }]}>Deactivate</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        </WebContainer>
      </ScrollView>
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
  headerSub:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  headerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#fff',
  },
  headerCtaText: { color: C.primary || '#0369A1', fontWeight: '800', fontSize: 13 },

  body: { padding: 16, paddingBottom: 32, gap: 14 },

  resultBox: {
    flexDirection: 'row', gap: 12, padding: 16, borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1, borderColor: C.success || '#22C55E',
  },
  resultTitle: { fontSize: 14, fontWeight: '800', color: C.foreground, marginBottom: 10 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  resultLabel: { fontSize: 12, color: C.muted },
  resultValue: { fontSize: 13, fontWeight: '800', color: C.foreground },
  resultWarning: { fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 16, fontStyle: 'italic' },
  resultDismiss: {
    marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
    backgroundColor: C.surface, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: C.border,
  },
  resultDismissText: { fontSize: 12, fontWeight: '700', color: C.foreground },

  formCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: C.border,
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: C.foreground, marginBottom: 14 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: C.muted, marginBottom: 6, marginTop: 8 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  input: {
    flex: 1, fontSize: 14, color: C.foreground,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  formHelper: { fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 16, fontStyle: 'italic' },

  roleCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  roleCardActive: { borderColor: C.primary, backgroundColor: (C.primaryBg as any) || '#E0F2FE' },
  roleRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: C.border, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  roleRadioDot: { width: 8, height: 8, borderRadius: 4 },
  roleLabel: { fontSize: 13, fontWeight: '800', color: C.foreground },
  roleSub: { fontSize: 11, color: C.muted, marginTop: 2 },

  btnPrimary: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnSecondary: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { color: C.foreground, fontWeight: '700', fontSize: 14 },

  listTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: C.muted, marginTop: 8 },

  adminCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    padding: 14, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  adminAvatar: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: (C.primaryBg as any) || '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  adminName: { fontSize: 14, fontWeight: '800', color: C.foreground },
  adminMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  adminRoleRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  rolePill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: (C.primaryBg as any) || '#E0F2FE',
  },
  rolePillText: { fontSize: 9, fontWeight: '800', color: C.primary || '#0369A1', letterSpacing: 0.6 },
  adminLast: { fontSize: 10, color: C.muted, marginTop: 4 },

  smallBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: C.surfaceElevated || '#F4F8FB',
    borderWidth: 1, borderColor: C.border,
  },
  smallBtnDanger: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  smallBtnText: { fontSize: 11, fontWeight: '700', color: C.foreground },

  gateTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  gateSub: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, maxWidth: 320 },
  gateBtn: {
    marginTop: 22, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10,
    backgroundColor: C.primary,
  },
  gateBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
