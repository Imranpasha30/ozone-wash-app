import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Linking, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { invoiceAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../utils/responsive';
import { Receipt, DownloadSimple, Info, ArrowLeft } from '../../components/Icons';

const rupees = (paise: number) =>
  `₹${((Number(paise) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceElevated || C.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: C.foreground },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  infoBox: {
    flexDirection: 'row', backgroundColor: C.primaryBg || C.surface, borderRadius: 12, padding: 12,
    marginBottom: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: C.borderActive || C.border,
  },
  infoText: { flex: 1, fontSize: 12, color: C.muted, lineHeight: 18, marginLeft: 8 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, borderLeftColor: C.primary,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: C.primaryBg || C.background,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  invNo: { fontSize: 14, fontWeight: 'bold', color: C.foreground },
  invMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  amount: { fontSize: 17, fontWeight: 'bold', color: C.foreground },
  tag: {
    fontSize: 10, fontWeight: '800', color: C.primary, backgroundColor: C.primaryBg || C.background,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', marginTop: 4,
    alignSelf: 'flex-start',
  },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  taxLabel: { fontSize: 12, color: C.muted },
  taxVal: { fontSize: 12, color: C.foreground, fontWeight: '600' },
  dlBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 11, borderRadius: 12, marginTop: 12,
  },
  dlText: { color: C.primaryFg, fontWeight: 'bold', fontSize: 14 },
  dlBtnDisabled: { backgroundColor: C.muted, opacity: 0.6 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 16, backgroundColor: C.primaryBg || C.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground, marginBottom: 6 },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22 },
});

const InvoicesScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const { isLarge } = useResponsive();
  const webListStyle = isLarge
    ? { maxWidth: 720, width: '100%' as const, alignSelf: 'center' as const, padding: 24 }
    : null;

  const navigation = useNavigation<any>();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await invoiceAPI.listMine() as any;
      setInvoices(res.data?.invoices || []);
    } catch (_) {} finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // A pdf_url pointing at the R2 demo-placeholder host isn't a real, reachable
  // document (R2 unconfigured or an upload failed) — treat it as not-ready.
  const pdfReady = (item: any) => !!item.pdf_url && !String(item.pdf_url).includes('demo-placeholder');

  const openPdf = async (item: any) => {
    if (!pdfReady(item)) {
      Alert.alert('Invoice', 'Your invoice PDF is still being prepared. Please pull to refresh in a moment.');
      return;
    }
    try {
      const ok = await Linking.canOpenURL(item.pdf_url);
      if (ok) await Linking.openURL(item.pdf_url);
      else Alert.alert('Invoice', 'Could not open the invoice link.');
    } catch { Alert.alert('Invoice', 'Could not open the invoice link.'); }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Receipt size={24} weight="fill" color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.invNo}>{item.invoice_number}</Text>
          <Text style={styles.invMeta}>{formatDate(item.issued_at)}</Text>
          <Text style={styles.tag}>{item.source_type === 'amc' ? 'AMC CONTRACT' : 'TANK SERVICE'}</Text>
        </View>
        <Text style={styles.amount}>{rupees(item.total_paise)}</Text>
      </View>

      <View style={styles.divider} />
      <View style={styles.taxRow}>
        <Text style={styles.taxLabel}>Taxable value</Text>
        <Text style={styles.taxVal}>{rupees(item.taxable_value_paise)}</Text>
      </View>
      <View style={styles.taxRow}>
        <Text style={styles.taxLabel}>CGST (9%) + SGST (9%)</Text>
        <Text style={styles.taxVal}>{rupees((item.cgst_paise || 0) + (item.sgst_paise || 0))}</Text>
      </View>
      <View style={styles.taxRow}>
        <Text style={styles.taxLabel}>SAC {item.sac_code}</Text>
        <Text style={styles.taxVal}>GST inclusive</Text>
      </View>

      <TouchableOpacity
        style={[styles.dlBtn, !pdfReady(item) && styles.dlBtnDisabled]}
        onPress={() => openPdf(item)}
        activeOpacity={0.85}
      >
        <DownloadSimple size={18} weight="bold" color={C.primaryFg} />
        <Text style={styles.dlText}>{pdfReady(item) ? 'Download PDF' : 'Preparing…'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} weight="bold" color={C.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Invoices</Text>
          <Text style={styles.headerSub}>{invoices.length} tax invoice{invoices.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={[invoices.length === 0 ? styles.emptyContainer : styles.list, webListStyle]}
          refreshControl={
            Platform.OS !== 'web'
              ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
              : undefined
          }
          ListHeaderComponent={
            invoices.length > 0 ? (
              <View style={styles.infoBox}>
                <Info size={16} weight="fill" color={C.primary} />
                <Text style={styles.infoText}>
                  GST tax invoices are generated automatically after each payment. All prices are inclusive of 18% GST.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Receipt size={40} weight="fill" color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>No invoices yet</Text>
              <Text style={styles.emptySub}>
                A GST tax invoice is issued automatically after you pay for a service or AMC plan.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default InvoicesScreen;
