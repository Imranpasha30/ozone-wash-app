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
import { ClipboardText, Check, X, CurrencyInr, MagnifyingGlass } from '../../components/Icons';

const FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Refunded'];

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
  const [sub, setSub] = useState('all');       // contextual sub-filter within a tab
  const [search, setSearch] = useState('');    // customer name / phone / id
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Refund modal state
  const [refundBooking, setRefundBooking] = useState<any>(null);
  const [refundAmt, setRefundAmt] = useState('');   // rupees string
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [confirmSettle, setConfirmSettle] = useState(false); // inline settle confirm (in-modal)
  const [settleErr, setSettleErr] = useState('');

  const refundableRupees = (b: any) =>
    Math.max(0, (Number(b?.amount_paise) || 0) - (Number(b?.refunded_paise) || 0)) / 100;

  const rupees = (paise: any) => `₹${((Number(paise) || 0) / 100).toLocaleString('en-IN')}`;
  const refundStatusLabel = (s?: string) => {
    switch (s) {
      case 'processed': return 'Credited ✓';
      case 'failed': return 'Failed';
      case 'processing': return 'Processing';
      case 'initiated': return 'Initiated';
      default: return 'Queued at PayU';
    }
  };
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
    setConfirmSettle(false);
    setSettleErr('');
  };

  const closeRefundModal = () => { setRefundBooking(null); setConfirmSettle(false); setSettleErr(''); };

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
      const bookingStatus = res.data?.booking_status || (isFull ? 'cancelled' : refundBooking.status);
      setBookings((prev) => prev.map((b) => b.id === refundBooking.id
        ? { ...b, payment_status: newStatus, refunded_paise: newRefunded, refund_status: res.data?.refund_status || 'queued', status: bookingStatus } : b));
      setRefundBooking(null);
      Alert.alert('Refund',
        isFull
          ? 'Full refund initiated & booking cancelled. The customer has been notified — funds are credited to their source account in 5–7 working days.'
          : `Partial refund of ₹${rs} initiated. Customer notified — credited in 5–7 working days.`);
    } catch (err: any) {
      Alert.alert('Refund failed', err?.message || 'Could not process the refund.');
    } finally {
      setRefundLoading(false);
    }
  };

  // Close the refund case at the already-refunded amount — waive the balance.
  // Confirmed INLINE inside the modal (a nested Alert would render behind it on web).
  const doCloseCase = async () => {
    if (!refundBooking) return;
    setSettleErr('');
    setRefundLoading(true);
    try {
      const res = await paymentAPI.closeRefund({ booking_id: refundBooking.id, note: refundReason || undefined }) as any;
      setBookings((prev) => prev.map((b) => b.id === refundBooking.id
        ? { ...b, payment_status: res.data?.payment_status || 'refunded', refund_status: res.data?.refund_status || 'processed' } : b));
      closeRefundModal();
      Alert.alert('Settled', 'Account marked settled — refund case closed.');
    } catch (err: any) {
      setSettleErr(err?.message || 'Could not close the case. Please try again.');
    } finally { setRefundLoading(false); }
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

  // A refund is "active" while it's still moving (initiated → queued →
  // processing). Once PayU marks it 'processed' the money is credited and the
  // booking settles into Cancelled. So: active refund → Refunded tab; completed
  // refund (or a plain admin cancel) → Cancelled tab.
  const activeRefund = (b: any) => ['initiated', 'queued', 'processing'].includes(b?.refund_status);

  const matchesFilter = (b: any, f: string) => {
    if (f === 'All') return true;
    if (f === 'Refunded') return activeRefund(b);
    if (f === 'Cancelled') return b.status === 'cancelled' && !activeRefund(b);
    return b.status === f.toLowerCase();
  };

  // Contextual sub-filters per tab (secondary chip row).
  const SUB_FILTERS: Record<string, { key: string; label: string }[]> = {
    All:       [{ key: 'all', label: 'All' }, { key: 'tank', label: 'Tank' }, { key: 'auto_wash', label: 'Auto wash' }],
    Pending:   [{ key: 'all', label: 'All' }, { key: 'online', label: 'Online' }, { key: 'cod', label: 'COD' }],
    Confirmed: [{ key: 'all', label: 'All' }, { key: 'unassigned', label: 'Unassigned' }, { key: 'assigned', label: 'Assigned' }, { key: 'tank', label: 'Tank' }, { key: 'auto_wash', label: 'Auto wash' }],
    Completed: [{ key: 'all', label: 'All' }, { key: 'tank', label: 'Tank' }, { key: 'auto_wash', label: 'Auto wash' }],
    Refunded:  [{ key: 'all', label: 'All' }, { key: 'full', label: 'Full' }, { key: 'partial', label: 'Partial' }, { key: 'processing', label: 'Processing' }],
    Cancelled: [{ key: 'all', label: 'All' }, { key: 'by_admin', label: 'By company' }, { key: 'refund_done', label: 'Refund completed' }],
  };

  const matchesSub = (b: any, subKey: string) => {
    if (!subKey || subKey === 'all') return true;
    switch (subKey) {
      case 'tank':       return b.kind !== 'auto_wash';
      case 'auto_wash':  return b.kind === 'auto_wash';
      case 'online':     return b.payment_method !== 'cod';
      case 'cod':        return b.payment_method === 'cod';
      case 'assigned':   return !!b.assigned_team_id;
      case 'unassigned': return !b.assigned_team_id;
      case 'full':       return b.payment_status === 'refunded';
      case 'partial':    return b.payment_status === 'partially_refunded';
      case 'processing': return b.refund_status === 'processing';
      case 'by_admin':   return !['refunded', 'partially_refunded'].includes(b.payment_status);
      case 'refund_done': return ['refunded', 'partially_refunded'].includes(b.payment_status);
      default: return true;
    }
  };

  const matchesSearch = (b: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [b.customer_name, b.customer_phone, b.id, b.contact_name, b.contact_phone, b.address]
      .filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q));
  };

  const filtered = bookings.filter((b) => matchesFilter(b, filter) && matchesSub(b, sub) && matchesSearch(b));
  // Tab counts respect the search context but not the sub-filter.
  const countFor = (f: string) => bookings.filter((b) => matchesFilter(b, f) && matchesSearch(b)).length;
  const subFilters = SUB_FILTERS[filter] || [];

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
      {(Number(item.refunded_paise) || 0) > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.refundedNote}>
            {item.payment_status === 'refunded' ? '↩️ Fully refunded' : 'Partially refunded'} {rupees(item.refunded_paise)} · {refundStatusLabel(item.refund_status)}
          </Text>
          {['queued', 'initiated', 'processing', undefined, null].includes(item.refund_status) && (
            <Text style={styles.refundSubNote}>Credited to the customer's source account in 5–7 working days</Text>
          )}
          {item.refund_status === 'failed' && (
            <Text style={[styles.refundSubNote, { color: C.danger }]}>Refund failed at gateway — retry or contact PayU</Text>
          )}
        </View>
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

      {/* Search — customer name / phone / booking id / address */}
      <View style={styles.searchWrap}>
        <MagnifyingGlass size={16} weight="bold" color={C.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search customer, phone, address, id…"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={15} weight="bold" color={C.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Primary status tabs (with live counts) */}
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
            onPress={() => { setFilter(f); setSub('all'); }}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]} numberOfLines={1}>{f} ({countFor(f)})</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Secondary contextual filters for the selected tab */}
      {subFilters.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subRow}
          contentContainerStyle={styles.subContent}
        >
          {subFilters.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.subChip, sub === s.key && styles.subChipActive]}
              onPress={() => setSub(s.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.subChipText, sub === s.key && styles.subChipTextActive]} numberOfLines={1}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
        onRequestClose={closeRefundModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{confirmSettle ? 'Close & settle' : 'Refund booking'}</Text>
            {refundBooking && (
              <>
                <Text style={styles.modalSub}>
                  #{refundBooking.id?.slice(0, 8).toUpperCase()}{refundBooking.customer_name ? ` · ${refundBooking.customer_name}` : ''}
                </Text>

                {/* Complete details — shown in both the refund + settle views */}
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
                    <Text style={styles.detailKBold}>{confirmSettle ? 'Balance to waive' : 'Refundable balance'}</Text>
                    <Text style={styles.detailVBold}>{rupees((Number(refundBooking.amount_paise) || 0) - (Number(refundBooking.refunded_paise) || 0))}</Text>
                  </View>
                </View>

                {confirmSettle ? (
                  /* ── Inline settle confirmation (stays on top of this modal) ── */
                  <>
                    <Text style={styles.settleConfirmText}>
                      Mark this account settled at the amount already refunded ({rupees(refundBooking.refunded_paise)})? The remaining {rupees((Number(refundBooking.amount_paise) || 0) - (Number(refundBooking.refunded_paise) || 0))} is waived — no further refund. This can't be undone.
                    </Text>
                    {settleErr ? <Text style={styles.settleErrText}>{settleErr}</Text> : null}
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setConfirmSettle(false)} disabled={refundLoading}>
                        <Text style={styles.modalCancelText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalBtn, styles.settleConfirmBtn]} onPress={doCloseCase} disabled={refundLoading}>
                        {refundLoading
                          ? <ActivityIndicator size="small" color={C.primaryFg} />
                          : <Text style={styles.modalConfirmText}>Mark settled</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  /* ── Refund form ── */
                  <>
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
                      <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={closeRefundModal} disabled={refundLoading}>
                        <Text style={styles.modalCancelText}>Close</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={submitRefund} disabled={refundLoading}>
                        {refundLoading
                          ? <ActivityIndicator size="small" color={C.primaryFg} />
                          : <Text style={styles.modalConfirmText}>Refund ₹{Number(refundAmt) || 0}</Text>}
                      </TouchableOpacity>
                    </View>

                    {refundableRupees(refundBooking) > 0 && (
                      <TouchableOpacity style={styles.settleBtn} onPress={() => { setSettleErr(''); setConfirmSettle(true); }} disabled={refundLoading} activeOpacity={0.8}>
                        <Check size={15} weight="bold" color={C.success} />
                        <Text style={styles.settleBtnText}>Mark settled & close — waive ₹{refundableRupees(refundBooking).toLocaleString('en-IN')}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
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
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: C.foreground, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: C.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: C.border,
  },
  filterRow: { backgroundColor: C.surface, flexShrink: 0, flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  subRow: { backgroundColor: C.surface, flexShrink: 0, flexGrow: 0, borderTopWidth: 1, borderTopColor: C.border },
  subContent: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  subChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: C.surfaceElevated, marginRight: 8, borderWidth: 1, borderColor: C.border, flexShrink: 0 },
  subChipActive: { backgroundColor: C.primaryBg, borderColor: C.primary },
  subChipText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  subChipTextActive: { color: C.primary, fontWeight: '800' },
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
  refundedNote: { fontSize: 12, color: C.muted, fontWeight: '700' },
  refundSubNote: { fontSize: 11, color: C.muted, marginTop: 2, fontStyle: 'italic' },
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
  settleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.success, backgroundColor: C.successBg,
  },
  settleBtnText: { color: C.success, fontWeight: '800', fontSize: 13 },
  settleConfirmText: { fontSize: 13.5, color: C.foreground, lineHeight: 20, marginTop: 14 },
  settleErrText: { fontSize: 12.5, color: C.danger, fontWeight: '600', marginTop: 10 },
  settleConfirmBtn: { backgroundColor: C.success },
});

export default AdminBookingsScreen;
