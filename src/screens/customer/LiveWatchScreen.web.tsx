/**
 * Web stub for LiveWatchScreen — Agora RTC is not supported on web.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';

export default function LiveWatchScreen() {
  const navigation = useNavigation();
  return (
    <View style={s.container}>
      <Text style={s.title}>Live Watch</Text>
      <Text style={s.body}>Live video viewing is only available on the mobile app.</Text>
      <TouchableOpacity style={s.btn} onPress={() => navigation.goBack()}>
        <Text style={s.btnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.background },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  body: { fontSize: 15, color: COLORS.muted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
