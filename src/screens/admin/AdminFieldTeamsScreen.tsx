/**
 * AdminFieldTeamsScreen — list of field-team groupings (multi-agent teams
 * with a designated leader). From here the admin can create a new team or
 * drill into one to manage members + share percentages.
 *
 * Responsive: 2-column grid on web (≥768 px), single column on mobile.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Pressable,
  ActivityIndicator, RefreshControl, Platform, TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../utils/responsive';
import { Users, Plus, Crown, ArrowRight, X } from '../../components/Icons';
import ScreenHeader from '../../components/ScreenHeader';
import { alert as showAlert } from '../../services/dialog';

interface Team {
  id: string;
  name: string;
  description: string | null;
  leader_id: string;
  leader_name: string;
  leader_phone: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
}

interface Agent { id: string; name: string; phone: string }

const AdminFieldTeamsScreen = () => {
  const C = useTheme();
  const navigation = useNavigation<any>();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { isLarge } = useResponsive();

  const numColumns = isLarge ? 2 : 1;
  const webListStyle = isLarge
    ? { maxWidth: 1100, width: '100%' as const, alignSelf: 'center' as const, padding: 24 }
    : null;

  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create-team dialog state.
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLeaderId, setNewLeaderId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Map of agent_id → which team they're currently on. Built by fanning out
  // to each team's detail. Used to exclude already-teamed agents from the
  // leader picker on the create modal (you can't create a team led by
  // someone who's already on another team — admin must transfer them first).
  const [agentTeamMap, setAgentTeamMap] = useState<Record<string, { id: string; name: string }>>({});

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [teamsRes, agentsRes] = await Promise.all([
        adminAPI.listFieldTeams() as any,
        adminAPI.getTeamList() as any,
      ]);
      const fetchedTeams = teamsRes.data?.teams || [];
      setTeams(fetchedTeams);
      setAgents(agentsRes.data?.teams || []);

      // Build the agent → current-team map.
      const map: Record<string, { id: string; name: string }> = {};
      await Promise.all(fetchedTeams.map(async (t: any) => {
        try {
          const detail = await adminAPI.getFieldTeam(t.id) as any;
          const members = detail.data?.team?.members || [];
          members.forEach((m: any) => { map[m.agent_id] = { id: t.id, name: t.name }; });
        } catch (_) {}
      }));
      setAgentTeamMap(map);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  // Agents available as a NEW team's leader = field-team users who are not
  // already on any active team. Promote/transfer happens via the team detail.
  const availableLeaders = useMemo(
    () => agents.filter((a) => !agentTeamMap[a.id]),
    [agents, agentTeamMap]
  );

  useFocusEffect(useCallback(() => { load(); }, []));

  const submitCreate = async () => {
    if (!newName.trim()) { await showAlert({ title: 'Name required', message: 'Give the team a name.' }); return; }
    if (!newLeaderId)    { await showAlert({ title: 'Leader required', message: 'Pick a leader from your field agents.' }); return; }
    setCreating(true);
    try {
      const res = await adminAPI.createFieldTeam({
        name: newName.trim(),
        leader_id: newLeaderId,
        description: newDesc.trim() || undefined,
      }) as any;
      setCreateOpen(false);
      setNewName(''); setNewDesc(''); setNewLeaderId(null);
      await load();
      const teamId = res.data?.team?.id;
      if (teamId) navigation.navigate('AdminFieldTeamDetail', { id: teamId });
    } catch (err: any) {
      await showAlert({ title: 'Could not create team', message: err?.response?.data?.message || err?.message || 'Try again.' });
    } finally { setCreating(false); }
  };

  const renderItem = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={[styles.card, isLarge && { flex: 1, marginBottom: 0 }]}
      onPress={() => navigation.navigate('AdminFieldTeamDetail', { id: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.cardHead}>
        <View style={styles.iconWrap}>
          <Users size={22} weight="fill" color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.teamName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
          ) : null}
        </View>
        <ArrowRight size={16} weight="bold" color={C.muted} />
      </View>

      <View style={styles.divider} />

      <View style={styles.rowMeta}>
        <View style={styles.leaderRow}>
          <Crown size={14} weight="fill" color={C.gold} />
          <Text style={styles.leaderText}>{item.leader_name}</Text>
        </View>
        <View style={styles.memberPill}>
          <Text style={styles.memberPillText}>
            {item.member_count} member{item.member_count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Field Teams"
        subtitle={`${teams.length} team${teams.length !== 1 ? 's' : ''} active`}
        fallbackRoute="AdminDashboard"
        right={
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setCreateOpen(true)}
            activeOpacity={0.8}
          >
            <Plus size={16} weight="bold" color={C.primaryFg} />
            <Text style={styles.createBtnText}>New team</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
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
            Platform.OS !== 'web'
              ? <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} />
              : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Users size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No teams yet</Text>
              <Text style={styles.emptySub}>Tap "New team" to group your field agents.</Text>
            </View>
          }
        />
      )}

      {/* Create-team modal — single Modal with the full form inline so the
          inputs render on top of the backdrop instead of behind a separate
          dialog overlay. Tapping the backdrop cancels. */}
      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!creating) setCreateOpen(false); }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => { if (!creating) setCreateOpen(false); }}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Create field team</Text>
                <Text style={styles.modalSub}>A team works together on jobs and splits incentives.</Text>
              </View>
              <TouchableOpacity
                onPress={() => { if (!creating) setCreateOpen(false); }}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={16} weight="bold" color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>TEAM NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alpha Crew"
              placeholderTextColor={C.muted}
              value={newName}
              onChangeText={setNewName}
              maxLength={80}
              autoFocus
            />

            <Text style={[styles.formLabel, { marginTop: 14 }]}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Banjara Hills sector"
              placeholderTextColor={C.muted}
              value={newDesc}
              onChangeText={setNewDesc}
              maxLength={200}
            />

            <Text style={[styles.formLabel, { marginTop: 14 }]}>LEADER</Text>
            <View style={styles.agentChips}>
              {availableLeaders.length === 0 ? (
                <Text style={styles.helper}>
                  {agents.length === 0
                    ? 'No field agents available — register agents first.'
                    : 'Every field agent is already on a team. Transfer one from the team detail page or deactivate an existing team first.'}
                </Text>
              ) : availableLeaders.map((a) => {
                const active = newLeaderId === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.agentChip, active && { borderColor: C.primary, backgroundColor: C.primaryBg }]}
                    onPress={() => setNewLeaderId(a.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.agentChipText, active && { color: C.primary, fontWeight: '700' }]}>
                      {a.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { if (!creating) setCreateOpen(false); }}
                disabled={creating}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, (!newName.trim() || !newLeaderId || creating) && { opacity: 0.5 }]}
                onPress={submitCreate}
                disabled={!newName.trim() || !newLeaderId || creating}
                activeOpacity={0.85}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={C.primaryFg} />
                ) : (
                  <Text style={styles.modalConfirmText}>Create team</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  createBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: C.surface, borderRadius: 16,
    marginBottom: 12, padding: 16,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  teamName: { fontSize: 15, fontWeight: '700', color: C.foreground },
  desc: { fontSize: 12, color: C.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  leaderText: { fontSize: 12, color: C.foreground, fontWeight: '600' },
  memberPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: C.surfaceElevated,
  },
  memberPillText: { fontSize: 11, fontWeight: '700', color: C.muted },

  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  emptySub:   { fontSize: 14, color: C.muted, textAlign: 'center' },

  // ── Create-team modal ────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(4px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 480,
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 28 },
      android: { elevation: 12 },
      web:     ({ boxShadow: '0 20px 50px rgba(0,0,0,0.35)' } as any),
    }),
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  modalSub:   { fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 16 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
    marginTop: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  modalCancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  modalCancelText: { color: C.foreground, fontWeight: '600', fontSize: 13 },
  modalConfirmBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.primary, minWidth: 110,
    alignItems: 'center', justifyContent: 'center',
  },
  modalConfirmText: { color: C.primaryFg, fontWeight: '700', fontSize: 13 },
  formLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: C.muted, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.foreground, backgroundColor: C.surface,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  agentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  agentChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  agentChipText: { fontSize: 12, color: C.foreground },
  helper: { fontSize: 12, color: C.muted, fontStyle: 'italic' },
});

export default AdminFieldTeamsScreen;
