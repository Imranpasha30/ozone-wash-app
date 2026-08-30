import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert, Platform, StatusBar,
  Modal, TextInput,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI, paymentAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../utils/responsive';
import { ClipboardText, Check, X, CurrencyInr } from '../../components/Icons';

const FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

const AdminBookingsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const { isLarge } = useResponsive();
  const webListStyle = isLarge
    ? { maxWidth: 1100, width: '100%' as const, alignSelf: 'center' as const, padding: 24 }
    : null;
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Refund modal state
  const [refundBooking, setRefundBooking] = useState<any>(null);
  const [refundAmt, setRefundAmt] = useState('');   // rupees string
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  const refundableRupees = (b: any) =>
    Math.max(0, (Number(b?.amount_paise) || 0) - (Number(b?.refunded_paise) || 0)) / 100;

  const rupees = (paise: any) => `₹${((Number(paise) || 0) / 100).toLocaleString('en-IN')}`;
  // Human label of the service the customer actually selected.
  const serviceLabel = (b: any) => {
    if (!b) return '';
    if (b.kind === 'auto_wash') {
      return `Auto Wash · ${(b.vehicle_type || 'vehicle').replace('_', ' ').toUpperCase()}${b.registration_number ? ` ${b.registration_number}` : ''} · ${(b.service_package || 'car wash').toUpperCase()}`;
    }
    return `Tank Cleaning · ${(b.tank_type || 'tank').toUpperCase()} · ${b.tank_size_litres ?? '—'}L`;
  };

  const openRefund = (b: any) => {
    setRefundBooking(b);
    setRefundAmt(String(refundableRupees(b)));
    setRefundReason('');
  };

  const submitRefund = async () => {
    if (!refundBooking) return;
    const maxRs = refundableRupees(refundBooking);
    const rs = Number(refundAmt);
    if (!Number.isFinite(rs) || rs <= 0) { Alert.alert('Refund', 'Enter a valid amount.'); return; }
    if (rs > maxRs + 0.001) { Alert.alert('Refund', `Amount exceeds the refundable balance (₹${maxRs}).`); return; }
    const amount_paise = Math.round(rs * 100);
    const isFull = amount_paise >= Math.round(maxRs * 100);
    setRefundLoading(true);
    try {
      const res = await paymentAPI.refund({
        booking_id: refundBooking.id,
        amount_paise: isFull ? undefined : amount_paise,   // omit → full remaining
        reason: refundReason || undefined,
      }) as any;
      const newStatus = res.data?.payment_status || (isFull ? 'refunded' : 'partially_refunded');
      const newRefunded = res.data?.refunded_paise ?? ((Number(refundBooking.refunded_paise) || 0) + amount_paise);
      setBookings((prev) => prev.map((b) => b.id === refundBooking.id
        ? { ...b, payment_status: newStatus, refunded_paise: newRefunded } : b));
      setRefundBooking(null);
      Alert.alert('Refund', isFull ? 'Full refund initiated.' : `Partial refund of ₹${rs} initiated.`);
    } catch (err: any) {
      Alert.alert('Refund failed', err?.message || 'Could not process the refund.');
    } finally {
      setRefundLoading(false);
    }
  };

  const fetchBookings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminAPI.getAllBookings({ limit: 50 }) as any;
      setBookings(res.data?.bookings || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBookings(); }, []));

  const filtered = filter === 'All'
    ? bookings
    : bookings.filter((b) => b.status === filter.toLowerCase());

  const handleConfirm = async (id: string) => {
    setActionLoading(id + '_confirm');
    try {
      await adminAPI.confirmBooking(id);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'confirmed' } : b));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to confirm booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive',
        onPress: async () => {
          setActionLoading(id + '_cancel');
          try {
            await adminAPI.cancelBooking(id);
            setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to cancel booking');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'confirmed') return C.primary;
    if (s === 'cancelled') return C.danger;
    return C.warning;
  };

  const renderItem = ({ item }: { item: any }) => {
    const isAutoWash = item.kind === 'auto_wash';
    // Distinct tints per booking kind so admins can scan the list at a glance.
    //   tank cleaning → faint blue (matches the brand primary)
    //   auto wash     → faint green (matches the EV/ozone-clean palette)
    // Border colour is bumped to the saturated shade for stronger separation.
    const kindBg = isAutoWash ? 'rgba(34,197,94,0.06)' : 'rgba(59,130,246,0.05)';
    const kindBorder = isAutoWash ? 'rgba(34,197,94,0.45)' : 'rgba(59,130,246,0.35)';
    return (
    <View style={[styles.card, {
      backgroundColor: kindBg,
      borderLeftWidth: 4,
      borderLeftColor: kindBorder,
    }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
              backgroundColor: isAutoWash ? 'rgba(34,197,94,0.15)' : C.primaryBg,
            }}>
              <Text style={{
                fontSize: 9, fontWeight: '800', letterSpacing: 0.8,
                color: isAutoWash ? '#16A34A' : C.primary,
              }}>
                {isAutoWash ? 'AUTO WASH' : 'TANK CLEANING'}
              </Text>
            </View>
            <Text style={styles.bookingId}>#{item.id?.slice(0, 8).toUpperCase()}</Text>
          </View>
          {item.job_id && !isAutoWash && (
            <Text style={styles.bookingId}>Job #{item.job_id?.slice(0, 8).toUpperCase()}</Text>
          )}
          <Text style={styles.customerName}>{item.customer_name || item.customer_phone || '\u2014'}</Text>
          <Text style={styles.cardDetail}>
            {isAutoWash
              ? `${(item.vehicle_type || 'vehicle').replace('_', ' ').toUpperCase()}${item.registration_number ? ` · ${item.registration_number}` : ''} · ${(item.service_package || 'car wash').toUpperCase()}`
              : `${(item.tank_type || 'tank').toUpperCase()} · ${item.tank_size_litres ?? '—'}L`} · {((item.amount_paise || 0) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.slot_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
          {item.address ? <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text> : null}
          <Text style={styles.cardDetail}>
            {item.team_name ? `Team: ${item.team_name}` : 'Unassigned'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '22', borderColor: statusColor(item.status) }]}>
          <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Pending → legacy bookings only (new bookings auto-confirm).
          Confirmed → admin can still cancel (e.g. customer no-show, scheduling
          conflict). In-progress / completed / cancelled rows show no actions. */}
      {(item.status === 'pending' || item.status === 'confirmed') && (
        <View style={styles.actions}>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={() => handleConfirm(item.id)}
              disabled={!!actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading === item.id + '_confirm'
                ? <ActivityIndicator size="small" color={C.primary} />
                : (
                  <View style={styles.actionBtnInner}>
                    <Check size={16} weight="bold" color={C.primary} />
                    <Text style={styles.confirmText}> Confirm</Text>
                  </View>
                )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.cancelBtn]}
            onPress={() => handleCancel(item.id)}
            disabled={!!actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading === item.id + '_cancel'
              ? <ActivityIndicator size="small" color={C.danger} />
              : (
                <View style={styles.actionBtnInner}>
                  <X size={16} weight="bold" color={C.danger} />
                  <Text style={styles.cancelText}> Cancel</Text>
                </View>
              )}
          </TouchableOpacity>
        </View>
      )}

      {/* Refund — available on any paid / partially-refunded booking */}
      {['paid', 'partially_refunded'].includes(item.payment_status) && refundableRupees(item) > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.refundBtn]}
            onPress={() => openRefund(item)}
            disabled={!!actionLoading}
            activeOpacity={0.7}
          >
            <View style={styles.actionBtnInner}>
              <CurrencyInr size={16} weight="bold" color={C.warning} />
              <Text style={styles.refundText}> {item.payment_status === 'partially_refunded' ? 'Refund more' : 'Refund'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
      {item.payment_status === 'refunded' && (
        <Text style={styles.refundedNote}>✓ Fully refunded</Text>
      )}
      {item.payment_status === 'partially_refunded' && (
        <Text style={styles.refundedNote}>
          Partially refunded: ₹{((Number(item.refunded_paise) || 0) / 100).toLocaleString('en-IN')}
        </Text>
      )}
    </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Bookings</Text>
        <Text style={styles.headerCount}>{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]} numberOfLines={1}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          contentContainerStyle={[
            filtered.length === 0 ? styles.emptyContainer : styles.list,
            webListStyle,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <ClipboardText size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No {filter !== 'All' ? filter.toLowerCase() : ''} bookings</Text>
            </View>
          }
        />
      )}

      {/* Refund modal */}
      <Modal
        visible={!!refundBooking}
        transparent
        animationType="fade"
        onRequestClose={() => setRefundBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Refund booking</Text>
            {refundBooking && (
              <>
                <Text style={styles.modalSub}>
                  #{refundBooking.id?.slice(0, 8).toUpperCase()}{refundBooking.customer_name ? ` · ${refundBooking.customer_name}` : ''}
                </Text>

                {/* Complete details the admin needs while refunding */}
                <View style={styles.detailBox}>
                  <Text style={styles.detailService}>{serviceLabel(refundBooking)}</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailK}>Service amount</Text>
                    <Text style={styles.detailV}>{rupees(refundBooking.amount_paise)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailK}>Amount paid</Text>
                    <Text style={styles.detailV}>{rupees(refundBooking.amount_paise)}</Text>
                  </View>
                  {(Number(refundBooking.refunded_paise) || 0) > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailK}>Already refunded</Text>
                      <Text style={[styles.detailV, { color: C.warning }]}>− {rupees(refundBooking.refunded_paise)}</Text>
                    </View>
                  )}
                  <View style={[styles.detailRow, styles.detailRowLast]}>
                    <Text style={styles.detailKBold}>Refundable balance</Text>
                    <Text style={styles.detailVBold}>{rupees((Number(refundBooking.amount_paise) || 0) - (Number(refundBooking.refunded_paise) || 0))}</Text>
                  </View>
                </View>

                <Text style={styles.modalLabel}>Refund amount (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={refundAmt}
                  onChangeText={setRefundAmt}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={C.muted}
                />
                <TouchableOpacity onPress={() => setRefundAmt(String(refundableRupees(refundBooking)))}>
                  <Text style={styles.modalFullLink}>Use full balance</Text>
                </TouchableOpacity>

                <Text style={styles.modalLabel}>Reason (optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={refundReason}
                  onChangeText={setRefundReason}
                  placeholder="e.g. customer request"
                  placeholderTextColor={C.muted}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setRefundBooking(null)} disabled={refundLoading}>
                    <Text style={styles.modalCancelText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={submitRefund} disabled={refundLoading}>
                    {refundLoading
                      ? <ActivityIndicator size="small" color={C.primaryFg} />
                      : <Text style={styles.modalConfirmText}>Refund ₹{Number(refundAmt) || 0}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.foreground },
  headerCount: { fontSize: 13, color: C.muted },
  filterRow: { backgroundColor: C.surface, flexShrink: 0, flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: C.surfaceElevated, marginRight: 8, borderWidth: 1.5, borderColor: C.muted, flexShrink: 0 },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.foreground, fontWeight: '600', flexShrink: 0 },
  chipTextActive: { color: C.primaryFg, fontWeight: '700' },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 8 },
  bookingId: { fontSize: 11, color: C.primary, fontFamily: 'monospace', fontWeight: '600', marginBottom: 2 },
  customerName: { fontSize: 15, fontWeight: '700', color: C.foreground, marginBottom: 2 },
  cardDetail: { fontSize: 13, color: C.muted, marginBottom: 2 },
  cardDate: { fontSize: 12, color: C.muted, marginBottom: 2 },
  cardAddress: { fontSize: 11, color: C.muted },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { backgroundColor: C.primaryBg },
  cancelBtn: { backgroundColor: C.dangerBg },
  confirmText: { color: C.primary, fontWeight: '700', fontSize: 13 },
  cancelText: { color: C.danger, fontWeight: '700', fontSize: 13 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  refundBtn: { backgroundColor: C.warningBg },
  refundText: { color: C.warning, fontWeight: '700', fontSize: 13 },
  refundedNote: { marginTop: 10, fontSize: 12, color: C.muted, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: C.surface, borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  modalSub: { fontSize: 13, color: C.muted, marginTop: 4 },
  modalRefundable: { fontSize: 14, fontWeight: '700', color: C.primary, marginTop: 8 },
  detailBox: { marginTop: 12, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, backgroundColor: C.surfaceElevated },
  detailService: { fontSize: 13, fontWeight: '800', color: C.foreground, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  detailRowLast: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  detailK: { fontSize: 13, color: C.muted },
  detailV: { fontSize: 13, fontWeight: '700', color: C.foreground },
  detailKBold: { fontSize: 13, fontWeight: '800', color: C.foreground },
  detailVBold: { fontSize: 15, fontWeight: '800', color: C.primary },
  modalLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.foreground, backgroundColor: C.background },
  modalFullLink: { fontSize: 12, color: C.primary, fontWeight: '700', marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalCancel: { backgroundColor: C.surfaceElevated, borderWidth: 1, borderColor: C.border },
  modalCancelText: { color: C.foreground, fontWeight: '700', fontSize: 14 },
  modalConfirm: { backgroundColor: C.warning },
  modalConfirmText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },
});

export default AdminBookingsScreen;
