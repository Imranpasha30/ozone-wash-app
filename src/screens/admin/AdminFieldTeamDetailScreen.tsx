/**
 * AdminFieldTeamDetailScreen — manage a single field team. Admin can:
 *   - See leader + member list with their share_pct
 *   - Add a new member (picks from agents not already in this team)
 *   - Remove a member
 *   - Promote a member to leader (which auto-demotes the old leader)
 *   - Adjust a member's share_pct (controls incentive split)
 *   - Edit team name / description
 *   - Deactivate the team
 *
 * Share_pct values are relative — engine normalizes at payout. Default
 * leader = 120, members = 100. Admin can override for custom splits.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, RefreshControl, Modal, Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../utils/responsive';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { Users, Plus, Crown, Trash, ShieldCheck, CheckCircle } from '../../components/Icons';
import ScreenHeader from '../../components/ScreenHeader';
import { confirm as showConfirm, alert as showAlert } from '../../services/dialog';
import WebContainer from '../../components/WebContainer';

interface Member {
  id: string;
  team_id: string;
  agent_id: string;
  role: 'leader' | 'member';
  share_pct: number;
  name: string;
  phone: string;
  is_active: boolean;
}

interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  leader_id: string;
  leader_name: string;
  leader_phone: string;
  is_active: boolean;
  members: Member[];
}

interface Agent { id: string; name: string; phone: string }

const AdminFieldTeamDetailScreen = () => {
  const C = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const { isLarge } = useResponsive();
  const teamId: string = route.params?.id;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  // Map agent_id → { team_id, team_name } so chips can show "currently in X".
  const [agentTeamMap, setAgentTeamMap] = useState<Record<string, { id: string; name: string }>>({});
  // All other active teams — used by the "Move to..." picker on each member row.
  const [otherTeams, setOtherTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [movingMember, setMovingMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingShare, setEditingShare] = useState<Record<string, string>>({});

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // Pull this team, all agents, AND all teams so we know which other team
      // each agent currently belongs to (for the transfer flow).
      const [teamRes, agentsRes, teamsRes] = await Promise.all([
        adminAPI.getFieldTeam(teamId) as any,
        adminAPI.getTeamList() as any,
        adminAPI.listFieldTeams() as any,
      ]);
      setTeam(teamRes.data?.team || null);
      setAgents(agentsRes.data?.teams || []);

      // Build agent → current team mapping by fetching each team's members.
      // For a small org this is fine; for larger ones add a dedicated endpoint.
      const allTeams = teamsRes.data?.teams || [];
      // Other active teams (everyone except this one) — used by "Move to..."
      setOtherTeams(allTeams.filter((t: any) => t.id !== teamId && t.is_active));
      const map: Record<string, { id: string; name: string }> = {};
      await Promise.all(allTeams.map(async (t: any) => {
        try {
          const detail = await adminAPI.getFieldTeam(t.id) as any;
          const members = detail.data?.team?.members || [];
          members.forEach((m: any) => {
            map[m.agent_id] = { id: t.id, name: t.name };
          });
        } catch (_) {}
      }));
      setAgentTeamMap(map);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { if (teamId) load(); }, [teamId]));

  const memberIds = useMemo(
    () => new Set(team?.members.map((m) => m.agent_id) || []),
    [team]
  );
  // Candidates = every agent NOT already in THIS team. Agents in OTHER teams
  // are still shown so the admin can transfer them in.
  const candidates = useMemo(
    () => agents.filter((a) => !memberIds.has(a.id)),
    [agents, memberIds]
  );

  const addMember = async (agentId: string) => {
    const currentTeam = agentTeamMap[agentId];
    const isInAnotherTeam = currentTeam && currentTeam.id !== teamId;

    if (isInAnotherTeam) {
      const ok = await showConfirm({
        title: `Move from "${currentTeam.name}"?`,
        message: `${agents.find((a) => a.id === agentId)?.name || 'This agent'} is currently on "${currentTeam.name}". Moving them will end their incentive share on that team.`,
        confirmText: 'Move here',
      });
      if (!ok) return;
    }

    setBusy('add-' + agentId);
    try {
      await adminAPI.addTeamMember(teamId, {
        agent_id: agentId,
        transfer: !!isInAnotherTeam,
      });
      await load();
    } catch (err: any) {
      // 409 means agent is on another team and we didn't pass transfer=true.
      // Recover by asking for confirmation and retrying with transfer.
      const data = err?.response?.data;
      if (err?.response?.status === 409 && data?.existing_team?.name) {
        const ok = await showConfirm({
          title: `Move from "${data.existing_team.name}"?`,
          message: 'Agent is currently on another team. Move them here?',
          confirmText: 'Move here',
        });
        if (ok) {
          try {
            await adminAPI.addTeamMember(teamId, { agent_id: agentId, transfer: true });
            await load();
            return;
          } catch (err2: any) {
            await showAlert({ title: 'Could not move', message: err2?.response?.data?.message || err2?.message || 'Try again.' });
            return;
          }
        }
      } else {
        await showAlert({ title: 'Could not add member', message: data?.message || err?.message || 'Try again.' });
      }
    } finally { setBusy(null); }
  };

  const removeMember = async (m: Member) => {
    const ok = await showConfirm({
      title: `Remove ${m.name}?`,
      message: 'They will stop receiving incentives from this team\'s future jobs.',
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setBusy('rm-' + m.agent_id);
    try {
      await adminAPI.removeTeamMember(teamId, m.agent_id);
      await load();
    } catch (err: any) {
      await showAlert({ title: 'Could not remove', message: err?.response?.data?.message || err?.message || 'Try again.' });
    } finally { setBusy(null); }
  };

  // Move a member of THIS team into another team. Opens the picker modal;
  // the actual transfer happens once the admin selects a destination.
  const moveMemberToTeam = async (m: Member, destTeamId: string, destTeamName: string) => {
    if (m.role === 'leader') {
      await showAlert({
        title: 'Cannot move leader',
        message: 'Promote another member to leader first, then move this person.',
      });
      return;
    }
    const ok = await showConfirm({
      title: `Move ${m.name} to "${destTeamName}"?`,
      message: 'They will stop earning incentives from this team and start earning from the destination.',
      confirmText: 'Move',
    });
    if (!ok) return;
    setBusy('move-' + m.agent_id);
    try {
      await adminAPI.addTeamMember(destTeamId, { agent_id: m.agent_id, transfer: true });
      setMovingMember(null);
      await load();
    } catch (err: any) {
      await showAlert({ title: 'Could not move', message: err?.response?.data?.message || err?.message || 'Try again.' });
    } finally { setBusy(null); }
  };

  const promoteToLeader = async (m: Member) => {
    if (!team) return;
    const ok = await showConfirm({
      title: `Promote ${m.name} to leader?`,
      message: `${team.leader_name} will be demoted to a regular member.`,
      confirmText: 'Promote',
    });
    if (!ok) return;
    setBusy('promote-' + m.agent_id);
    try {
      await adminAPI.updateFieldTeam(teamId, { leader_id: m.agent_id });
      await load();
    } catch (err: any) {
      await showAlert({ title: 'Could not promote', message: err?.response?.data?.message || err?.message || 'Try again.' });
    } finally { setBusy(null); }
  };

  const saveShare = async (m: Member) => {
    const raw = editingShare[m.agent_id];
    if (raw == null) return;
    const pct = parseInt(raw, 10);
    if (Number.isNaN(pct) || pct < 1 || pct > 1000) {
      await showAlert({ title: 'Invalid share', message: 'Share must be a number between 1 and 1000.' });
      return;
    }
    setBusy('share-' + m.agent_id);
    try {
      await adminAPI.updateTeamMemberShare(teamId, m.agent_id, pct);
      setEditingShare((p) => { const n = { ...p }; delete n[m.agent_id]; return n; });
      await load();
    } catch (err: any) {
      await showAlert({ title: 'Could not save', message: err?.response?.data?.message || err?.message || 'Try again.' });
    } finally { setBusy(null); }
  };

  const deactivate = async () => {
    if (!team) return;
    const ok = await showConfirm({
      title: `Deactivate "${team.name}"?`,
      message: 'The team will no longer be assignable to jobs. Past incentive history is preserved.',
      confirmText: 'Deactivate',
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminAPI.deleteFieldTeam(teamId);
      navigation.goBack();
    } catch (err: any) {
      await showAlert({ title: 'Could not deactivate', message: err?.response?.data?.message || err?.message || 'Try again.' });
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Team" fallbackRoute="AdminFieldTeams" />
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Team not found" fallbackRoute="AdminFieldTeams" />
        <View style={styles.center}>
          <Text style={{ color: C.muted }}>This team may have been deactivated.</Text>
        </View>
      </View>
    );
  }

  // Pre-compute normalized share preview (helps admin see actual %)
  const totalShares = team.members.reduce((s, m) => s + m.share_pct, 0) || 1;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={team.name}
        subtitle={team.description || `${team.members.length} member${team.members.length !== 1 ? 's' : ''}`}
        fallbackRoute="AdminFieldTeams"
      />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }}>
        <WebContainer variant="narrow">

        {/* Leader card */}
        <View style={[styles.section, { marginTop: 16 }]}>
          <Text style={styles.sectionLabel}>LEADER</Text>
          {team.members.filter((m) => m.role === 'leader').map((m) => (
            <View key={m.id} style={[styles.memberCard, { borderColor: C.gold, backgroundColor: C.goldBg }]}>
              <View style={styles.memberLeft}>
                <View style={[styles.memberIcon, { backgroundColor: C.gold + '22' }]}>
                  <Crown size={20} weight="fill" color={C.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberMeta}>{m.phone} · Leader</Text>
                </View>
              </View>
              <ShareEditor
                C={C}
                value={editingShare[m.agent_id] ?? String(m.share_pct)}
                onChange={(v: string) => setEditingShare((p) => ({ ...p, [m.agent_id]: v }))}
                onSave={() => saveShare(m)}
                normalized={Math.round((m.share_pct / totalShares) * 100)}
                editing={editingShare[m.agent_id] != null}
                busy={busy === 'share-' + m.agent_id}
                styles={styles}
              />
            </View>
          ))}
        </View>

        {/* Members list */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MEMBERS ({team.members.filter((m) => m.role === 'member').length})</Text>
          {team.members.filter((m) => m.role === 'member').length === 0 ? (
            <Text style={styles.helper}>No members yet — add agents below.</Text>
          ) : team.members.filter((m) => m.role === 'member').map((m) => (
            <View key={m.id} style={styles.memberCard}>
              <View style={styles.memberLeft}>
                <View style={[styles.memberIcon, { backgroundColor: C.primaryBg }]}>
                  <Users size={20} weight="fill" color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberMeta}>{m.phone}</Text>
                </View>
              </View>
              <View style={styles.memberRight}>
                <ShareEditor
                  C={C}
                  value={editingShare[m.agent_id] ?? String(m.share_pct)}
                  onChange={(v: string) => setEditingShare((p) => ({ ...p, [m.agent_id]: v }))}
                  onSave={() => saveShare(m)}
                  normalized={Math.round((m.share_pct / totalShares) * 100)}
                  editing={editingShare[m.agent_id] != null}
                  busy={busy === 'share-' + m.agent_id}
                  styles={styles}
                />
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => promoteToLeader(m)}
                    disabled={busy === 'promote-' + m.agent_id}
                    activeOpacity={0.8}
                  >
                    {busy === 'promote-' + m.agent_id ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                      <>
                        <Crown size={12} weight="fill" color={C.primary} />
                        <Text style={[styles.smallBtnText, { color: C.primary }]}>Promote</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {otherTeams.length > 0 ? (
                    <TouchableOpacity
                      style={[styles.smallBtn, { borderColor: C.warning }]}
                      onPress={() => setMovingMember(m)}
                      disabled={busy === 'move-' + m.agent_id}
                      activeOpacity={0.8}
                    >
                      {busy === 'move-' + m.agent_id ? (
                        <ActivityIndicator size="small" color={C.warning} />
                      ) : (
                        <>
                          <Users size={12} weight="fill" color={C.warning} />
                          <Text style={[styles.smallBtnText, { color: C.warning }]}>Move to…</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.smallBtn, { borderColor: C.danger }]}
                    onPress={() => removeMember(m)}
                    disabled={busy === 'rm-' + m.agent_id}
                    activeOpacity={0.8}
                  >
                    {busy === 'rm-' + m.agent_id ? (
                      <ActivityIndicator size="small" color={C.danger} />
                    ) : (
                      <>
                        <Trash size={12} weight="fill" color={C.danger} />
                        <Text style={[styles.smallBtnText, { color: C.danger }]}>Remove</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Add candidates */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ADD AGENT TO TEAM</Text>
          {candidates.length === 0 ? (
            <Text style={styles.helper}>Every available agent is already on this team.</Text>
          ) : (
            <View style={styles.candidates}>
              {candidates.map((a) => {
                const onOtherTeam = agentTeamMap[a.id] && agentTeamMap[a.id].id !== teamId;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.candidateChip,
                      // Agents already on another team get an amber outline so the
                      // admin sees "this is a transfer" at a glance.
                      onOtherTeam && { borderColor: C.warning, backgroundColor: (C.warningBg || '#FEF3C7') },
                    ]}
                    onPress={() => addMember(a.id)}
                    disabled={busy === 'add-' + a.id}
                    activeOpacity={0.8}
                  >
                    {busy === 'add-' + a.id ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                      <>
                        <Plus size={12} weight="bold" color={onOtherTeam ? C.warning : C.primary} />
                        <Text style={[styles.candidateText, onOtherTeam && { color: C.warning }]}>
                          {a.name}
                          {onOtherTeam ? ` · in ${agentTeamMap[a.id].name}` : ''}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Danger zone */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionLabel}>DANGER ZONE</Text>
          <TouchableOpacity
            style={[styles.deactivateBtn, { borderColor: C.danger }]}
            onPress={deactivate}
            activeOpacity={0.8}
          >
            <Trash size={16} weight="bold" color={C.danger} />
            <Text style={[styles.deactivateText, { color: C.danger }]}>Deactivate team</Text>
          </TouchableOpacity>
        </View>

        </WebContainer>
      </ScrollView>

      {/* Move-to-team picker modal — appears when admin taps "Move to…" on
          any member row. Shows every OTHER active team as a tappable row. */}
      <Modal
        visible={!!movingMember}
        transparent
        animationType="fade"
        onRequestClose={() => setMovingMember(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMovingMember(null)}>
          <Pressable style={styles.moveCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.moveTitle}>
              Move {movingMember?.name} to…
            </Text>
            <Text style={styles.moveSub}>
              Pick a destination team. The transfer happens instantly and starts
              splitting incentives from the new team's next job.
            </Text>
            <View style={{ gap: 8, marginTop: 16 }}>
              {otherTeams.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.moveRow}
                  onPress={() => movingMember && moveMemberToTeam(movingMember, t.id, t.name)}
                  disabled={busy != null}
                  activeOpacity={0.85}
                >
                  <View style={styles.moveRowIcon}>
                    <Users size={16} weight="fill" color={C.primary} />
                  </View>
                  <Text style={styles.moveRowName}>{t.name}</Text>
                  {busy === 'move-' + movingMember?.agent_id
                    ? <ActivityIndicator size="small" color={C.primary} />
                    : <Text style={styles.moveRowAction}>Move →</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.moveCancel}
              onPress={() => setMovingMember(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.moveCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// Inline share-pct editor used in each member row.
const ShareEditor = ({ C, value, onChange, onSave, normalized, editing, busy, styles }: any) => (
  <View style={styles.shareWrap}>
    <View style={styles.shareInputRow}>
      <TextInput
        style={styles.shareInput}
        keyboardType="number-pad"
        value={value}
        onChangeText={onChange}
        maxLength={4}
      />
      <Text style={styles.shareSuffix}>pts</Text>
      {editing && (
        <TouchableOpacity onPress={onSave} disabled={busy} style={styles.shareSaveBtn} activeOpacity={0.7}>
          {busy ? <ActivityIndicator size="small" color={C.primary} /> : <CheckCircle size={14} weight="fill" color={C.primary} />}
        </TouchableOpacity>
      )}
    </View>
    <Text style={styles.shareHint}>~{normalized}% of pool</Text>
  </View>
);

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  section: { paddingHorizontal: 16, marginTop: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: C.muted, marginBottom: 8 },
  helper: { fontSize: 12, color: C.muted, fontStyle: 'italic', paddingVertical: 8 },

  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    gap: 10,
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  memberIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  memberName: { fontSize: 14, fontWeight: '700', color: C.foreground },
  memberMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  memberRight: { gap: 6, alignItems: 'flex-end' },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 4 },

  shareWrap: { minWidth: 100, alignItems: 'flex-end' },
  shareInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  shareInput: {
    width: 36, fontSize: 13, fontWeight: '700', color: C.foreground,
    textAlign: 'center',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  shareSuffix: { fontSize: 11, color: C.muted, fontWeight: '600' },
  shareSaveBtn: { marginLeft: 4 },
  shareHint: { fontSize: 10, color: C.muted, marginTop: 4 },

  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: C.primary,
    backgroundColor: 'transparent',
  },
  smallBtnText: { fontSize: 11, fontWeight: '700' },

  candidates: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  candidateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: C.primary,
    backgroundColor: C.primaryBg,
  },
  candidateText: { fontSize: 12, fontWeight: '600', color: C.primary },

  deactivateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, backgroundColor: 'transparent',
  },
  deactivateText: { fontSize: 13, fontWeight: '700' },

  // ── Move-to-team picker modal ────────────────────────────────────────
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(4px)' } as any) : {}),
  },
  moveCard: {
    width: '100%', maxWidth: 480,
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 28 },
      android: { elevation: 12 },
      web: ({ boxShadow: '0 20px 50px rgba(0,0,0,0.35)' } as any),
    }),
  },
  moveTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  moveSub: { fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 16 },
  moveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surfaceElevated,
  },
  moveRowIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  moveRowName: { flex: 1, fontSize: 14, fontWeight: '700', color: C.foreground },
  moveRowAction: { fontSize: 12, fontWeight: '700', color: C.primary },
  moveCancel: {
    paddingVertical: 10, marginTop: 16, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border,
  },
  moveCancelText: { fontSize: 13, fontWeight: '600', color: C.muted },
});

export default AdminFieldTeamDetailScreen;
