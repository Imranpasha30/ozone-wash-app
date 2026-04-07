import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft, QrCode, Warning } from '../../components/Icons';

const QrScannerScreen = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Extract cert ID from QR URL: .../certificates/verify/{certId}
    const match = data.match(/certificates\/verify\/([a-f0-9-]+)/i);
    const certId = match ? match[1] : null;

    if (certId) {
      navigation.replace('CertVerifyResult', { cert_id: certId });
    } else {
      // Try using the raw data as cert ID (in case QR just contains the UUID)
      const uuidMatch = data.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
      if (uuidMatch) {
        navigation.replace('CertVerifyResult', { cert_id: data });
      } else {
        navigation.replace('CertVerifyResult', { cert_id: null, error: 'Invalid QR code. This is not an Ozone Wash certificate.' });
      }
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} weight="regular" color={C.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
        </View>
        <View style={styles.center}>
          <View style={styles.permIconWrap}>
            <Warning size={40} weight="regular" color={C.warning} />
          </View>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permText}>We need camera permission to scan certificate QR codes</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.camBackBtn}>
              <ArrowLeft size={22} weight="bold" color="#fff" />
            </TouchableOpacity>
            <Text style={styles.camTitle}>Scan Certificate QR</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Scan frame */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>

          {/* Bottom hint */}
          <View style={styles.bottomHint}>
            <QrCode size={20} weight="regular" color="#fff" />
            <Text style={styles.hintText}>Point camera at a certificate QR code</Text>
          </View>

          {scanned && (
            <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)} activeOpacity={0.8}>
              <Text style={styles.rescanText}>Tap to scan again</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
};

const CORNER_SIZE = 24;
const CORNER_WIDTH = 4;

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background, padding: 32 },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },

  // Permission
  permIconWrap: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: C.warningBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  permTitle: { fontSize: 18, fontWeight: '700', color: C.foreground, marginBottom: 8 },
  permText: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 20 },
  permBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 15 },

  // Camera
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16,
  },
  camBackBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  camTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Scan frame
  scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 240, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderColor: '#fff', borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderColor: '#fff', borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderColor: '#fff', borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderColor: '#fff', borderBottomRightRadius: 4 },

  // Bottom
  bottomHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingBottom: 40, paddingTop: 20,
  },
  hintText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  rescanBtn: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999,
  },
  rescanText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

export default QrScannerScreen;
