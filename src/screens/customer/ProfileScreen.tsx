import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/auth.store';
import useSettingsStore, { FontScale } from '../../store/settings.store';
import { useTheme } from '../../hooks/useTheme';
import { authAPI, jobAPI } from '../../services/api';
import {
  ClipboardText, Trophy, FileText, Wrench,
  CaretRight, SignOut, Phone, User, Eye, EyeSlash, PencilSimple, Check, X,
  ShieldCheck, Medal, Crown,
} from '../../components/Icons';

type CertTier = { label: string; sub: string; color: string; bg: string; icon: React.ReactNode };

const getCertTier = (monthJobs: number, C: any): CertTier => {
  if (monthJobs >= 31) return { label: 'Gold Certified', sub: 'Expert technician · 31+ jobs/month', color: '#B45309', bg: '#FEF3C7', icon: <Crown size={22} weight="fill" color="#B45309" /> };
  if (monthJobs >= 11) return { label: 'Silver Verified', sub: 'Experienced technician · 11–30 jobs/month', color: '#4B5563', bg: '#F3F4F6', icon: <Medal size={22} weight="fill" color="#6B7280" /> };
  if (monthJobs >= 1) return { label: 'Bronze Trained', sub: 'Active technician · 1–10 jobs/month', color: '#92400E', bg: '#FEF3C7', icon: <ShieldCheck size={22} weight="fill" color="#D97706" /> };
  return { label: 'New Technician', sub: 'Complete jobs to earn your badge', color: C.muted, bg: C.surfaceElevated, icon: <ShieldCheck size={22} weight="regular" color={C.muted} /> };
};

const FONT_SIZES: { label: string; value: FontScale; preview: string }[] = [
  { label: 'Normal', value: 1, preview: 'A' },
  { label: 'Large', value: 1.15, preview: 'A' },
  { label: 'Extra Large', value: 1.3, preview: 'A' },
];

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  container: { paddingBottom: 40 },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: C.primary,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: C.primary },
  name: { fontSize: 20, fontWeight: 'bold', color: C.foreground, marginBottom: 4 },
  phone: { fontSize: 14, color: C.muted, marginBottom: 8 },
  roleBadge: {
    backgroundColor: C.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderActive,
  },
  roleText: { fontSize: 12, color: C.primary, fontWeight: '600', textTransform: 'uppercase' },
  menuCard: {
    margin: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuIconWrap: { marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: C.foreground, fontWeight: '600' },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel: { width: 70, fontSize: 13, color: C.muted, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: C.foreground, fontWeight: '600' },
  infoValueRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  appInfoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  appInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  appInfoLabel: { fontSize: 13, color: C.muted },
  appInfoValue: { fontSize: 13, color: C.foreground, fontWeight: '600' },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: C.dangerBg,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.danger,
  },
  logoutInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: C.danger },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: C.primaryBg },
  editBtnText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  editRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  editInput: { flex: 1, fontSize: 13, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  editActionText: { fontSize: 14, fontWeight: '700' },
  certBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  certBadgeIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  certBadgeLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  certBadgeSub: { fontSize: 12, color: C.muted },
  certStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceElevated, borderRadius: 12, padding: 12 },
  certStat: { flex: 1, alignItems: 'center' },
  certStatNum: { fontSize: 22, fontWeight: '700' },
  certStatLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 2 },
  certStatDivider: { width: 1, height: 32, backgroundColor: C.border },
  fontScaleRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  fontScaleBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, backgroundColor: C.surfaceElevated,
    borderWidth: 1.5, borderColor: C.border,
  },
  fontScaleBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  fontScalePreview: { fontWeight: '700', color: C.muted },
  fontScaleLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 4 },
  fontScaleLabelActive: { color: C.primary },
});

const ProfileScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { fontScale, setFontScale, lang, setLang } = useSettingsStore();
  const [showId, setShowId] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fieldStats, setFieldStats] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'field_team') {
      (jobAPI.getTodayStats() as any).then((res: any) => {
        setFieldStats(res.data?.stats || res.stats || res.data);
      }).catch(() => {});
    }
  }, [user?.role]);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    if (!trimmedName) {
      Alert.alert('Validation', 'Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({ name: trimmedName, email: trimmedEmail || undefined }) as any;
      const updated = res.data?.user || res.user;
      if (updated) {
        // Patch the zustand store so header updates immediately
        useAuthStore.setState((s: any) => ({ user: { ...s.user, name: updated.name, email: updated.email } }));
      }
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          // RootNavigator auto-switches to AuthNavigator
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.phone?.slice(-2) || '??';

  const menuItems = user?.role === 'customer' ? [
    { icon: <ClipboardText size={20} weight="regular" color={C.primary} />, label: 'My Bookings', onPress: () => navigation.navigate('MyBookings') },
    { icon: <Trophy size={20} weight="regular" color={C.primary} />, label: 'Certificates', onPress: () => navigation.navigate('Certificates') },
    { icon: <FileText size={20} weight="regular" color={C.primary} />, label: 'AMC Plans', onPress: () => navigation.navigate('AmcPlans') },
  ] : user?.role === 'field_team' ? [
    { icon: <Wrench size={20} weight="regular" color={C.primary} />, label: 'My Jobs', onPress: () => navigation.navigate('Jobs') },
  ] : [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'My Account'}</Text>
        <Text style={styles.phone}>+91 {user?.phone}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role === 'customer' ? 'Customer' : user?.role}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuIconWrap}>{item.icon}</View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <CaretRight size={18} weight="regular" color={C.muted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Account Info */}
      <View style={styles.infoCard}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Account Info</Text>
          {!editing && (
            <TouchableOpacity onPress={startEdit} style={styles.editBtn}>
              <PencilSimple size={15} weight="regular" color={C.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View>
            <View style={styles.editRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <TextInput
                style={[styles.editInput, { color: C.foreground, borderColor: C.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={C.muted}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.editRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <TextInput
                style={[styles.editInput, { color: C.foreground, borderColor: C.border }]}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="your@email.com (optional)"
                placeholderTextColor={C.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.editActionBtn, { borderColor: C.border }]} onPress={cancelEdit}>
                <X size={16} weight="bold" color={C.muted} />
                <Text style={[styles.editActionText, { color: C.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editActionBtn, { borderColor: C.primary, backgroundColor: C.primaryBg }]}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={C.primary} />
                  : <Check size={16} weight="bold" color={C.primary} />}
                <Text style={[styles.editActionText, { color: C.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user?.name || '—'}</Text>
            </View>
            {user?.email ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>+91 {user?.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user?.role}</Text>
            </View>
            <TouchableOpacity style={styles.infoRow} onPress={() => setShowId(!showId)}>
              <Text style={styles.infoLabel}>User ID</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {showId ? user?.id : '(tap to reveal)'}
                </Text>
                {showId
                  ? <EyeSlash size={16} weight="regular" color={C.muted} />
                  : <Eye size={16} weight="regular" color={C.muted} />}
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Language */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Language / భాష</Text>
        <View style={styles.fontScaleRow}>
          {([{ label: 'English', value: 'en' }, { label: 'తెలుగు', value: 'te' }] as const).map((l) => {
            const active = lang === l.value;
            return (
              <TouchableOpacity
                key={l.value}
                style={[styles.fontScaleBtn, active && styles.fontScaleBtnActive]}
                onPress={() => setLang(l.value)}
              >
                <Text style={[styles.fontScalePreview, { fontSize: 18 }, active && { color: C.primary }]}>
                  {l.value === 'en' ? '🇬🇧' : '🇮🇳'}
                </Text>
                <Text style={[styles.fontScaleLabel, active && styles.fontScaleLabelActive]}>{l.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {lang === 'te' && (
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 10, textAlign: 'center' }}>
            తెలుగు అనువాదం త్వరలో అందుబాటులోకి వస్తుంది
          </Text>
        )}
      </View>

      {/* Text Size */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Text Size</Text>
        <View style={styles.fontScaleRow}>
          {FONT_SIZES.map((f) => {
            const active = fontScale === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.fontScaleBtn, active && styles.fontScaleBtnActive]}
                onPress={() => setFontScale(f.value)}
              >
                <Text style={[styles.fontScalePreview, { fontSize: 16 * f.value }, active && { color: C.primary }]}>
                  {f.preview}
                </Text>
                <Text style={[styles.fontScaleLabel, active && styles.fontScaleLabelActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Field Team Compliance Badge */}
      {user?.role === 'field_team' && (() => {
        const monthJobs = parseInt(fieldStats?.completed_this_month || '0');
        const tier = getCertTier(monthJobs, C);
        return (
          <View style={[styles.infoCard, { borderLeftWidth: 4, borderLeftColor: tier.color }]}>
            <Text style={styles.cardTitle}>Compliance Badge</Text>
            <View style={styles.certBadgeRow}>
              <View style={[styles.certBadgeIcon, { backgroundColor: tier.bg }]}>
                {tier.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.certBadgeLabel, { color: tier.color }]}>{tier.label}</Text>
                <Text style={styles.certBadgeSub}>{tier.sub}</Text>
              </View>
            </View>
            <View style={styles.certStatsRow}>
              <View style={styles.certStat}>
                <Text style={[styles.certStatNum, { color: C.primary }]}>{fieldStats?.completed_this_month || 0}</Text>
                <Text style={styles.certStatLabel}>This Month</Text>
              </View>
              <View style={styles.certStatDivider} />
              <View style={styles.certStat}>
                <Text style={[styles.certStatNum, { color: C.success }]}>{fieldStats?.streak_days || 0}</Text>
                <Text style={styles.certStatLabel}>Day Streak</Text>
              </View>
              <View style={styles.certStatDivider} />
              <View style={styles.certStat}>
                <Text style={[styles.certStatNum, { color: C.warning }]}>{fieldStats?.completed_this_week || 0}</Text>
                <Text style={styles.certStatLabel}>This Week</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* App Info */}
      <View style={styles.appInfoCard}>
        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoLabel}>App Version</Text>
          <Text style={styles.appInfoValue}>1.0.0</Text>
        </View>
        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoLabel}>Platform</Text>
          <Text style={styles.appInfoValue}>Ozone Wash</Text>
        </View>
        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoLabel}>Support</Text>
          <Text style={styles.appInfoValue}>support@ozonewash.in</Text>
        </View>
      </View>

      {/* Legal */}
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Policy', { type: 'terms' })}>
          <View style={styles.menuIconWrap}><FileText size={20} weight="regular" color={C.primary} /></View>
          <Text style={styles.menuLabel}>Terms & Conditions</Text>
          <CaretRight size={18} weight="regular" color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Policy', { type: 'privacy' })}>
          <View style={styles.menuIconWrap}><ShieldCheck size={20} weight="regular" color={C.primary} /></View>
          <Text style={styles.menuLabel}>Privacy Policy</Text>
          <CaretRight size={18} weight="regular" color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('Policy', { type: 'refund' })}>
          <View style={styles.menuIconWrap}><ClipboardText size={20} weight="regular" color={C.primary} /></View>
          <Text style={styles.menuLabel}>Refund Policy</Text>
          <CaretRight size={18} weight="regular" color={C.muted} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <View style={styles.logoutInner}>
          <SignOut size={20} weight="bold" color={C.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </View>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

export default ProfileScreen;
