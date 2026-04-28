/**
 * EcoScoreRing — reusable circular progress ring with score in middle.
 *
 * Used by the customer EcoScore dashboard hero. Wraps react-native-svg's
 * <Circle> with strokeDasharray to produce a smooth tier-coloured progress
 * arc. Works on web + native.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  score: number;                    // 0..100
  badge?: string;                   // platinum | gold | silver | bronze | unrated
  color: string;                    // ring filled color (tier color)
  trackColor: string;               // ring track color (background)
  foreground: string;               // text color for the score
  muted: string;                    // text color for the "out of 100" label
  size?: number;                    // outer diameter (default 200)
  stroke?: number;                  // ring thickness (default 16)
}

const TIER_LABEL: Record<string, string> = {
  platinum: 'PLATINUM',
  gold: 'GOLD',
  silver: 'SILVER',
  bronze: 'BRONZE',
  unrated: 'UNRATED',
};

export const EcoScoreRing: React.FC<Props> = ({
  score, badge, color, trackColor, foreground, muted,
  size = 200, stroke = 16,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * c;
  const tierLabel = badge ? (TIER_LABEL[badge] || badge.toUpperCase()) : '';

  // Glow shadow on iOS / web mimics the "platinum halo" feel from the PDF.
  const glow = Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 18 },
    web: { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 18 } as any,
    android: { elevation: 0 },
  });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, glow]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ecoring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.7" />
          </LinearGradient>
        </Defs>
        <SvgCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={trackColor} strokeWidth={stroke} fill="none"
        />
        <SvgCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#ecoring)" strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: size * 0.27, fontWeight: '800', color: foreground, lineHeight: size * 0.30 }}>
          {Math.round(clamped)}
        </Text>
        <Text style={{ fontSize: 10, color: muted, marginTop: 2, letterSpacing: 1 }}>OUT OF 100</Text>
        {tierLabel ? (
          <View style={[styles.tierPill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[styles.tierPillText, { color }]}>{tierLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tierPill: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
});

export default EcoScoreRing;
