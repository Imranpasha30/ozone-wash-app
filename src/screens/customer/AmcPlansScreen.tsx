import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, AMC_PLANS } from '../../utils/constants';
import { ArrowLeft, Shield, Envelope } from '../../components/Icons';

const AmcPlansScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AMC Plans</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          Annual Maintenance Contracts give you scheduled cleanings + priority service + discounts on every booking.
        </Text>
        {AMC_PLANS.map((plan) => (
          <View key={plan.value} style={styles.card}>
            <View style={styles.cardHeader}>
              <Shield size={20} weight="regular" color={COLORS.primary} />
              <Text style={styles.planLabel}>{plan.label}</Text>
            </View>
            <Text style={styles.planPrice}>
              ₹{plan.price}{' '}
              <Text style={styles.planPer}>/year</Text>
            </Text>
            <View style={styles.contactRow}>
              <Envelope size={14} weight="regular" color={COLORS.muted} />
              <Text style={styles.planContact}> Contact support to enroll: support@ozonewash.in</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground },
  body: { padding: 16 },
  intro: { fontSize: 13, color: COLORS.muted, marginBottom: 16, lineHeight: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planLabel: { fontSize: 17, fontWeight: 'bold', color: COLORS.foreground },
  planPrice: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginTop: 4 },
  planPer: { fontSize: 13, fontWeight: 'normal', color: COLORS.muted },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  planContact: { fontSize: 12, color: COLORS.muted },
});

export default AmcPlansScreen;
