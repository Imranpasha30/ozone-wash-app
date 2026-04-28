/**
 * RewardCard — single redemption tile in the rewards catalog.
 *
 * Shows reward name, description, points cost (or "Streak reward"),
 * and a Redeem button. Disabled state with reason text under the button
 * when the user is not eligible.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Lightning, Crown, Sparkle } from '../Icons';

export interface RewardForCard {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  points_cost: number;
  category?: string | null;
  requires_streak?: boolean;
  image_url?: string | null;
  eligible: boolean;
  reason?: string | null;
}

interface Props {
  reward: RewardForCard;
  onRedeem: (reward: RewardForCard) => void;
  C: any;
}

const reasonText = (reason?: string | null): string => {
  switch (reason) {
    case 'sufficient_points':         return '';
    case 'insufficient_points':       return 'Not enough EcoPoints yet';
    case 'requires_platinum_streak':  return 'Unlocks at Platinum streak';
    case 'requires_gold_streak':      return 'Unlocks at Gold streak';
    case 'requires_streak':           return 'Streak required';
    case 'inactive':                  return 'Currently unavailable';
    default:                          return reason || '';
  }
};

export const RewardCard: React.FC<Props> = ({ reward, onRedeem, C }) => {
  const styles = makeStyles(C);
  const eligible = reward.eligible;
  const isStreak = !!reward.requires_streak;

  const reason = !eligible ? reasonText(reward.reason) : '';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          {isStreak
            ? <Sparkle size={18} weight="fill" color={C.gold} />
            : <Lightning size={18} weight="fill" color={C.primary} />
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>{reward.name}</Text>
          {reward.description ? (
            <Text style={styles.description} numberOfLines={3}>{reward.description}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footerRow}>
        {isStreak ? (
          <View style={[styles.badge, { backgroundColor: C.goldBg }]}>
            <Crown size={12} weight="fill" color={C.gold} />
            <Text style={[styles.badgeText, { color: C.gold }]}>Streak reward</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: C.primaryBg }]}>
            <Lightning size={12} weight="fill" color={C.primary} />
            <Text style={[styles.badgeText, { color: C.primary }]}>{reward.points_cost} pts</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={eligible ? 0.85 : 1}
          disabled={!eligible}
          onPress={() => onRedeem(reward)}
          style={[
            styles.redeemBtn,
            { backgroundColor: eligible ? C.primary : C.surfaceHighlight },
          ]}
        >
          <Text style={[
            styles.redeemBtnText,
            { color: eligible ? C.primaryFg : C.muted },
          ]}>
            Redeem
          </Text>
        </TouchableOpacity>
      </View>

      {reason ? <Text style={styles.reasonText}>{reason}</Text> : null}
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 14, fontWeight: '700', color: C.foreground },
  description: { fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 4 },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  redeemBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
  },
  redeemBtnText: { fontSize: 13, fontWeight: '700' },
  reasonText: { marginTop: 6, fontSize: 11, color: C.muted, fontStyle: 'italic' },
});

export default RewardCard;
