/**
 * LiveWatchScreen — placeholder while live watch is not yet available.
 * Previously used react-native-agora; that dependency was removed to ship v1
 * to the Play Store without the FOREGROUND_SERVICE_MEDIA_PROJECTION permission.
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye } from '../../components/Icons';

const C = {
  bg: '#0B1F33',
  surface: '#13314F',
  primary: '#0EA5E9',
  primaryDk: '#0369A1',
  leaf: '#22C55E',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.72)',
  line: 'rgba(255,255,255,0.14)',
};

export default function LiveWatchScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.85}>
          <ArrowLeft size={20} weight="bold" color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Live Watch</Text>
      </View>

      <View style={s.body}>
        <View style={s.iconHalo}>
          <Eye size={44} weight="duotone" color={C.primary} />
        </View>
        <View style={s.soonBadge}>
          <Text style={s.soonBadgeText}>COMING SOON</Text>
        </View>
        <Text style={s.title}>Watch your tank clean live</Text>
        <Text style={s.sub}>
          Live video viewing is rolling out shortly. In the meantime, your hygiene certificate, before/after photos, and crew updates remain available in your booking.
        </Text>

        <TouchableOpacity onPress={() => navigation.goBack()} style={s.btn} activeOpacity={0.85}>
          <Text style={s.btnText}>Back to booking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: C.text, fontWeight: '800', fontSize: 17, letterSpacing: 0.2 },

  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 14,
  },
  iconHalo: {
    width: 96, height: 96, borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderWidth: 1, borderColor: 'rgba(14,165,233,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  soonBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.45)',
  },
  soonBadgeText: { color: '#86EFAC', fontWeight: '800', fontSize: 11, letterSpacing: 1.4 },
  title: { color: C.text, fontWeight: '800', fontSize: 22, textAlign: 'center', marginTop: 8 },
  sub: { color: C.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 360 },

  btn: {
    marginTop: 22,
    paddingHorizontal: 22, paddingVertical: 14, borderRadius: 12,
    backgroundColor: C.primary,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 4 },
      default: { boxShadow: '0 8px 16px rgba(14,165,233,0.35)' } as any,
    }),
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
