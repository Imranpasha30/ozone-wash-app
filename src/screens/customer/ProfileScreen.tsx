import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/auth.store';
import { COLORS } from '../../utils/constants';

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const [showId, setShowId] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          // RootNavigator auto-switches to AuthNavigator
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.phone?.slice(-2) || '??';

  const menuItems = user?.role === 'customer' ? [
    { icon: '📋', label: 'My Bookings', onPress: () => navigation.navigate('MyBookings') },
    { icon: '🏆', label: 'Certificates', onPress: () => navigation.navigate('Certificates') },
    { icon: '📃', label: 'AMC Plans', onPress: () => navigation.navigate('AmcPlans') },
  ] : user?.role === 'field_team' ? [
    { icon: '🔧', label: 'My Jobs', onPress: () => navigation.navigate('Jobs') },
  ] : [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'My Account'}</Text>
        <Text style={styles.phone}>+91 {user?.phone}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role === 'customer' ? 'Customer' : user?.role}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Account Info */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Account Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>+91 {user?.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{user?.role}</Text>
        </View>
        <TouchableOpacity style={styles.infoRow} onPress={() => setShowId(!showId)}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {showId ? user?.id : '•••••••• (tap to reveal)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfoCard}>
        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoLabel}>App Version</Text>
          <Text style={styles.appInfoValue}>1.0.0</Text>
        </View>
        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoLabel}>Platform</Text>
          <Text style={styles.appInfoValue}>Ozone Wash</Text>
        </View>
        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoLabel}>Support</Text>
          <Text style={styles.appInfoValue}>support@ozonewash.in</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪  Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingBottom: 40 },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
  name: { fontSize: 20, fontWeight: 'bold', color: COLORS.foreground, marginBottom: 4 },
  phone: { fontSize: 14, color: COLORS.muted, marginBottom: 8 },
  roleBadge: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  roleText: { fontSize: 12, color: COLORS.primary, fontWeight: '600', textTransform: 'uppercase' },
  menuCard: {
    margin: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.foreground, fontWeight: '600' },
  menuArrow: { fontSize: 18, color: COLORS.primary },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { width: 70, fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: COLORS.foreground, fontWeight: '600' },
  appInfoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  appInfoLabel: { fontSize: 13, color: COLORS.muted },
  appInfoValue: { fontSize: 13, color: COLORS.foreground, fontWeight: '600' },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: COLORS.danger },
});

export default ProfileScreen;
