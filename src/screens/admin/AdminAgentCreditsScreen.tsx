/**
 * AdminAgentCreditsScreen — leaderboard of all field agents' credit-engine
 * snapshots for a given month, sorted descending by credits.
 *
 * Data source: GET /admin/incentives/credits/:month
 *   → { month, agents: [{ user_id, name, phone, credits_total, tier,
 *       breakdown: {...}, raw: {...} }] }
 *
 * Layout:
 *   • Month picker (prev / current / next)
 *   • Tier-distribution mini bar (count of platinum / gold / silver / bronze / unrated)
 *   • Sortable agent rows: rank · name · tier chip · credits with mini bar
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Platform, StatusBar,
  StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useTheme } from '../../hooks/useTheme';
import { incentiveAPI } from '../../services/api';
import { MisHeader, Card, SectionTitle } from '../../components/charts/MisScaffold';
import { ArrowLeft, ArrowRight, Crown, Trophy, Medal, Star, Diamond } from '../../components/Icons';

type CreditTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'unrated';

const TIER_COLORS: Record<CreditTier, string> = {
  platinum: '#0EA5E9',
  gold:     '#F59E0B',
  silver:   '#94A3B8',
  bronze:   '#A16207',
  unrated:  '#94A3B8',
};

const TIER_LABEL: Record<CreditTier, string> = {
  platinum: 'Platinum',
  gold:     'Gold',
  silver:   'Silver',
  bronze:   'Bronze',
  unrated:  'Unrated',
};

const tierIcon = (t: CreditTier, color: string, size = 16) => {
  if (t === 'platinum') return <Diamond size={size} color={color} weight="fill" />;
  if (t === 'gold')     return <Crown size={size} color={color} weight="fill" />;
  if (t === 'silver')   return <Trophy size={size} color={color} weight="fill" />;
  if (t === 'bronze')   return <Medal size={size} color={color} weight="fill" />;
  return <Star size={size} color={color} weight="fill" />;
};

const fmtMonthLabel = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso + '-01T00:00:00Z');
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const fmtMonthQuery = (d: Date) => d.toISOString().slice(0, 7); // YYYY-MM

interface Agent {
  user_id: string;
  name?: string;
  phone?: string;
  credits_total: number;
  tier: CreditTier;
  breakdown?: Record<string, number>;
  raw?: any;
}

const AdminAgentCreditsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const initialMonth = route?.params?.month as string | undefined;
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    if (initialMonth) return new Date(initialMonth + '-01T00:00:00Z');
    return new Date();
  });

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthQuery = fmtMonthQuery(monthCursor);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = (await incentiveAPI.getAllAgentCreditsForMonth(monthQuery)) as any;
      const payload = res?.data || res;
      const list: Agent[] = (payload?.agents || []).slice();
      list.sort((a, b) => Number(b.credits_total || 0) - Number(a.credits_total || 0));
      setAgents(list);
    } catch (e: any) {
      setError(e?.message || 'Failed to load credit leaderboard');
      setAgents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthQuery]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const shiftMonth = (delta: number) => {
    const d = new Date(monthCursor);
    d.setMonth(d.getMonth() + delta);
    setMonthCursor(d);
  };

  const tierCounts = useMemo(() => {
    const counts: Record<CreditTier, number> = {
      platinum: 0, gold: 0, silver: 0, bronze: 0, unrated: 0,
    };
    agents.forEach(a => {
      const t = (a.tier || 'unrated') as CreditTier;
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [agents]);

  const maxCredits = useMemo(() => {
    return Math.max(1, ...agents.map(a => Number(a.credits_total || 0)));
  }, [agents]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <MisHeader
        title="Agent Credit Leaderboard"
        subtitle="Sorted by monthly credit total"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
          ) : undefined
        }
      >
        {/* Month picker */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthBtn}>
            <ArrowLeft size={20} color={C.foreground} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{fmtMonthLabel(monthQuery)}</Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthBtn}>
            <ArrowRight size={20} color={C.foreground} />
          </TouchableOpacity>
        </View>

        {error ? (
          <Card style={{ marginBottom: 14 }}>
            <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text>
          </Card>
        ) : null}

        {/* Tier distribution */}
        <Card>
          <SectionTitle title="Tier distribution" />
          <View style={styles.distRow}>
            {(['platinum','gold','silver','bronze','unrated'] as CreditTier[]).map(t => (
              <View key={t} style={styles.distItem}>
                <View style={[styles.distIcon, { backgroundColor: TIER_COLORS[t] + '22' }]}>
                  {tierIcon(t, TIER_COLORS[t], 18)}
                </View>
                <Text style={styles.distCount}>{tierCounts[t] || 0}</Text>
                <Text style={styles.distLabel}>{TIER_LABEL[t]}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Leaderboard */}
        <Card style={{ marginTop: 12 }}>
          <SectionTitle title={`Agents · ${agents.length}`} />
          {agents.length === 0 ? (
            <Text style={{ color: C.muted, fontSize: 13 }}>
              No credit snapshots for this month yet.
            </Text>
          ) : (
            agents.map((a, idx) => {
              const tier = (a.tier || 'unrated') as CreditTier;
              const tColor = TIER_COLORS[tier];
              const credits = Math.round(Number(a.credits_total || 0));
              const pct = Math.max(0, Math.min(1, credits / maxCredits));
              return (
                <View key={a.user_id || idx} style={styles.row}>
                  <Text style={styles.rank}>#{idx + 1}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {a.name || a.phone || 'Agent'}
                      </Text>
                      <View style={[styles.tierChip, { backgroundColor: tColor + '22' }]}>
                        {tierIcon(tier, tColor, 12)}
                        <Text style={[styles.tierChipText, { color: tColor }]}>
                          {TIER_LABEL[tier]}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: tColor }]} />
                    </View>
                  </View>
                  <Text style={[styles.credits, { color: tColor }]}>{credits}</Text>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  monthRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: C.foreground },

  distRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  distItem: { alignItems: 'center', flex: 1 },
  distIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  distCount: { fontSize: 18, fontWeight: '800', color: C.foreground },
  distLabel: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rank: { width: 32, fontSize: 13, fontWeight: '700', color: C.muted },
  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 6,
  },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: C.foreground },
  tierChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  tierChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  barTrack: {
    height: 6, backgroundColor: C.surfaceHighlight,
    borderRadius: 3, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  credits: { fontSize: 16, fontWeight: '800', minWidth: 50, textAlign: 'right' },
});

export default AdminAgentCreditsScreen;
