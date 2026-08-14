/**
 * Global camera capture — real photos on EVERY platform.
 *
 * Problem: desktop browsers ignore the file-input `capture` hint, so
 * ImagePicker.launchCameraAsync silently degrades to a file picker on web.
 *
 * Solution (same singleton pattern as services/dialog):
 *   • Native  → the OS camera via ImagePicker.launchCameraAsync (unchanged UX)
 *   • Web     → a LIVE getUserMedia preview modal (raw <video> element — no
 *               wrapper libs, so the feed always renders) with a shutter,
 *               camera flip, and an explicit "Upload a file instead" fallback
 *
 * Usage anywhere:
 *   import { capturePhoto } from '../../services/cameraCapture';
 *   const uri = await capturePhoto();          // null = cancelled
 *
 * <CameraCaptureHost /> must be mounted once at the app root (App.tsx).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Platform, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type Resolver = (uri: string | null) => void;

let hostOpen: ((resolve: Resolver) => void) | null = null;

/** Capture a photo. Resolves the local uri, or null if cancelled. */
export async function capturePhoto(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.length) return null;
    return res.assets[0].uri;
  }
  // Web — open the webcam modal via the mounted host
  if (!hostOpen) {
    // Host not mounted (shouldn't happen) — degrade to file picker
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    return res.canceled || !res.assets?.length ? null : res.assets[0].uri;
  }
  return new Promise<string | null>((resolve) => hostOpen!(resolve));
}

/** Pick from files/gallery explicitly (the "Upload" path). */
export async function pickPhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
  return res.canceled || !res.assets?.length ? null : res.assets[0].uri;
}

export const CameraCaptureHost: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const resolverRef = useRef<Resolver | null>(null);

  useEffect(() => {
    hostOpen = (resolve: Resolver) => {
      resolverRef.current = resolve;
      setVisible(true);
    };
    return () => { hostOpen = null; };
  }, []);

  const stopStream = () => {
    try { streamRef.current?.getTracks?.().forEach((t: any) => t.stop()); } catch (_) {}
    streamRef.current = null;
  };

  // Live preview: attach the webcam stream to the raw <video> element.
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    let cancelled = false;
    (async () => {
      stopStream();
      setReady(false);
      setCamError(null);
      try {
        const md = (navigator as any)?.mediaDevices;
        if (!md?.getUserMedia) throw new Error('Camera not supported in this browser');
        const stream = await md.getUserMedia({ video: { facingMode: facing }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t: any) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play?.();
        }
        setReady(true);
      } catch (e: any) {
        setCamError(
          /denied|permission/i.test(e?.message || '') || e?.name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow it from the browser address bar, or upload a file instead.'
            : (e?.message || 'Camera unavailable — upload a file instead.')
        );
      }
    })();
    return () => { cancelled = true; stopStream(); };
  }, [visible, facing]);

  const finish = (uri: string | null) => {
    stopStream();
    setVisible(false);
    setSnapping(false);
    setReady(false);
    resolverRef.current?.(uri);
    resolverRef.current = null;
  };

  // Shutter: draw the current video frame to a canvas → JPEG data URL.
  const snap = () => {
    const v = videoRef.current;
    if (snapping || !ready || !v) return;
    setSnapping(true);
    try {
      const doc: any = (globalThis as any).document;
      const canvas = doc.createElement('canvas');
      canvas.width = v.videoWidth || 1280;
      canvas.height = v.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (facing === 'user') {
        // Mirror selfies so the saved photo matches the preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      finish(dataUrl);
    } catch (e) {
      setSnapping(false);
      setCamError('Could not capture the frame — try again or upload a file.');
    }
  };

  const uploadInstead = async () => {
    const uri = await pickPhoto();
    finish(uri);
  };

  if (!visible) return null;

  // Raw DOM <video> — RN-web renders it verbatim, guaranteeing a live preview.
  const videoEl = Platform.OS === 'web'
    ? React.createElement('video' as any, {
        ref: videoRef,
        autoPlay: true,
        playsInline: true,
        muted: true,
        style: {
          width: '100%', height: 320, objectFit: 'cover', display: 'block',
          background: '#0b0f19',
          transform: facing === 'user' ? 'scaleX(-1)' : undefined,
        },
      })
    : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => finish(null)}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Text style={s.title}>Take a photo</Text>

          <View style={s.camWrap}>
            {videoEl}
            {!ready && !camError && (
              <View style={s.overlay}>
                <ActivityIndicator color="#fff" />
                <Text style={s.overlayText}>Starting camera…</Text>
              </View>
            )}
            {camError && (
              <View style={s.overlay}>
                <Text style={s.deniedText}>{camError}</Text>
              </View>
            )}
          </View>

          <View style={s.row}>
            <TouchableOpacity style={s.sideBtn} onPress={() => finish(null)}>
              <Text style={s.sideBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.shutter, (!ready || snapping) && { opacity: 0.4 }]}
              onPress={snap}
              disabled={!ready || snapping}
            >
              {snapping
                ? <ActivityIndicator color="#fff" />
                : <View style={s.shutterInner} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.sideBtn}
              onPress={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            >
              <Text style={s.sideBtnText}>Flip</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={uploadInstead} style={s.uploadLink}>
            <Text style={s.uploadLinkText}>Upload a file instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(10,15,25,0.72)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  sheet: {
    width: '100%', maxWidth: 460, backgroundColor: '#fff',
    borderRadius: 20, padding: 16,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
  camWrap: {
    borderRadius: 14, overflow: 'hidden', backgroundColor: '#0b0f19',
    minHeight: 320, justifyContent: 'center',
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24,
  },
  overlayText: { color: '#9ca3af', fontSize: 13 },
  deniedText: { color: '#9ca3af', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingHorizontal: 8,
  },
  sideBtn: { paddingVertical: 10, paddingHorizontal: 14, minWidth: 72, alignItems: 'center' },
  sideBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  shutter: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff',
  },
  uploadLink: { alignItems: 'center', marginTop: 12, paddingVertical: 6 },
  uploadLinkText: { color: '#6b7280', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
