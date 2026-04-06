import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, AMC_PLANS } from '../../utils/constants';

const AmcPlansScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AMC Plans</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          Annual Maintenance Contracts give you scheduled cleanings + priority service + discounts on every booking.
        </Text>
        {AMC_PLANS.map((plan) => (
          <View key={plan.value} style={styles.card}>
            <Text style={styles.planLabel}>{plan.label}</Text>
            <Text style={styles.planPrice}>
              ₹{plan.price}{' '}
              <Text style={styles.planPer}>/year</Text>
            </Text>
            <Text style={styles.planContact}>Contact support to enroll: support@ozonewash.in</Text>
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
  backText: { fontSize: 24, color: COLORS.primary },
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
  planLabel: { fontSize: 17, fontWeight: 'bold', color: COLORS.foreground },
  planPrice: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginTop: 4 },
  planPer: { fontSize: 13, fontWeight: 'normal', color: COLORS.muted },
  planContact: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
});

export default AmcPlansScreen;
