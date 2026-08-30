/**
 * AdminScheduleBoardScreen — crew × time-slot assignment board.
 *
 * Rows = real crews (field_team members) with their availability for the day.
 * Columns = the workday split into slots (workday_start→end by slot_step_min).
 * Each cell shows the assigned job blocks, sized by the job's real duration_min.
 * Unavailable crews (leave/sick/off) are greyed out.
 *
 * Backend: GET /admin/schedule-board?date=YYYY-MM-DD → { config, crews, jobs }
 *          PUT /admin/crew-availability  (set a crew's status/shift)
 *          PATCH /jobs/:id/assign        (guarded — 409 → "Assign anyway")
 *
 * Split-brain identity note: jobs carry BOTH assigned_team_id (users.id) and
 * assigned_field_team_id (field_teams.id). Every assigned job's assigned_team_id
 * is the lead agent, so we place a job in a crew lane by
 * job.assigned_team_id === crew.agent_id. Assigning writes team_id = agent_id.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  ActivityIndicator, RefreshControl, Alert, Platform, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import ScreenHeader from '../../components/ScreenHeader';
import {
  CaretLeft, CaretRight, Users, Drop, Car, Check, Warning,
  FirstAid, HandPalm, Prohibit, Wrench,
} from '../../components/Icons';

// ── Grid geometry ──────────────────────────────────────────────────────────
const PX_PER_MIN = 2.2;      // horizontal pixels per minute
const ROW_H = 70;            // crew lane height
const HEADER_H = 34;         // time-axis header height
const LABEL_W = 124;         // frozen crew-label column width
const BLOCK_MIN_W = 46;      // min job-block width so tiny jobs stay tappable

const STATUS_ORDER = ['working', 'leave', 'sick', 'off'] as const;

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shiftYmd = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const prettyDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
const hmToMin = (hm: any) => {
  const [h, m] = String(hm ?? '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const minToHm = (mins: number) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
// Minutes-of-day of a job's start, in the device's local time (IST for admins).
const jobStartMin = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

const AdminScheduleBoardScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [date, setDate] = useState<string>(todayYmd());
  const [config, setConfig] = useState<any>(null);
  const [crews, setCrews] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [busyCrewId, setBusyCrewId] = useState<string | null>(null);
  const [availCrew, setAvailCrew] = useState<any | null>(null); // availability picker target

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res: any = await adminAPI.getScheduleBoard(date);
      const d = res?.data || {};
      setConfig(d.config || null);
      setCrews(Array.isArray(d.crews) ? d.crews : []);
      setJobs(Array.isArray(d.jobs) ? d.jobs : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load the schedule board.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useFocusEffect(useCallback(() => { load(); setSelectedJobId(null); }, [load]));

  // ── Derived grid ──────────────────────────────────────────────────────────
  const dayStart = hmToMin(config?.workday_start || '08:00');
  const dayEnd = hmToMin(config?.workday_end || '18:00');
  const step = Math.max(15, Number(config?.slot_step_min) || 30);
  const spanMin = Math.max(step, dayEnd - dayStart);
  const totalWidth = (spanMin / 60) * 60 * PX_PER_MIN; // = spanMin * PX_PER_MIN
  const colW = step * PX_PER_MIN;
  const slotStarts = useMemo(() => {
    const out: number[] = [];
    for (let t = dayStart; t < dayEnd; t += step) out.push(t);
    return out;
  }, [dayStart, dayEnd, step]);

  // Jobs by TEAM + unassigned + off-roster (assigned to someone not on today's
  // team roster, so nothing is silently hidden).
  const { byTeam, unassigned, offRoster } = useMemo(() => {
    const teamById = new Map(crews.map((c) => [c.team_id, c]));
    const leaderToTeam = new Map(crews.map((c) => [c.leader_id, c.team_id]));
    const byTeam: Record<string, any[]> = {};
    const unassigned: any[] = [];
    const offRoster: any[] = [];
    for (const j of jobs) {
      // Match a job to a team by its field-team id, or (legacy / agent-assigned)
      // by the lead agent sitting in assigned_team_id.
      const teamId =
        (j.assigned_field_team_id && teamById.has(j.assigned_field_team_id) && j.assigned_field_team_id) ||
        (j.assigned_team_id && leaderToTeam.get(j.assigned_team_id)) ||
        null;
      if (teamId) {
        (byTeam[teamId] ||= []).push(j);
      } else if (j.assigned_team_id || j.assigned_field_team_id) {
        offRoster.push(j);
      } else if (j.status !== 'completed') {
        unassigned.push(j);
      }
    }
    return { byTeam, unassigned, offRoster };
  }, [jobs, crews]);

  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) : null;

  // ── Actions ────────────────────────────────────────────────────────────────
  const assign = async (jobId: string, teamId: string, teamName: string, force = false) => {
    setBusyCrewId(teamId);
    try {
      await adminAPI.assignFieldTeam(jobId, teamId, force);
      setSelectedJobId(null);
      await load(true);
    } catch (err: any) {
      if (err?.status === 409 && !force) {
        Alert.alert('Crew unavailable', err?.message || 'That crew has an overlapping job or is off that day.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Assign anyway', style: 'destructive', onPress: () => assign(jobId, teamId, teamName, true) },
        ]);
      } else {
        Alert.alert('Error', err?.message || 'Failed to assign.');
      }
    } finally {
      setBusyCrewId(null);
    }
  };

  const onLaneTap = (crew: any) => {
    if (!selectedJobId) return;
    assign(selectedJobId, crew.team_id, crew.name || 'crew');
  };

  const setAvailability = async (crew: any, status: string) => {
    setAvailCrew(null);
    try {
      // Availability is keyed on the team's lead agent server-side.
      await adminAPI.setCrewAvailability({ agent_id: crew.leader_id, date, status });
      await load(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update availability.');
    }
  };

  const statusMeta = (status: string) => {
    switch (status) {
      case 'leave': return { label: 'Leave', color: C.warning, Icon: HandPalm };
      case 'sick': return { label: 'Sick', color: C.danger, Icon: FirstAid };
      case 'off': return { label: 'Off', color: C.muted, Icon: Prohibit };
      default: return { label: 'Working', color: C.success, Icon: Check };
    }
  };

  // ── Sub-renders ──────────────────────────────────────────────────────────
  const renderJobBlock = (job: any) => {
    const start = jobStartMin(job.scheduled_at);
    const dur = Math.max(15, Number(job.duration_min) || 120);
    const left = Math.max(0, (start - dayStart) * PX_PER_MIN);
    const width = Math.max(BLOCK_MIN_W, dur * PX_PER_MIN);
    const isVehicle = job.resource_type === 'vehicle';
    const done = job.status === 'completed';
    const inProg = job.status === 'in_progress';
    const accent = isVehicle ? C.warning : C.primary;
    const Ico = isVehicle ? Car : Drop;
    const label = isVehicle
      ? (job.registration_number || (job.vehicle_type ? String(job.vehicle_type).toUpperCase() : 'Car wash'))
      : (job.customer_name || (job.tank_size_litres ? `${job.tank_size_litres}L` : 'Tank'));
    return (
      <View
        key={job.id}
        style={[
          styles.jobBlock,
          { left, width, borderColor: accent, backgroundColor: accent + (done ? '18' : '2A') },
          done && styles.jobBlockDone,
          inProg && { borderStyle: 'dashed' },
        ]}
      >
        <View style={styles.jobBlockRow}>
          <Ico size={11} weight="fill" color={done ? C.muted : accent} />
          <Text numberOfLines={1} style={[styles.jobBlockText, done && { color: C.muted }]}>{label}</Text>
        </View>
        <Text numberOfLines={1} style={styles.jobBlockTime}>
          {minToHm(start)}–{minToHm(start + dur)}
        </Text>
      </View>
    );
  };

  const renderLane = (crew: any, laneJobs: any[], opts: { offRoster?: boolean } = {}) => {
    const meta = statusMeta(crew?.status || 'working');
    const unavailable = STATUS_ORDER.includes(crew?.status) && crew?.status !== 'working';
    const selecting = !!selectedJobId && !opts.offRoster;
    return (
      <Pressable
        key={opts.offRoster ? 'off-roster' : crew.team_id}
        onPress={() => !opts.offRoster && onLaneTap(crew)}
        style={[
          styles.lane,
          { width: totalWidth, height: ROW_H },
          unavailable && styles.laneUnavailable,
          selecting && styles.laneSelectable,
        ]}
      >
        {/* slot gridlines */}
        {slotStarts.map((t) => (
          <View key={t} style={[styles.gridCell, { left: (t - dayStart) * PX_PER_MIN, width: colW }]} />
        ))}
        {laneJobs.map(renderJobBlock)}
        {selecting && (
          <View style={styles.laneTapHint} pointerEvents="none">
            <Text style={styles.laneTapHintText}>Tap to assign here</Text>
          </View>
        )}
        {busyCrewId === crew?.team_id && (
          <View style={styles.laneBusy}><ActivityIndicator size="small" color={C.primary} /></View>
        )}
      </Pressable>
    );
  };

  const renderCrewLabel = (crew: any) => {
    const meta = statusMeta(crew?.status || 'working');
    const Ico = meta.Icon;
    return (
      <TouchableOpacity
        key={crew.team_id}
        style={[styles.labelCell, { height: ROW_H }]}
        activeOpacity={0.7}
        onPress={() => setAvailCrew(crew)}
      >
        <Text numberOfLines={1} style={styles.crewName}>{crew.name || 'Team'}</Text>
        <View style={[styles.statusChip, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
          <Ico size={10} weight="fill" color={meta.color} />
          <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {crew.shift_start && crew.shift_end ? (
          <Text style={styles.shiftText}>{String(crew.shift_start).slice(0, 5)}–{String(crew.shift_end).slice(0, 5)}</Text>
        ) : (
          <Text style={styles.shiftText}>{crew.member_count ?? 0} member{crew.member_count === 1 ? '' : 's'}</Text>
        )}
      </TouchableOpacity>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScreenHeader title="Schedule Board" subtitle="Crews × time slots" />

      {/* Date nav */}
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.dateNavBtn} onPress={() => setDate((d) => shiftYmd(d, -1))}>
          <CaretLeft size={18} weight="bold" color={C.foreground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateCenter} onPress={() => setDate(todayYmd())} activeOpacity={0.7}>
          <Text style={styles.dateText}>{prettyDate(date)}</Text>
          {date !== todayYmd() && <Text style={styles.todayHint}>Tap for today</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateNavBtn} onPress={() => setDate((d) => shiftYmd(d, 1))}>
          <CaretRight size={18} weight="bold" color={C.foreground} />
        </TouchableOpacity>
      </View>

      {/* Selection banner / Unassigned strip */}
      {selectedJob ? (
        <View style={styles.selectBanner}>
          <Warning size={15} weight="fill" color={C.primaryFg} />
          <Text numberOfLines={1} style={styles.selectBannerText}>
            Assigning {selectedJob.resource_type === 'vehicle' ? 'car wash' : 'tank'} · {selectedJob.customer_name || '—'} — tap a crew lane
          </Text>
          <TouchableOpacity onPress={() => setSelectedJobId(null)}><Text style={styles.selectCancel}>Cancel</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={styles.unassignedBar}>
          <Text style={styles.unassignedLabel}>Unassigned ({unassigned.length})</Text>
          {unassigned.length === 0 ? (
            <Text style={styles.unassignedEmpty}>All jobs assigned 🎉</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unassignedChips}>
              {unassigned.map((j) => {
                const isVeh = j.resource_type === 'vehicle';
                const Ico = isVeh ? Car : Drop;
                return (
                  <TouchableOpacity
                    key={j.id}
                    style={[styles.chip, selectedJobId === j.id && styles.chipActive]}
                    onPress={() => setSelectedJobId(selectedJobId === j.id ? null : j.id)}
                    activeOpacity={0.7}
                  >
                    <Ico size={12} weight="fill" color={selectedJobId === j.id ? C.primaryFg : (isVeh ? C.warning : C.primary)} />
                    <Text numberOfLines={1} style={[styles.chipText, selectedJobId === j.id && styles.chipTextActive]}>
                      {minToHm(jobStartMin(j.scheduled_at))} · {j.customer_name || (isVeh ? 'Car' : 'Tank')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : crews.length === 0 ? (
        <View style={styles.center}>
          <Users size={44} weight="regular" color={C.muted} />
          <Text style={styles.emptyTitle}>No teams on roster</Text>
          <Text style={styles.emptySub}>Create field teams to see crew lanes here.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.gridScroll}
          refreshControl={Platform.OS !== 'web' ? <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} /> : undefined}
        >
          <View style={styles.gridRow}>
            {/* Frozen crew-label column */}
            <View style={{ width: LABEL_W }}>
              <View style={[styles.labelCorner, { height: HEADER_H }]}>
                <Text style={styles.cornerText}>Crew</Text>
              </View>
              {crews.map(renderCrewLabel)}
              {offRoster.length > 0 && (
                <View style={[styles.labelCell, { height: ROW_H }]}>
                  <Text numberOfLines={1} style={styles.crewName}>Off-roster</Text>
                  <Text style={styles.shiftText}>{offRoster.length} job(s)</Text>
                </View>
              )}
            </View>

            {/* Scrollable timeline */}
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width: totalWidth }}>
              <View>
                {/* time header */}
                <View style={[styles.timeHeader, { width: totalWidth, height: HEADER_H }]}>
                  {slotStarts.map((t) => (
                    <View key={t} style={[styles.timeCell, { left: (t - dayStart) * PX_PER_MIN, width: colW }]}>
                      <Text style={styles.timeCellText}>{minToHm(t)}</Text>
                    </View>
                  ))}
                </View>
                {crews.map((crew) => renderLane(crew, byTeam[crew.team_id] || []))}
                {offRoster.length > 0 && renderLane({ team_id: '__off__', status: 'off' }, offRoster, { offRoster: true })}
              </View>
            </ScrollView>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}><Drop size={12} weight="fill" color={C.primary} /><Text style={styles.legendText}>Tank</Text></View>
            <View style={styles.legendItem}><Car size={12} weight="fill" color={C.warning} /><Text style={styles.legendText}>Car wash</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDash]} /><Text style={styles.legendText}>In progress</Text></View>
            <View style={styles.legendItem}><Wrench size={12} weight="fill" color={C.muted} /><Text style={styles.legendText}>Tap a crew name to set leave/shift</Text></View>
          </View>
        </ScrollView>
      )}

      {/* Availability picker */}
      <Modal visible={!!availCrew} transparent animationType="fade" onRequestClose={() => setAvailCrew(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAvailCrew(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{availCrew?.name || availCrew?.phone || 'Crew'}</Text>
            <Text style={styles.modalSub}>Availability for {prettyDate(date)}</Text>
            {STATUS_ORDER.map((st) => {
              const meta = statusMeta(st);
              const Ico = meta.Icon;
              const active = (availCrew?.status || 'working') === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusOption, active && { borderColor: meta.color, backgroundColor: meta.color + '18' }]}
                  onPress={() => setAvailability(availCrew, st)}
                  activeOpacity={0.7}
                >
                  <Ico size={18} weight="fill" color={meta.color} />
                  <Text style={styles.statusOptionText}>{meta.label}</Text>
                  {active && <Check size={16} weight="bold" color={meta.color} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setAvailCrew(null)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.foreground },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center' },

  dateBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dateNavBtn: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceElevated,
  },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateText: { fontSize: 16, fontWeight: '800', color: C.foreground },
  todayHint: { fontSize: 11, color: C.primary, fontWeight: '600', marginTop: 1 },

  selectBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 11,
  },
  selectBannerText: { flex: 1, color: C.primaryFg, fontWeight: '700', fontSize: 13 },
  selectCancel: { color: C.primaryFg, fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' },

  unassignedBar: {
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  unassignedLabel: { fontSize: 12, fontWeight: '800', color: C.foreground, marginBottom: 8, letterSpacing: 0.3 },
  unassignedEmpty: { fontSize: 12, color: C.muted },
  unassignedChips: { gap: 8, flexDirection: 'row', paddingRight: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 200,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: C.surfaceElevated, borderWidth: 1.5, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: C.foreground },
  chipTextActive: { color: C.primaryFg },

  gridScroll: { flex: 1 },
  gridRow: { flexDirection: 'row', padding: 12, paddingBottom: 0 },
  labelCorner: {
    justifyContent: 'center', paddingLeft: 4,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cornerText: { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.5 },
  labelCell: {
    justifyContent: 'center', gap: 4, paddingRight: 8, paddingLeft: 4,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  crewName: { fontSize: 13, fontWeight: '800', color: C.foreground },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  statusChipText: { fontSize: 9.5, fontWeight: '800' },
  shiftText: { fontSize: 10, color: C.muted, fontWeight: '600' },

  timeHeader: { position: 'relative', borderBottomWidth: 1, borderBottomColor: C.border },
  timeCell: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: C.border, paddingLeft: 4 },
  timeCellText: { fontSize: 10, color: C.muted, fontWeight: '700' },

  lane: { position: 'relative', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.background },
  laneUnavailable: { backgroundColor: C.surfaceElevated, opacity: 0.55 },
  laneSelectable: { backgroundColor: C.primaryBg },
  gridCell: { position: 'absolute', top: 0, bottom: 0, borderLeftWidth: 1, borderLeftColor: C.border },
  laneTapHint: { position: 'absolute', right: 8, top: 6 },
  laneTapHintText: { fontSize: 10, color: C.primary, fontWeight: '700', fontStyle: 'italic' },
  laneBusy: { position: 'absolute', left: 8, top: ROW_H / 2 - 10 },

  jobBlock: {
    position: 'absolute', top: 8, bottom: 8, borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 7, paddingVertical: 5, justifyContent: 'center', overflow: 'hidden',
  },
  jobBlockDone: { opacity: 0.6 },
  jobBlockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobBlockText: { flex: 1, fontSize: 11, fontWeight: '800', color: C.foreground },
  jobBlockTime: { fontSize: 9.5, color: C.muted, fontWeight: '600', marginTop: 2 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, padding: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  legendDash: { width: 16, height: 0, borderTopWidth: 1.5, borderTopColor: C.foreground, borderStyle: 'dashed' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalSheet: { backgroundColor: C.surface, borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.foreground },
  modalSub: { fontSize: 12, color: C.muted, marginBottom: 14, marginTop: 2 },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceElevated,
  },
  statusOptionText: { flex: 1, fontSize: 15, fontWeight: '700', color: C.foreground },
  modalCancel: { marginTop: 6, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: C.muted },
});

export default AdminScheduleBoardScreen;
