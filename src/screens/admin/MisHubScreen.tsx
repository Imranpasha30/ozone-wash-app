/**
 * MisHubScreen — landing screen with 6 navigation cards, one per MIS dashboard.
 */
import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useTheme } from '../../hooks/useTheme';
import { MisHeader } from '../../components/charts/MisScaffold';
import {
  ChartBar, Leaf, CurrencyInr, Users, TrendUp, Buildings, CaretRight, Tag, Wallet, Gear,
} from '../../components/Icons';

interface CardDef {
  key: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

const MisHubScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const cards: CardDef[] = [
    {
      key: 'op',
      title: 'Operational',
      desc: 'Jobs, SLA, checklist & digital compliance',
      icon: <ChartBar size={26} color={C.primary} weight="regular" />,
      route: 'MisOperational',
      color: C.primary,
    },
    {
      key: 'eco',
      title: 'EcoScore',
      desc: 'Segment scores, badge mix & feedback',
      icon: <Leaf size={26} color={C.success} weight="regular" />,
      route: 'MisEcoScore',
      color: C.success,
    },
    {
      key: 'rev',
      title: 'Revenue & Agents',
      desc: 'Turnover by agent, tier mix, incentives',
      icon: <CurrencyInr size={26} color={C.warning} weight="regular" />,
      route: 'MisRevenue',
      color: C.warning,
    },
    {
      key: 'eng',
      title: 'Customer Engagement',
      desc: 'Wallet, redemption, AMC renewals',
      icon: <Users size={26} color={C.info} weight="regular" />,
      route: 'MisEngagement',
      color: C.info,
    },
    {
      key: 'sales',
      title: 'Sales',
      desc: 'Funnel, CAC vs LTV, growth trend',
      icon: <TrendUp size={26} color={C.secondary} weight="regular" />,
      route: 'MisSales',
      color: C.secondary,
    },
    {
      key: 'ref',
      title: 'Referrals',
      desc: 'Sources, tiers, ROI uplift',
      icon: <Buildings size={26} color={C.gold} weight="regular" />,
      route: 'MisReferrals',
      color: C.gold,
    },
    {
      key: 'pricing',
      title: 'Pricing Manager',
      desc: 'Edit AMC matrix, freeze schedule for tomorrow',
      icon: <Tag size={26} color={C.danger} weight="regular" />,
      route: 'AdminPricing',
      color: C.danger,
    },
    {
      key: 'payouts',
      title: 'Field Agent Payouts',
      desc: 'Freeze monthly batches, mark paid, edit incentive rules',
      icon: <Wallet size={26} color={C.success} weight="regular" />,
      route: 'AdminPayouts',
      color: C.success,
    },
    {
      key: 'ecomgr',
      title: 'EcoScore Manager',
      desc: 'Tune weights, recompute, top + bottom customers',
      icon: <Gear size={26} color={C.info} weight="regular" />,
      route: 'AdminEcoScore',
      color: C.info,
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <MisHeader
        title="MIS Dashboards"
        subtitle="Management Information System"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <Text style={styles.intro}>
          Tap a dashboard to drill into KPIs, trends, and gaps for the selected period.
        </Text>
        {cards.map((c) => (
          <TouchableOpacity
            key={c.key}
            activeOpacity={0.75}
            onPress={() => navigation.navigate(c.route)}
            style={styles.card}
          >
            <View style={[styles.iconWrap, { backgroundColor: c.color + '18' }]}>
              {c.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardDesc}>{c.desc}</Text>
            </View>
            <CaretRight size={18} color={C.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    intro: {
      fontSize: 13,
      color: C.muted,
      marginBottom: 14,
      lineHeight: 18,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      ...Platform.select({
        ios: {
          shadowColor: C.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
      }),
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: C.foreground },
    cardDesc: { fontSize: 12, color: C.muted, marginTop: 2 },
  });

export default MisHubScreen;
