import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar, Linking,
  Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Users, Phone, ChatCircle, MapPin, Plus } from '../../components/Icons';
import { useResponsive } from '../../utils/responsive';
import ScreenHeader from '../../components/ScreenHeader';

const AdminTeamsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { isLarge } = useResponsive();
  // Web: 2-column grid capped at 1100px, single column on mobile.
  const numColumns = isLarge ? 2 : 1;
  const webListStyle = isLarge
    ? { maxWidth: 1100, width: '100%' as const, alignSelf: 'center' as const, padding: 24 }
    : null;
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Add-agent (OTP onboarding) ──────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [agName, setAgName] = useState('');
  const [agPhone, setAgPhone] = useState('');
  const [agOtp, setAgOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const resetAdd = () => {
    setShowAdd(false); setAgName(''); setAgPhone(''); setAgOtp(''); setOtpSent(false); setBusy(false);
  };

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(agPhone.trim())) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit mobile number.'); return;
    }
    setBusy(true);
    try {
      await adminAPI.sendAgentOtp(agPhone.trim());
      setOtpSent(true);
      Alert.alert('OTP sent', `Ask the agent for the 6-digit OTP sent to ${agPhone.trim()}.`);
    } catch (e: any) {
      Alert.alert('Could not send OTP', e?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  const createAgent = async () => {
    if (!/^\d{6}$/.test(agOtp.trim())) { Alert.alert('OTP', 'Enter the 6-digit OTP.'); return; }
    setBusy(true);
    try {
      await adminAPI.createAgentWithOtp(agPhone.trim(), agOtp.trim(), agName.trim() || undefined);
      resetAdd();
      fetchTeams(true);
      Alert.alert('Agent added', 'Crew member created. Add them to a crew from Field Teams to make them assignable.');
    } catch (e: any) {
      Alert.alert('Could not add agent', e?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  const fetchTeams = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminAPI.getTeamList() as any;
      setTeams(res.data?.teams || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTeams(); }, []));

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);
  const whatsApp = (phone: string) => Linking.openURL(`https://wa.me/91${phone}`);

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, isLarge && { flex: 1, marginBottom: 0 }]}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name || item.phone)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.name || 'Unnamed Agent'}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
          {item.zone && (
            <View style={styles.zoneRow}>
              <MapPin size={12} weight="fill" color={C.muted} />
              <Text style={styles.zoneText}>{item.zone}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: C.primary }]}>{item.total_jobs || 0}</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: C.success }]}>{item.completed_jobs || 0}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: C.warning }]}>{item.avg_rating ? Number(item.avg_rating).toFixed(1) : '—'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.callBtn} onPress={() => callPhone(item.phone)} activeOpacity={0.7}>
          <Phone size={18} weight="fill" color={C.primary} />
          <Text style={styles.callText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.waBtn} onPress={() => whatsApp(item.phone)} activeOpacity={0.7}>
          <ChatCircle size={18} weight="fill" color={C.success} />
          <Text style={styles.waText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <ScreenHeader
        title="Field Agents"
        subtitle={`${teams.length} agent${teams.length !== 1 ? 's' : ''} on roster`}
        fallbackRoute="AdminDashboard"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          key={`cols-${numColumns}`}
          data={teams}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 16, marginBottom: 16 } : undefined}
          contentContainerStyle={[
            teams.length === 0 ? styles.emptyContainer : styles.list,
            webListStyle,
          ]}
          refreshControl={
            Platform.OS !== 'web' ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchTeams(true)} tintColor={C.primary} /> : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Users size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No field agents</Text>
              <Text style={styles.emptySub}>Field team members will appear here after registration</Text>
            </View>
          }
        />
      )}

      {/* Add-agent FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Plus size={20} weight="bold" color={C.primaryFg} />
        <Text style={styles.fabText}>Add Agent</Text>
      </TouchableOpacity>

      {/* Add-agent modal (OTP onboarding) */}
      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={resetAdd}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add field agent</Text>
            <Text style={styles.modalSub}>
              Send an OTP to the agent's phone, then enter the code they read back to verify & create the account.
            </Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, otpSent && styles.inputLocked]}
              value={agName} onChangeText={setAgName}
              placeholder="Agent name" placeholderTextColor={C.muted}
              editable={!otpSent}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={[styles.input, otpSent && styles.inputLocked]}
              value={agPhone} onChangeText={(t) => setAgPhone(t.replace(/[^0-9]/g, ''))}
              placeholder="10-digit mobile" placeholderTextColor={C.muted}
              keyboardType="phone-pad" maxLength={10} editable={!otpSent}
            />

            {otpSent && (
              <>
                <Text style={styles.label}>OTP from agent</Text>
                <TextInput
                  style={styles.input}
                  value={agOtp} onChangeText={(t) => setAgOtp(t.replace(/[^0-9]/g, ''))}
                  placeholder="6-digit OTP" placeholderTextColor={C.muted}
                  keyboardType="number-pad" maxLength={6} autoFocus
                />
                <TouchableOpacity onPress={() => { setOtpSent(false); setAgOtp(''); }}>
                  <Text style={styles.link}>Change number / resend</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.mBtn, styles.mCancel]} onPress={resetAdd} disabled={busy}>
                <Text style={styles.mCancelText}>Cancel</Text>
              </TouchableOpacity>
              {!otpSent ? (
                <TouchableOpacity style={[styles.mBtn, styles.mPrimary]} onPress={sendOtp} disabled={busy}>
                  {busy ? <ActivityIndicator size="small" color={C.primaryFg} /> : <Text style={styles.mPrimaryText}>Send OTP</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.mBtn, styles.mPrimary]} onPress={createAgent} disabled={busy}>
                  {busy ? <ActivityIndicator size="small" color={C.primaryFg} /> : <Text style={styles.mPrimaryText}>Verify & Add</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.foreground },
  headerCount: { fontSize: 13, color: C.muted },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: C.primary },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: C.foreground },
  phone: { fontSize: 13, color: C.muted, marginTop: 2 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  zoneText: { fontSize: 12, color: C.muted },
  statsRow: {
    flexDirection: 'row', backgroundColor: C.surfaceElevated, borderRadius: 12,
    padding: 12, marginBottom: 14, justifyContent: 'space-around',
  },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.primaryBg,
  },
  callText: { fontSize: 13, fontWeight: '700', color: C.primary },
  waBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.successBg,
  },
  waText: { fontSize: 13, fontWeight: '700', color: C.success },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center' },

  // Add-agent FAB + modal
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  fabText: { color: C.primaryFg, fontWeight: '800', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: C.surface, borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.foreground },
  modalSub: { fontSize: 12.5, color: C.muted, marginTop: 6, lineHeight: 18 },
  label: { fontSize: 12, color: C.muted, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.foreground, backgroundColor: C.background },
  inputLocked: { backgroundColor: C.surfaceElevated, color: C.muted },
  link: { fontSize: 12, color: C.primary, fontWeight: '700', marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  mBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mCancel: { backgroundColor: C.surfaceElevated, borderWidth: 1, borderColor: C.border },
  mCancelText: { color: C.foreground, fontWeight: '700', fontSize: 14 },
  mPrimary: { backgroundColor: C.primary },
  mPrimaryText: { color: C.primaryFg, fontWeight: '800', fontSize: 14 },
});

export default AdminTeamsScreen;
