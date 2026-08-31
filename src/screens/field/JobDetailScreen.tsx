import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, Linking, Platform, StatusBar, Modal,
} from 'react-native';
import { capturePhoto } from '../../services/cameraCapture';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useNavigation, useRoute } from '@react-navigation/native';
import api, { jobAPI, complianceAPI, ecoScoreAPI, fieldAPI, uploadAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Job } from '../../types';
import WebContainer from '../../components/WebContainer';
import {
  ArrowLeft, Calendar, Phone, CheckCircle, ArrowsClockwise,
  Hourglass, Key, ClipboardText, Siren, ArrowRight, MapPin, NavigationArrow, QrCode,
  Trophy, Crown, Star, Lightning, Flask, Warning, Camera, Receipt, XCircle, Wrench,
  Users, Lock, X, HandPalm,
} from '../../components/Icons';

const TANK_TYPES = ['overhead', 'underground', 'sump', 'sintex'] as const;

const JobDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const jobId = route.params?.job_id;

  const [job, setJob] = useState<Job | null>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [ecoScore, setEcoScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // Arrival flow — en-route + confined-space gas check + pre-damage log
  const [enRoute, setEnRoute] = useState(false);
  const [enRouteLoading, setEnRouteLoading] = useState(false);
  const [gas, setGas] = useState({ o2: '', o3: '', h2s: '', co: '' });
  const [gasLoading, setGasLoading] = useState(false);
  const [gasResult, setGasResult] = useState<{ result: string; instruction?: string | null } | null>(null);
  const [dmgOpen, setDmgOpen] = useState(false);
  const [dmgLevel, setDmgLevel] = useState<'none' | 'minor' | 'major' | null>(null);
  const [dmgNotes, setDmgNotes] = useState('');
  const [dmgPhotoUrl, setDmgPhotoUrl] = useState('');
  const [dmgUploading, setDmgUploading] = useState(false);
  const [dmgSaving, setDmgSaving] = useState(false);
  const [dmgLogged, setDmgLogged] = useState<string | null>(null);

  // On-site tank details confirm/correct (step 1.5)
  const [tankOpen, setTankOpen] = useState(false);
  const [tankType, setTankType] = useState('overhead');
  const [tankLitres, setTankLitres] = useState('');
  const [tankCount, setTankCount] = useState('1');
  const [tankReason, setTankReason] = useState('');
  const [tankSaving, setTankSaving] = useState(false);
  const [tankConfirmed, setTankConfirmed] = useState(false);

  // Duty delegation (leader hands the job/day to a member)
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [delegateScope, setDelegateScope] = useState<'job' | 'day'>('job');
  const [delegateBusy, setDelegateBusy] = useState(false);

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const jobRes = await jobAPI.getJob(jobId) as any;
      const j = jobRes.data?.job;
      setJob(j);
      // Departure only counts for TODAY — a stale departure_time from an
      // earlier test day must not show "en route" (the daily van check
      // resets each shift, so the flow restarts from On My Way).
      setEnRoute(
        !!j?.departure_time &&
        new Date(j.departure_time).toDateString() === new Date().toDateString()
      );
      setDmgLogged(j?.pre_damage_level || null);
      setTankConfirmed(!!j?.tank_confirmed_at);
      if (j) {
        // Prefill from booked values (or last confirmed values on refetch)
        setTankType(j.tank_type || 'overhead');
        setTankLitres(j.tank_size_litres != null ? String(j.tank_size_litres) : '');
        setTankCount(String(j.tank_count || 1));
      }
      if (j) {
        try {
          const cRes = await complianceAPI.getStatus(j.id) as any;
          setCompliance(cRes.data);
        } catch (_) {}
        if (j.status === 'completed') {
          try {
            const eRes = await ecoScoreAPI.getScore(j.id) as any;
            setEcoScore(eRes.data?.eco_metrics || eRes.data);
          } catch (_) {}
        }
      }
    } catch (_) {
      Alert.alert('Error', 'Could not load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStartOtp = async () => {
    setStarting(true);
    try {
      await jobAPI.generateStartOtp(jobId);
      navigation.navigate('OtpEntry', { jobId, type: 'start' });
    } catch (err: any) {
      const { status, message } = errInfo(err);
      // Gate G-0 — route the crew straight to the Van Check instead of a dead end.
      if (status === 423 && /van check|G-0/i.test(message || '')) {
        Alert.alert('Van Check Needed', message || "Complete today's van check before starting jobs.", [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Van Check', onPress: () => navigation.navigate('VanCheck') },
        ]);
      } else {
        Alert.alert('Error', message || err.message || 'Could not generate start OTP');
      }
    } finally {
      setStarting(false);
    }
  };

  const handleGenerateEndOtp = async () => {
    setStarting(true);
    try {
      await jobAPI.generateEndOtp(jobId);
      navigation.navigate('OtpEntry', { jobId, type: 'end' });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not generate end OTP');
    } finally {
      setStarting(false);
    }
  };

  // Api interceptor rejects with { message, status }; raw axios errors carry
  // e.response — read both shapes so safety gates (423/429) never crash us.
  const errInfo = (e: any) => {
    const d = e?.response?.data || e || {};
    return { status: e?.status ?? e?.response?.status, message: d?.message as string | undefined };
  };

  const handleEnRoute = async () => {
    if (!job) return;
    setEnRouteLoading(true);
    try {
      await fieldAPI.markEnRoute(job.id);
      setEnRoute(true);
      Alert.alert('On My Way', 'Departure logged.');
    } catch (e: any) {
      const { status, message } = errInfo(e);
      if (status === 423) {
        Alert.alert('Van Check Needed', message || 'Complete today\'s van check before departing.', [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Van Check', onPress: () => navigation.navigate('VanCheck') },
        ]);
      } else {
        Alert.alert('Error', message || 'Could not log departure');
      }
    } finally {
      setEnRouteLoading(false);
    }
  };

  const handleGasCheck = async () => {
    if (!job) return;
    const vals = {
      gas_o2_pct: parseFloat(gas.o2),
      gas_o3_ppm: parseFloat(gas.o3),
      gas_h2s_ppm: parseFloat(gas.h2s),
      gas_co_ppm: parseFloat(gas.co),
    };
    if (Object.values(vals).some(v => !Number.isFinite(v))) {
      Alert.alert('Missing Readings', 'Enter all four gas readings first.');
      return;
    }
    setGasLoading(true);
    try {
      const res = await fieldAPI.submitGasCheck(job.id, vals) as any;
      const d = res.data || {};
      setGasResult({ result: d.result, instruction: d.instruction });
    } catch (e: any) {
      const { message } = errInfo(e);
      Alert.alert('Blocked', message || 'Could not submit gas check');
    } finally {
      setGasLoading(false);
    }
  };

  const takeDamagePhoto = async () => {
    try {
      const uri = await capturePhoto();
      if (!uri) return; // cancelled
      setDmgUploading(true);
      const up = await uploadAPI.uploadPhoto(uri, 'damage') as any;
      const url = up.data?.url || up.url;
      if (url) setDmgPhotoUrl(url);
      else Alert.alert('Upload Failed', 'Could not upload the photo. Try again.');
    } catch (_) {
      Alert.alert('Upload Failed', 'Could not upload the photo. Try again.');
    } finally {
      setDmgUploading(false);
    }
  };

  const handleLogDamage = async () => {
    if (!job || !dmgLevel) return;
    if (dmgLevel !== 'none' && !dmgPhotoUrl) {
      Alert.alert('Photo Required', 'Take a photo of the damage first.');
      return;
    }
    setDmgSaving(true);
    try {
      await fieldAPI.logPreDamage(job.id, {
        level: dmgLevel,
        notes: dmgNotes.trim() || undefined,
        photo_url: dmgPhotoUrl || undefined,
      });
      setDmgLogged(dmgLevel);
      setDmgOpen(false);
    } catch (e: any) {
      const { message } = errInfo(e);
      Alert.alert('Error', message || 'Could not log damage');
    } finally {
      setDmgSaving(false);
    }
  };

  // True when the entered tank details differ from the booked ones — a change
  // reason becomes mandatory (backend enforces this too).
  const tankDiffers = () => {
    if (!job) return false;
    const litres = Number(tankLitres);
    const count = Math.max(1, Math.floor(Number(tankCount) || 1));
    return tankType !== (job.tank_type || '')
      || (Number.isFinite(litres) && litres !== Number(job.tank_size_litres))
      || count !== Number((job as any).tank_count || 1);
  };

  const handleConfirmTank = async () => {
    if (!job) return;
    const litres = Number(tankLitres);
    if (!Number.isFinite(litres) || litres <= 0) {
      Alert.alert('Missing Capacity', 'Enter the tank capacity in litres.');
      return;
    }
    if (tankDiffers() && !tankReason.trim()) {
      Alert.alert('Reason Required', 'Tank details differ from the booking — enter a short reason for the change.');
      return;
    }
    setTankSaving(true);
    try {
      const res = await api.post(`/field/jobs/${job.id}/confirm-tank`, {
        tank_type: tankType,
        tank_capacity_litres: litres,
        tank_count: Math.max(1, Math.floor(Number(tankCount) || 1)),
        reason: tankReason.trim() || undefined,
      }) as any;
      const d = res?.data || {};
      setTankConfirmed(true);
      setTankOpen(false);
      if (d.changed) {
        Alert.alert('Admin Alerted', 'Tank details differ from the booking — admin has been alerted for repricing.');
      }
    } catch (e: any) {
      const { message } = errInfo(e);
      Alert.alert('Error', message || 'Could not confirm tank details');
    } finally {
      setTankSaving(false);
    }
  };

  const openDelegate = async () => {
    setDelegateOpen(true); setDelegateScope('job'); setMembersLoading(true);
    try {
      const res = await jobAPI.getJobTeamMembers(jobId) as any;
      setMembers(res.data?.members || []);
    } catch (e: any) {
      Alert.alert('Error', errInfo(e).message || 'Could not load team members');
    } finally { setMembersLoading(false); }
  };

  const doDelegate = async (agentId: string) => {
    setDelegateBusy(true);
    try {
      await jobAPI.delegateJob(jobId, agentId, delegateScope);
      setDelegateOpen(false);
      Alert.alert('Delegated', delegateScope === 'day'
        ? 'Duty delegated for the whole day. Your teammate can now work the team’s jobs today.'
        : 'Duty delegated for this job. Your teammate can now work it.');
      fetchData();
    } catch (e: any) {
      Alert.alert('Could not delegate', errInfo(e).message || 'Please try again.');
    } finally { setDelegateBusy(false); }
  };

  const revokeDeleg = async (delegationId: string) => {
    try { await jobAPI.revokeDelegation(jobId, delegationId); fetchData(); }
    catch (e: any) { Alert.alert('Error', errInfo(e).message || 'Could not remove delegation'); }
  };

  const callCustomer = () => {
    if (job?.customer_phone) {
      Linking.openURL(`tel:${job.customer_phone}`);
    }
  };

  const openInMaps = () => {
    const j: any = job || {};
    // Best coordinates available: job GPS → booking GPS
    const lat = j.location_lat ?? j.booking_lat;
    const lng = j.location_lng ?? j.booking_lng;
    // Best address text: booking address → auto-wash location_address
    const address = j.address || j.location_address;

    if (lat != null && lng != null) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      });
      Linking.openURL(url!).catch(() => {});
    } else if (address) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`).catch(() => {});
    } else {
      Alert.alert('No location on this job', 'This booking has no saved address or GPS coordinates.');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'in_progress') return C.primary;
    if (s === 'cancelled') return C.danger;
    return C.warning;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackRow}>
          <ArrowLeft size={18} weight="regular" color={C.primary} />
          <Text style={styles.link}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(job.status) }]}>
          <Text style={styles.badgeText}>{job.status === 'in_progress' ? 'ACTIVE' : job.status?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        <WebContainer variant="narrow">
        {/* Job Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.jobIdText}>Job #{job.id?.slice(0, 8).toUpperCase()}</Text>
          {job.booking_id && (
            <Text style={styles.jobIdText}>Booking #{job.booking_id?.slice(0, 8).toUpperCase()}</Text>
          )}
          <Text style={styles.jobTitle}>
            {job.job_type === 'auto_wash'
              ? 'CAR WASH JOB'
              : (job.tank_type?.replace('_', ' ').toUpperCase() || 'CLEANING JOB')}
          </Text>
          {job.tank_size_litres != null && (
            <Text style={styles.jobSize}>{job.tank_size_litres} Litres</Text>
          )}
          <View style={styles.scheduledRow}>
            <Calendar size={16} weight="regular" color={C.primary} />
            <Text style={styles.scheduledAt}>{formatDate(job.scheduled_at)}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <View style={styles.customerCard}>
          <View style={styles.customerRow}>
            <Text style={styles.customerName}>{job.customer_name || 'Customer'}</Text>
            <TouchableOpacity style={styles.callBtn} onPress={callCustomer}>
              <Phone size={14} weight="regular" color={C.primary} />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.customerPhone}>{job.customer_phone}</Text>
          <Text style={styles.address}>{job.address}</Text>
          <TouchableOpacity style={styles.navigateBtn} onPress={openInMaps}>
            <NavigationArrow size={16} weight="fill" color={C.primaryFg} />
            <Text style={styles.navigateBtnText}>Navigate to Location</Text>
          </TouchableOpacity>
        </View>

        {/* Add-ons the customer purchased — crew must know what to perform
            (e.g. UV step auto-skips when uv_sterilization isn't here). */}
        {Array.isArray(job.addons) && job.addons.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Add-ons Purchased</Text>
            <View style={styles.customerCard}>
              {job.addons.map((code: string) => (
                <View key={code} style={styles.addonRow}>
                  <CheckCircle size={15} weight="fill" color={C.success} />
                  <Text style={styles.addonText}>
                    {String(code).split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Compliance Progress */}
        {compliance && (
          <>
            <Text style={styles.sectionTitle}>Compliance Progress</Text>
            <View style={styles.complianceCard}>
              <View style={styles.complianceHeader}>
                <Text style={styles.pct}>{compliance.completion_percentage}%</Text>
                <Text style={styles.pctSub}>{compliance.completed_steps}/{compliance.total_steps} steps</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${compliance.completion_percentage}%` }]} />
              </View>
              {compliance.checklist?.map((step: any) => (
                <View key={step.step_number} style={styles.stepRow}>
                  <View style={styles.stepIconContainer}>
                    {step.completed ? (
                      <CheckCircle size={18} weight="fill" color={C.success} />
                    ) : step.logged ? (
                      <ArrowsClockwise size={18} weight="regular" color={C.primary} />
                    ) : (
                      <Hourglass size={18} weight="regular" color={C.warning} />
                    )}
                  </View>
                  <Text style={[styles.stepName, step.completed && styles.stepDone]}>
                    {step.step_number}. {step.step_name}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Duty & delegation — who can work this job */}
        {(job.status === 'scheduled' || job.status === 'in_progress') && (
          <View style={styles.dutyCard}>
            <View style={styles.cardTitleRow}>
              {(job as any).can_work
                ? <Users size={16} weight="fill" color={C.primary} />
                : <Lock size={16} weight="fill" color={C.muted} />}
              <Text style={styles.cardTitle}>Who works this job</Text>
            </View>
            <Text style={styles.dutyHint}>
              {(job as any).is_leader
                ? 'You’re the crew leader — you can work it, or hand the duty to a teammate for this job or your whole day.'
                : (job as any).can_work
                  ? 'Your leader delegated this to you — you can work it.'
                  : 'View-only. Only the crew leader or a delegated member can work this job. Ask your leader to delegate it to you.'}
            </Text>

            {Array.isArray((job as any).delegates) && (job as any).delegates.length > 0 && (
              <View style={{ marginTop: 10, gap: 6 }}>
                {(job as any).delegates.map((d: any) => (
                  <View key={d.id} style={styles.delegRow}>
                    <HandPalm size={13} weight="fill" color={C.success} />
                    <Text style={styles.delegText} numberOfLines={1}>
                      {d.name || d.phone} · {d.scope === 'day' ? 'whole day' : 'this job'}
                    </Text>
                    {(job as any).is_leader && (
                      <TouchableOpacity onPress={() => revokeDeleg(d.id)}>
                        <Text style={styles.delegRevoke}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {(job as any).is_leader && (
              <TouchableOpacity style={styles.delegBtn} onPress={openDelegate} activeOpacity={0.85}>
                <Users size={15} weight="bold" color={C.primaryFg} />
                <Text style={styles.delegBtnText}>Delegate duty to a teammate</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        {job.status === 'scheduled' && (job as any).can_work && (
          <>
            {enRoute ? (
              <View style={styles.enRouteDone}>
                <CheckCircle size={18} weight="fill" color={C.success} />
                <Text style={styles.enRouteDoneText}>Departure logged — you're en route</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.enRouteBtn, enRouteLoading && styles.btnDisabled]}
                onPress={handleEnRoute}
                disabled={enRouteLoading}
                activeOpacity={0.8}
              >
                {enRouteLoading ? (
                  <ActivityIndicator color={C.primary} />
                ) : (
                  <View style={styles.actionBtnContent}>
                    <NavigationArrow size={18} weight="fill" color={C.primary} />
                    <Text style={[styles.actionBtnText, { color: C.primary }]}>On My Way</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.startBtn, starting && styles.btnDisabled]}
              onPress={handleGenerateStartOtp}
              disabled={starting}
              activeOpacity={0.8}
            >
              {starting ? (
                <ActivityIndicator color={C.primaryFg} />
              ) : (
                <View style={styles.actionBtnContent}>
                  <Key size={18} weight="fill" color={C.primaryFg} />
                  <Text style={styles.actionBtnText}>Start Job (OTP)</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {job.status === 'in_progress' && (job as any).can_work && (
          <>
            {/* Car wash jobs use the 6-step wash flow, not the tank SOP checklist.
                This button is the ONLY route into AutoWashJob — without it the
                crew can't log steps and the customer's progress stays at 0/6. */}
            {job.job_type === 'auto_wash' ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.checklistBtn]}
                onPress={() => navigation.navigate('AutoWashJob', { id: job.id })}
                activeOpacity={0.8}
              >
                <View style={styles.actionBtnContent}>
                  <ClipboardText size={18} weight="regular" color={C.primaryFg} />
                  <Text style={styles.actionBtnText}>Open Wash Steps (6 stages)</Text>
                </View>
              </TouchableOpacity>
            ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.checklistBtn]}
              onPress={() => navigation.navigate('Checklist', { job_id: job.id })}
              activeOpacity={0.8}
            >
              <View style={styles.actionBtnContent}>
                <ClipboardText size={18} weight="regular" color={C.primaryFg} />
                <Text style={styles.actionBtnText}>
                  Open Compliance Checklist ({compliance?.completion_percentage ?? 0}%)
                </Text>
              </View>
            </TouchableOpacity>
            )}

            {/* Confined-space gas check — underground / sump tanks only */}
            {(job.tank_type === 'underground' || job.tank_type === 'sump') && (
              <View style={styles.gasCard}>
                <View style={styles.cardTitleRow}>
                  <Flask size={16} weight="fill" color={C.primary} />
                  <Text style={styles.cardTitle}>Confined Space Gas Check</Text>
                </View>
                <View style={styles.gasGrid}>
                  {([
                    ['o2', 'O₂ %'],
                    ['o3', 'O₃ ppm'],
                    ['h2s', 'H₂S ppm'],
                    ['co', 'CO ppm'],
                  ] as const).map(([key, label]) => (
                    <View key={key} style={styles.gasField}>
                      <Text style={styles.gasLabel}>{label}</Text>
                      <TextInput
                        style={styles.gasInput}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor={C.muted}
                        value={gas[key]}
                        onChangeText={(t) => setGas(g => ({ ...g, [key]: t }))}
                      />
                    </View>
                  ))}
                </View>
                {gasResult && (
                  <View style={[styles.gasResultRow, { backgroundColor: gasResult.result === 'PASS' ? C.successBg : C.dangerBg }]}>
                    {gasResult.result === 'PASS' ? (
                      <CheckCircle size={18} weight="fill" color={C.success} />
                    ) : (
                      <XCircle size={18} weight="fill" color={C.danger} />
                    )}
                    <Text style={[styles.gasResultText, { color: gasResult.result === 'PASS' ? C.success : C.danger }]}>
                      {gasResult.result === 'PASS' ? 'PASS — safe to proceed' : `FAIL${gasResult.instruction ? ` — ${gasResult.instruction}` : ''}`}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.gasSubmitBtn, gasLoading && styles.btnDisabled]}
                  onPress={handleGasCheck}
                  disabled={gasLoading}
                  activeOpacity={0.8}
                >
                  {gasLoading ? (
                    <ActivityIndicator color={C.primaryFg} />
                  ) : (
                    <Text style={styles.gasSubmitText}>{gasResult ? 'Recheck Gas Levels' : 'Submit Gas Check'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Confirm tank details (step 1.5) — collapsed card until confirmed */}
            {tankConfirmed ? (
              <View style={styles.dmgLoggedRow}>
                <CheckCircle size={16} weight="fill" color={C.success} />
                <Text style={styles.dmgLoggedText}>Tank details confirmed ✓</Text>
              </View>
            ) : (
              <View style={styles.tankCard}>
                <TouchableOpacity style={styles.cardTitleRow} onPress={() => setTankOpen(o => !o)} activeOpacity={0.7}>
                  <Wrench size={16} weight="fill" color={C.primary} />
                  <Text style={styles.cardTitle}>Confirm Tank Details</Text>
                  <Text style={styles.dmgToggle}>{tankOpen ? 'Hide' : 'Open'}</Text>
                </TouchableOpacity>
                {tankOpen && (
                  <>
                    <View style={styles.tankChipRow}>
                      {TANK_TYPES.map(t => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.tankChip, tankType === t && styles.tankChipActive]}
                          onPress={() => setTankType(t)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.tankChipText, tankType === t && styles.tankChipTextActive]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.tankInputRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gasLabel}>Capacity (litres)</Text>
                        <TextInput
                          style={styles.gasInput}
                          keyboardType="number-pad"
                          placeholder="1000"
                          placeholderTextColor={C.muted}
                          value={tankLitres}
                          onChangeText={setTankLitres}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gasLabel}>Tank count</Text>
                        <TextInput
                          style={styles.gasInput}
                          keyboardType="number-pad"
                          placeholder="1"
                          placeholderTextColor={C.muted}
                          value={tankCount}
                          onChangeText={setTankCount}
                        />
                      </View>
                    </View>
                    {tankDiffers() && (
                      <Text style={styles.tankDifferNote}>
                        Details differ from the booking — a change reason is required and admin will be alerted for repricing.
                      </Text>
                    )}
                    <TextInput
                      style={styles.dmgNotes}
                      placeholder={tankDiffers() ? 'Reason for change (required)' : 'Reason (only needed if different from booking)'}
                      placeholderTextColor={C.muted}
                      value={tankReason}
                      onChangeText={setTankReason}
                      multiline
                    />
                    <TouchableOpacity
                      style={[styles.dmgSaveBtn, tankSaving && styles.btnDisabled]}
                      onPress={handleConfirmTank}
                      disabled={tankSaving}
                      activeOpacity={0.8}
                    >
                      {tankSaving ? (
                        <ActivityIndicator color={C.primaryFg} />
                      ) : (
                        <Text style={styles.dmgSaveText}>Confirm Tank Details</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Pre-existing damage — small collapsed card until logged */}
            {dmgLogged ? (
              <View style={styles.dmgLoggedRow}>
                <CheckCircle size={16} weight="fill" color={C.success} />
                <Text style={styles.dmgLoggedText}>Pre-existing damage logged: {dmgLogged.toUpperCase()}</Text>
              </View>
            ) : (
              <View style={styles.dmgCard}>
                <TouchableOpacity style={styles.cardTitleRow} onPress={() => setDmgOpen(o => !o)} activeOpacity={0.7}>
                  <Warning size={16} weight="fill" color={C.warning} />
                  <Text style={styles.cardTitle}>Pre-existing Damage</Text>
                  <Text style={styles.dmgToggle}>{dmgOpen ? 'Hide' : 'Log'}</Text>
                </TouchableOpacity>
                {dmgOpen && (
                  <>
                    <View style={styles.dmgChipRow}>
                      {(['none', 'minor', 'major'] as const).map(lvl => (
                        <TouchableOpacity
                          key={lvl}
                          style={[styles.dmgChip, dmgLevel === lvl && styles.dmgChipActive]}
                          onPress={() => setDmgLevel(lvl)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dmgChipText, dmgLevel === lvl && styles.dmgChipTextActive]}>
                            {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {dmgLevel && dmgLevel !== 'none' && (
                      <>
                        <TouchableOpacity
                          style={styles.dmgPhotoBtn}
                          onPress={takeDamagePhoto}
                          disabled={dmgUploading}
                          activeOpacity={0.7}
                        >
                          {dmgUploading ? (
                            <ActivityIndicator size="small" color={C.primary} />
                          ) : (
                            <Camera size={16} weight="regular" color={dmgPhotoUrl ? C.success : C.primary} />
                          )}
                          <Text style={[styles.dmgPhotoText, dmgPhotoUrl ? { color: C.success } : null]}>
                            {dmgPhotoUrl ? 'Photo attached ✓' : 'Take Damage Photo'}
                          </Text>
                        </TouchableOpacity>
                        <TextInput
                          style={styles.dmgNotes}
                          placeholder="Notes — what's damaged?"
                          placeholderTextColor={C.muted}
                          value={dmgNotes}
                          onChangeText={setDmgNotes}
                          multiline
                        />
                      </>
                    )}
                    <TouchableOpacity
                      style={[styles.dmgSaveBtn, (!dmgLevel || dmgSaving) && styles.btnDisabled]}
                      onPress={handleLogDamage}
                      disabled={!dmgLevel || dmgSaving}
                      activeOpacity={0.8}
                    >
                      {dmgSaving ? (
                        <ActivityIndicator color={C.primaryFg} />
                      ) : (
                        <Text style={styles.dmgSaveText}>Save Damage Log</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {compliance?.completion_percentage === 100 && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.success }, starting && styles.btnDisabled]}
                onPress={handleGenerateEndOtp}
                disabled={starting}
                activeOpacity={0.8}
              >
                {starting ? (
                  <ActivityIndicator color={C.primaryFg} />
                ) : (
                  <View style={styles.actionBtnContent}>
                    <Key size={18} weight="fill" color={C.primaryFg} />
                    <Text style={styles.actionBtnText}>Complete Job (End OTP)</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {job.status === 'completed' && (
          <>
            <View style={styles.completedBox}>
              <CheckCircle size={40} weight="fill" color={C.success} />
              <Text style={styles.completedText}>Job Completed</Text>
              {job.completed_at && (
                <Text style={styles.completedTime}>{formatDate(job.completed_at)}</Text>
              )}
            </View>

            {ecoScore && (
              <View style={styles.ecoCard}>
                <View style={styles.ecoLeft}>
                  <View style={styles.ecoCircle}>
                    <Text style={styles.ecoNum}>{ecoScore.eco_score ?? '--'}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ecoTitle}>EcoScore for this job</Text>
                  <View style={styles.ecoBadgeRow}>
                    <Star size={12} weight="fill" color={C.gold} />
                    <Text style={styles.ecoBadge}>{ecoScore.badge_level?.toUpperCase() || 'UNRATED'}</Text>
                  </View>
                  {ecoScore.score_breakdown && (
                    <Text style={styles.ecoSub}>
                      Water: {ecoScore.score_breakdown.water_score ?? '-'} · PPE: {ecoScore.score_breakdown.ppe_score ?? '-'} · Chemical: {ecoScore.score_breakdown.chemical_score ?? '-'}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {job.amc_plan && (
              <View style={styles.amcBadge}>
                <Crown size={14} weight="fill" color={C.gold} />
                <Text style={styles.amcBadgeText}>AMC Job — {job.amc_plan?.toUpperCase()} Plan</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.primary }]}
              onPress={() => navigation.navigate('Closeout', {
                jobId: job.id,
                amountPaise: (job as any).amount_paise,
                paymentStatus: (job as any).payment_status,
              })}
              activeOpacity={0.8}
            >
              <View style={styles.actionBtnContent}>
                <Receipt size={18} weight="fill" color={C.primaryFg} />
                <Text style={styles.actionBtnText}>Closeout — Payment & AMC</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.primary }]}
              onPress={() => navigation.navigate('QrScanner')}
              activeOpacity={0.8}
            >
              <View style={styles.actionBtnContent}>
                <QrCode size={18} weight="regular" color={C.primary} />
                <Text style={[styles.actionBtnText, { color: C.primary }]}>Scan Certificate QR</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Secondary Actions */}
        {job.status !== 'completed' && job.status !== 'cancelled' && (
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('IncidentReport', { job_id: job.id })}
              activeOpacity={0.7}
            >
              <View style={styles.secondaryIconContainer}>
                <Siren size={20} weight="fill" color={C.danger} />
              </View>
              <Text style={styles.secondaryBtnText}>Report Incident</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('JobTransfer', { job_id: job.id })}
              activeOpacity={0.7}
            >
              <View style={styles.secondaryIconContainer}>
                <ArrowsClockwise size={20} weight="regular" color={C.primary} />
              </View>
              <Text style={styles.secondaryBtnText}>Transfer Job</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('LiveStream', { job_id: job.id })}
              activeOpacity={0.7}
            >
              <View style={[styles.secondaryIconContainer, { backgroundColor: '#DC2626' + '22' }]}>
                <Lightning size={20} weight="fill" color="#DC2626" />
              </View>
              <Text style={styles.secondaryBtnText}>Go Live</Text>
            </TouchableOpacity>
          </View>
        )}
        </WebContainer>
      </ScrollView>

      {/* Delegate-duty modal */}
      <Modal visible={delegateOpen} transparent animationType="fade" onRequestClose={() => setDelegateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Delegate duty</Text>
              <TouchableOpacity onPress={() => setDelegateOpen(false)}><X size={18} weight="bold" color={C.muted} /></TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Hand this job to a teammate. They can work it; you keep access too.</Text>

            <View style={styles.scopeRow}>
              {(['job', 'day'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.scopeChip, delegateScope === s && styles.scopeChipActive]}
                  onPress={() => setDelegateScope(s)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.scopeChipText, delegateScope === s && styles.scopeChipTextActive]}>
                    {s === 'job' ? 'Just this job' : 'My whole day'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {membersLoading ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
            ) : members.length === 0 ? (
              <Text style={styles.dutyHint}>No other active members in your crew to delegate to.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 280 }}>
                {members.map((m) => (
                  <TouchableOpacity key={m.id} style={styles.memberRow} onPress={() => doDelegate(m.id)} disabled={delegateBusy} activeOpacity={0.7}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{String(m.name || m.phone || '?').slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{m.name || 'Member'}</Text>
                      <Text style={styles.memberPhone}>{m.phone}{m.role === 'leader' ? ' · leader' : ''}</Text>
                    </View>
                    {delegateBusy ? <ActivityIndicator size="small" color={C.primary} /> : <ArrowRight size={16} weight="bold" color={C.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.modalCancel} onPress={() => setDelegateOpen(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  errorText: { fontSize: 16, color: C.muted, marginBottom: 12 },
  goBackRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: C.primaryFg, fontSize: 10, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10, marginTop: 20 },
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  jobIdText: { fontSize: 12, color: C.primary, fontFamily: 'monospace', fontWeight: '600', marginBottom: 4 },
  jobTitle: { fontSize: 20, fontWeight: '700', color: C.foreground },
  jobSize: { fontSize: 14, color: C.muted, marginTop: 4 },
  scheduledRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  scheduledAt: { fontSize: 14, color: C.primary, fontWeight: '600' },
  customerCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  customerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  addonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  addonText: { fontSize: 14, fontWeight: '600', color: C.foreground },
  customerName: { fontSize: 16, fontWeight: '700', color: C.foreground },
  callBtn: {
    backgroundColor: C.primaryBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  callText: { fontSize: 13, color: C.primary, fontWeight: '700' },
  customerPhone: { fontSize: 13, color: C.muted, marginBottom: 6 },
  address: { fontSize: 13, color: C.muted, lineHeight: 20 },
  navigateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 12, alignSelf: 'flex-start',
  },
  navigateBtnText: { fontSize: 13, color: C.primaryFg, fontWeight: '600' },
  complianceCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  complianceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pct: { fontSize: 32, fontWeight: '700', color: C.primary, marginRight: 10 },
  pctSub: { fontSize: 13, color: C.muted },
  progressBarContainer: { height: 8, backgroundColor: C.surfaceElevated, borderRadius: 4, marginBottom: 14 },
  progressBarFill: { height: 8, backgroundColor: C.primary, borderRadius: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepIconContainer: { marginRight: 8, width: 20, alignItems: 'center' },
  stepName: { fontSize: 13, color: C.muted },
  stepDone: { color: C.success, fontWeight: '600' },
  actionBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  actionBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startBtn: { backgroundColor: C.primary },
  checklistBtn: { backgroundColor: C.primary },
  btnDisabled: { backgroundColor: C.muted },
  actionBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 16 },
  completedBox: {
    backgroundColor: C.successBg,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  completedText: { fontSize: 18, fontWeight: '700', color: C.success, marginTop: 8 },
  completedTime: { fontSize: 13, color: C.muted, marginTop: 4 },
  ecoCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: C.borderActive,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  ecoLeft: { alignItems: 'center' },
  ecoCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primaryBg, borderWidth: 2, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  ecoNum: { fontSize: 20, fontWeight: '700', color: C.primary },
  ecoTitle: { fontSize: 14, fontWeight: '700', color: C.foreground },
  ecoBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ecoBadge: { fontSize: 11, fontWeight: '700', color: C.gold },
  ecoSub: { fontSize: 11, color: C.muted, marginTop: 4 },
  amcBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.goldBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.gold,
  },
  amcBadgeText: { fontSize: 12, fontWeight: '700', color: C.gold },
  link: { color: C.primary, fontWeight: '600' },
  secondaryActions: {
    flexDirection: 'row', gap: 12, marginTop: 16,
  },
  secondaryBtn: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16,
    padding: 16, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  secondaryIconContainer: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: C.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  secondaryBtnText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  // En-route
  enRouteBtn: { backgroundColor: C.primaryBg, borderWidth: 1.5, borderColor: C.primary },
  enRouteDone: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.successBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 16,
  },
  enRouteDoneText: { fontSize: 13, fontWeight: '600', color: C.success },
  // Shared card bits
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, flex: 1 },
  // Gas check
  gasCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  gasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  gasField: { width: '47%', flexGrow: 1 },
  gasLabel: { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 4 },
  gasInput: {
    backgroundColor: C.surfaceElevated, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontWeight: '600', color: C.foreground,
  },
  gasResultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
  },
  gasResultText: { fontSize: 13, fontWeight: '700', flex: 1 },
  gasSubmitBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 12,
  },
  gasSubmitText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },
  // Confirm tank details
  tankCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  tankChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tankChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.surfaceElevated, borderWidth: 1.5, borderColor: C.border,
  },
  tankChipActive: { backgroundColor: C.primaryDim, borderColor: C.primary },
  tankChipText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tankChipTextActive: { color: C.primary },
  tankInputRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  tankDifferNote: {
    fontSize: 12, color: C.warning, fontWeight: '600',
    lineHeight: 17, marginTop: 10,
  },
  // Pre-existing damage
  dmgCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  dmgToggle: { fontSize: 13, fontWeight: '700', color: C.primary },
  dmgChipRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dmgChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: C.surfaceElevated, borderWidth: 1.5, borderColor: C.border,
  },
  dmgChipActive: { backgroundColor: C.primaryDim, borderColor: C.primary },
  dmgChipText: { fontSize: 13, fontWeight: '600', color: C.muted },
  dmgChipTextActive: { color: C.primary },
  dmgPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primaryBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 12,
  },
  dmgPhotoText: { fontSize: 13, fontWeight: '600', color: C.primary },
  dmgNotes: {
    backgroundColor: C.surfaceElevated, borderRadius: 12, padding: 12,
    fontSize: 14, color: C.foreground, minHeight: 60, marginTop: 10,
    textAlignVertical: 'top',
  },
  dmgSaveBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 12,
  },
  dmgSaveText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },
  dmgLoggedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.successBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 16,
  },
  dmgLoggedText: { fontSize: 13, fontWeight: '600', color: C.success },
  // Duty & delegation
  dutyCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: C.border,
  },
  dutyHint: { fontSize: 12.5, color: C.muted, lineHeight: 18, marginTop: 8 },
  delegRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  delegText: { flex: 1, fontSize: 12.5, color: C.foreground, fontWeight: '600' },
  delegRevoke: { fontSize: 12, color: C.danger, fontWeight: '700' },
  delegBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, marginTop: 12,
  },
  delegBtnText: { color: C.primaryFg, fontWeight: '800', fontSize: 13 },
  // Delegate modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 440, backgroundColor: C.surface, borderRadius: 18, padding: 18 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.foreground },
  modalSub: { fontSize: 12.5, color: C.muted, marginTop: 4, marginBottom: 12, lineHeight: 18 },
  scopeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  scopeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: C.surfaceElevated, borderWidth: 1.5, borderColor: C.border,
  },
  scopeChipActive: { backgroundColor: C.primaryBg, borderColor: C.primary },
  scopeChipText: { fontSize: 13, fontWeight: '700', color: C.muted },
  scopeChipTextActive: { color: C.primary },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 14, fontWeight: '800', color: C.primary },
  memberName: { fontSize: 15, fontWeight: '700', color: C.foreground },
  memberPhone: { fontSize: 12, color: C.muted, marginTop: 1 },
  modalCancel: { marginTop: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: C.muted },
});

export default JobDetailScreen;
