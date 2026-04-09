/**
 * LiveStreamScreen — field technician broadcasts live video during service.
 * Opens an Agora RTC channel as publisher.
 * NOTE: react-native-agora requires a native build (EAS). Will show a
 * fallback UI when running in Expo Go.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { livestreamAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft, Warning } from '../../components/Icons';

// Lazy-load Agora — not available in Expo Go (native module)
let RtcEngine: any = null;
let RtcLocalView: any = null;
let ChannelProfile: any = null;
let ClientRole: any = null;
let agoraAvailable = false;

try {
  const agora = require('react-native-agora');
  RtcEngine = agora.default;
  RtcLocalView = agora.RtcLocalView;
  ChannelProfile = agora.ChannelProfile;
  ClientRole = agora.ClientRole;
  agoraAvailable = true;
} catch {
  agoraAvailable = false;
}

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

const LiveStreamScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = StyleSheet.create(makeStylesObj(C));

  const jobId: string = route.params?.job_id || '';
  const channel = `job_${jobId.slice(0, 8)}`;

  const engineRef = useRef<any>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agoraAvailable) {
      setError('Live streaming requires a native build.\n\nRun: eas build --profile development\n\nNot available in Expo Go.');
      setLoading(false);
      return;
    }
    initAgora();
    return () => { engineRef.current?.destroy(); };
  }, []);

  const initAgora = async () => {
    try {
      const res = await livestreamAPI.getToken(channel, 'publisher') as any;
      const { app_id, token } = res.data || res;

      const engine = await RtcEngine.create(app_id || APP_ID);
      engineRef.current = engine;

      await engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
      await engine.setClientRole(ClientRole.Broadcaster);
      await engine.enableVideo();

      engine.addListener('UserJoined', () => setViewers((v: number) => v + 1));
      engine.addListener('UserOffline', () => setViewers((v: number) => Math.max(0, v - 1)));
      engine.addListener('JoinChannelSuccess', () => setJoined(true));
      engine.addListener('Error', (code: number) => setError(`Stream error: ${code}`));

      await engine.joinChannel(token, channel, null, 0);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to start stream');
      setLoading(false);
    }
  };

  const toggleMute = async () => {
    await engineRef.current?.muteLocalAudioStream(!muted);
    setMuted(m => !m);
  };

  const toggleCamera = async () => {
    await engineRef.current?.muteLocalVideoStream(!cameraOff);
    setCameraOff(c => !c);
  };

  const switchCamera = async () => {
    await engineRef.current?.switchCamera();
  };

  const endStream = () => {
    Alert.alert('End Stream', 'Stop live streaming for this job?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End', style: 'destructive',
        onPress: async () => {
          await engineRef.current?.leaveChannel();
          navigation.goBack();
        },
      },
    ]);
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Warning size={32} weight="fill" color={C.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn2} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn2Text}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera preview — full screen */}
      {joined && !cameraOff && RtcLocalView ? (
        <RtcLocalView.SurfaceView
          style={styles.video}
          channelId={channel}
          renderMode={1}
        />
      ) : (
        <View style={[styles.video, styles.noCamera]}>
          <Text style={styles.noCameraText}>{joined ? 'Camera Off' : 'Connecting...'}</Text>
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color="#fff" />
        </TouchableOpacity>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewersBox}>
          <Text style={styles.viewersText}>👁 {viewers}</Text>
        </View>
      </View>

      {/* Channel info */}
      <View style={styles.channelInfo}>
        <Text style={styles.channelText}>Channel: {channel}</Text>
        <Text style={styles.channelSub}>Share Job ID with customer to watch</Text>
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Starting stream...</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.ctrlBtn, muted && styles.ctrlBtnOff]} onPress={toggleMute}>
          <Text style={styles.ctrlIcon}>{muted ? '🔇' : '🎙️'}</Text>
          <Text style={styles.ctrlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, cameraOff && styles.ctrlBtnOff]} onPress={toggleCamera}>
          <Text style={styles.ctrlIcon}>{cameraOff ? '📷' : '📸'}</Text>
          <Text style={styles.ctrlLabel}>{cameraOff ? 'Camera On' : 'Camera Off'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={switchCamera}>
          <Text style={styles.ctrlIcon}>🔄</Text>
          <Text style={styles.ctrlLabel}>Flip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, styles.endBtn]} onPress={endStream}>
          <Text style={styles.ctrlIcon}>⏹</Text>
          <Text style={[styles.ctrlLabel, { color: '#fff' }]}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStylesObj = (C: any) => ({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: C.background, gap: 12, padding: 32 },
  video: { ...StyleSheet.absoluteFillObject },
  noCamera: { justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: '#111' },
  noCameraText: { color: '#666', fontSize: 16 },
  topBar: {
    position: 'absolute' as const, top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backBtn: { padding: 4 },
  liveBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontWeight: '800' as const, fontSize: 13, letterSpacing: 1 },
  viewersBox: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  viewersText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  channelInfo: {
    position: 'absolute' as const, bottom: 110, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 10,
  },
  channelText: { color: '#fff', fontSize: 12, fontWeight: '700' as const },
  channelSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' as const, alignItems: 'center' as const, gap: 12 },
  loadingText: { color: '#fff', fontSize: 15 },
  controls: {
    position: 'absolute' as const, bottom: 0, left: 0, right: 0,
    flexDirection: 'row' as const, justifyContent: 'space-around' as const, alignItems: 'center' as const,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20, paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  ctrlBtn: { alignItems: 'center' as const, gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  ctrlBtnOff: { backgroundColor: 'rgba(239,68,68,0.4)' },
  endBtn: { backgroundColor: '#DC2626' },
  ctrlIcon: { fontSize: 22 },
  ctrlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' as const },
  errorText: { color: C.danger, fontSize: 15, textAlign: 'center' as const },
  backBtn2: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 10, marginTop: 8 },
  backBtn2Text: { color: C.primaryFg, fontWeight: '700' as const },
});

export default LiveStreamScreen;
