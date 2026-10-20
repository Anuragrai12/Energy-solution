import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { reportsApi, type ReportListItem, type ReportUser } from '@/lib/reports-api';
import { Brand, Shape } from '@/constants/brand';

const detailLabel = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const detailValue = (value: unknown): string => {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.map(detailValue).join(', ');
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${detailLabel(key)}: ${detailValue(item)}`).join(' · ');
  return String(value);
};

export default function ReportsScreen() {
  const { mode, name, search: initialSearch, filter: initialFilter } = useLocalSearchParams<{ mode?: string; name?: string; search?: string; filter?: string }>();
  const admin = mode === 'admin';
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [unassigningId, setUnassigningId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(typeof initialSearch === 'string' ? initialSearch : '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>(initialFilter === 'assigned' || initialFilter === 'unassigned' ? initialFilter : 'all');
  const [selected, setSelected] = useState<Awaited<ReturnType<typeof reportsApi.get>> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailReportId, setDetailReportId] = useState<number | null>(null);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [customers, setCustomers] = useState<ReportUser[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const visibleReports = reports.filter((report) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [report.sample_id, report.customer, report.equipment, report.assigned_user_name, report.assigned_user_email]
      .some((value) => value?.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'assigned' ? Boolean(report.assigned_user_id) : !report.assigned_user_id);
    return matchesSearch && matchesStatus;
  });

  const confirmAction = (title: string, message: string, action: () => Promise<void>) => {
    const execute = () => { void action(); };
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`${title}\n\n${message}`)) execute();
    } else Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', style: 'destructive', onPress: execute }]);
  };

  const openDetails = async (reportId: number) => {
    setSelected(null);
    setDetailError('');
    setDetailReportId(reportId);
    setDetailLoading(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const report = await Promise.race([
        reportsApi.get(reportId),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('The server is taking too long to load this report. Check your connection and try again.')), 15000); }),
      ]);
      setSelected(report);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Report details could not be loaded.');
    } finally {
      if (timer) clearTimeout(timer);
      setDetailLoading(false);
    }
  };

  const unassign = async (report: ReportListItem) => {
    setError('');
    setUnassigningId(report.id);
    try {
      await reportsApi.unassign(report.id);
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, assigned_user_id: null, assigned_user_name: null, assigned_user_email: null } : item));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unassign this report.');
    } finally {
      setUnassigningId(null);
    }
  };

  const deleteReport = async (report: ReportListItem) => {
    try { await reportsApi.deleteReport(report.id); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete this report.'); }
  };

  const toggleSelected = (id: number) => setSelectedReportIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const startBulkAssign = async () => {
    setError(''); setCustomerSearch(''); setSelectedCustomerId(null); setAssignModalOpen(true);
    try { setCustomers((await reportsApi.listUsers()).filter((user) => user.role === 'user')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Customer accounts could not be loaded.'); setAssignModalOpen(false); }
  };

  const saveBulkAssignment = async () => {
    if (!selectedCustomerId || !selectedReportIds.length) return;
    setBulkSaving(true); setError('');
    try {
      await reportsApi.assignMany(selectedReportIds, selectedCustomerId);
      setSelectedReportIds([]); setAssignModalOpen(false); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Reports could not be assigned.'); }
    finally { setBulkSaving(false); }
  };

  const matchingCustomers = customers.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(customerSearch.trim().toLowerCase()));

  useFocusEffect(useCallback(() => {
    let active = true;
    const fetchReports = async () => {
      setLoading(true);
      setError('');
      try {
        const result = admin ? await reportsApi.listAdmin() : await reportsApi.listAssigned();
        if (active) setReports(result);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Reports could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchReports();
    return () => { active = false; };
  }, [admin]));

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setReports(admin ? await reportsApi.listAdmin() : await reportsApi.listAssigned());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reports could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const openPdf = async (report: ReportListItem) => {
    setBusyId(report.id);
    setError('');
    try {
      const { pdf_base64: base64 } = await reportsApi.download(report.id);
      if (Platform.OS === 'web') throw new Error('PDF download is available in the mobile app.');
      const safeId = report.sample_id.replace(/[^a-zA-Z0-9_-]+/g, '-');
      const file = new File(Paths.document, `EnergySolutions-Report-${report.id}-${safeId}.pdf`);
      if (file.exists) file.delete();
      file.create();
      file.write(base64, { encoding: 'base64' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('PDF opening is not available on this device.');
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Oil report - ${report.sample_id}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The PDF could not be opened.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back"><Text style={styles.back}>‹</Text></TouchableOpacity>
        <View style={styles.headerCopy}>
          <Image source={require('../../assets/energySolustion/img37.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>{admin ? 'Saved reports' : 'My oil reports'}</Text>
        </View>
        {admin ? <TouchableOpacity style={styles.newButton} onPress={() => router.push({ pathname: '/create-report', params: { admin: 'true', name: name ?? '' } })}>
          <Text style={styles.newButtonText}>+ New</Text>
        </TouchableOpacity> : null}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>{admin ? 'Review PDFs, edit report details, and assign customers in a separate step.' : 'Reports assigned to your account are available here.'}</Text>
        {loading ? <ActivityIndicator color="#16834B" style={styles.loading} /> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {admin ? <>
          <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Search sample, customer, equipment, assignee" placeholderTextColor="#8B9AA8" />
          <View style={styles.filters}>{(['all', 'assigned', 'unassigned'] as const).map((filter) => <TouchableOpacity key={filter} onPress={() => setStatusFilter(filter)} style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}><Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>{filter === 'all' ? 'All reports' : filter === 'assigned' ? 'Assigned' : 'Unassigned'}</Text></TouchableOpacity>)}<TouchableOpacity style={styles.filterChip} onPress={() => { const visibleIds = visibleReports.map((report) => report.id); setSelectedReportIds((current) => current.length === visibleIds.length && visibleIds.every((id) => current.includes(id)) ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])]); }}><Text style={styles.filterText}>{visibleReports.length > 0 && visibleReports.every((report) => selectedReportIds.includes(report.id)) ? 'Clear visible' : 'Select visible'}</Text></TouchableOpacity></View>
          {selectedReportIds.length > 0 ? <View style={styles.bulkBar}><Text style={styles.bulkCount}>{selectedReportIds.length} reports selected</Text><TouchableOpacity style={styles.bulkButton} onPress={() => void startBulkAssign()}><Text style={styles.bulkButtonText}>Assign selected</Text></TouchableOpacity><TouchableOpacity onPress={() => setSelectedReportIds([])}><Text style={styles.clearSelection}>Clear</Text></TouchableOpacity></View> : null}
        </> : null}
        {!loading && reports.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No reports yet</Text><Text style={styles.emptyCopy}>{admin ? 'Generate a report to see it here, then assign it to a customer when ready.' : 'Your assigned reports will appear here.'}</Text></View> : null}
        {!loading && reports.length > 0 && visibleReports.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No matching reports</Text><Text style={styles.emptyCopy}>Try another search or status filter.</Text></View> : null}
        {visibleReports.map((report) => (
          <View style={styles.card} key={report.id}>
            <View style={styles.cardTop}>
              <Text style={styles.sample}>SAMPLE {report.sample_id}</Text>
              <View style={styles.dateAndSelect}><Text style={styles.date}>{report.report_date}</Text>{admin ? <TouchableOpacity style={[styles.selectBox, selectedReportIds.includes(report.id) && styles.selectBoxActive]} onPress={() => toggleSelected(report.id)} accessibilityLabel={`Select report ${report.sample_id}`}><Text style={styles.selectMark}>{selectedReportIds.includes(report.id) ? '✓' : ''}</Text></TouchableOpacity> : null}</View>
            </View>
            <Text style={styles.customer}>{report.customer}</Text>
            <Text style={styles.equipment}>{report.equipment}</Text>
            {admin ? <Text style={styles.assignee}>{report.assigned_user_name ? `Assigned to ${report.assigned_user_name} · ${report.assigned_user_email}` : 'Not assigned'}</Text> : null}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.openButton} onPress={() => void openPdf(report)} disabled={busyId === report.id}>
                {busyId === report.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.openText}>Open / save PDF</Text>}
              </TouchableOpacity>
              {admin ? (
                <>
                  <TouchableOpacity style={styles.editButton} onPress={() => router.push({ pathname: '/create-report', params: { admin: 'true', name: name ?? '', reportId: String(report.id) } })}>
                    <Text style={styles.editText}>Edit report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.assignButton} onPress={() => router.push({ pathname: '/assign-report', params: { admin: 'true', name: name ?? '', reportId: String(report.id) } })}>
                    <Text style={styles.assignText}>{report.assigned_user_id ? 'Reassign' : 'Assign user'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.detailButton} onPress={() => void openDetails(report.id)}><Text style={styles.detailText}>Details</Text></TouchableOpacity>
                  {report.assigned_user_id ? <TouchableOpacity style={styles.detailButton} disabled={unassigningId === report.id} onPress={() => confirmAction('Unassign report', `Remove ${report.sample_id} from ${report.assigned_user_name ?? 'the customer'}?`, () => unassign(report))}><Text style={styles.detailText}>{unassigningId === report.id ? 'Unassigning…' : 'Unassign'}</Text></TouchableOpacity> : null}
                  <TouchableOpacity style={styles.deleteButton} onPress={() => confirmAction('Delete report', `Permanently delete ${report.sample_id}?`, () => deleteReport(report))}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        ))}
        {!loading ? <TouchableOpacity style={styles.refresh} onPress={() => void refresh()}><Text style={styles.refreshText}>Refresh list</Text></TouchableOpacity> : null}
      </ScrollView>
      <Modal visible={detailLoading || Boolean(selected) || Boolean(detailError)} transparent animationType="fade" onRequestClose={() => { setSelected(null); setDetailError(''); }}>
        <View style={styles.modalShade}><View style={styles.modalCard}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{detailLoading ? 'Loading report…' : detailError ? 'Could not load report' : `Sample ${selected?.sample_id}`}</Text><TouchableOpacity onPress={() => { setSelected(null); setDetailError(''); }}><Text style={styles.modalClose}>×</Text></TouchableOpacity></View>
          {detailError ? <View style={{ padding: 18 }}><Text style={styles.error}>{detailError}</Text><TouchableOpacity style={styles.bulkButton} onPress={() => { if (detailReportId != null) void openDetails(detailReportId); }}><Text style={styles.bulkButtonText}>Try again</Text></TouchableOpacity></View> : null}
          {detailLoading ? <ActivityIndicator color={Brand.primary} style={{ padding: 26 }} /> : selected ? <ScrollView style={styles.detailScroll}>
            {Object.entries(selected.data ?? {}).filter(([key]) => key !== 'rubbingWearImage').map(([key, value]) => <View key={key} style={styles.detailRow}><Text style={styles.detailKey}>{detailLabel(key)}</Text><Text style={styles.detailValue}>{detailValue(value)}</Text></View>)}
          </ScrollView> : null}
        </View></View>
      </Modal>
      <Modal visible={assignModalOpen} transparent animationType="slide" onRequestClose={() => setAssignModalOpen(false)}>
        <View style={styles.modalShade}><View style={styles.modalCard}>
          <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Assign reports</Text><Text style={styles.assignSubtitle}>{selectedReportIds.length} selected · Choose a customer</Text></View><TouchableOpacity onPress={() => setAssignModalOpen(false)}><Text style={styles.modalClose}>×</Text></TouchableOpacity></View>
          <TextInput style={styles.search} value={customerSearch} onChangeText={setCustomerSearch} placeholder="Search customer name or email" placeholderTextColor="#8B9AA8" />
          <ScrollView style={styles.customerList} keyboardShouldPersistTaps="handled">
            {matchingCustomers.map((user) => <TouchableOpacity key={user.id} style={[styles.customerOption, selectedCustomerId === user.id && styles.customerOptionActive]} onPress={() => setSelectedCustomerId(user.id)}><View style={[styles.radio, selectedCustomerId === user.id && styles.radioActive]}>{selectedCustomerId === user.id ? <View style={styles.radioDot} /> : null}</View><View style={{ flex: 1 }}><Text style={styles.customerOptionName}>{user.name}</Text><Text style={styles.customerOptionEmail}>{user.email}</Text></View></TouchableOpacity>)}
            {matchingCustomers.length === 0 ? <Text style={styles.noCustomers}>No customers match this search.</Text> : null}
          </ScrollView>
          <TouchableOpacity style={[styles.bulkButton, (!selectedCustomerId || bulkSaving) && styles.disabledBulk]} disabled={!selectedCustomerId || bulkSaving} onPress={() => void saveBulkAssignment()}>{bulkSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.bulkButtonText}>Assign {selectedReportIds.length} reports</Text>}</TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  header: { minHeight: 90, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderColor: '#E5ECF1' },
  backButton: { width: 42, height: 42, borderRadius: Shape.control, backgroundColor: Brand.canvas, alignItems: 'center', justifyContent: 'center' },
  back: { color: '#355169', fontSize: 30, lineHeight: 35 },
  logo: { width: 110, height: 56, marginBottom: 2 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#16834B', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: Brand.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  newButton: { backgroundColor: Brand.primary, borderRadius: Shape.control, paddingHorizontal: 15, paddingVertical: 11 },
  newButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  content: { padding: 20, paddingBottom: 34, maxWidth: 760, width: '100%', alignSelf: 'center' },
  subtitle: { color: '#718194', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  search: { minHeight: 48, borderWidth: 1, borderColor: '#DCE5EA', borderRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 14, color: Brand.text, marginBottom: 10 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 13 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: '#DCE5EA', backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 8 },
  filterChipActive: { backgroundColor: '#E8F5ED', borderColor: '#B8DCC6' },
  filterText: { color: '#526579', fontWeight: '700', fontSize: 11 }, filterTextActive: { color: '#16834B' },
  bulkBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E8F5ED', borderColor: '#B8DCC6', borderWidth: 1, padding: 10, borderRadius: 12, marginBottom: 13 }, bulkCount: { flex: 1, color: '#12663C', fontWeight: '800', fontSize: 11 }, bulkButton: { minHeight: 42, backgroundColor: Brand.primary, borderRadius: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }, bulkButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, clearSelection: { color: '#526579', fontWeight: '700', fontSize: 11 }, dateAndSelect: { flexDirection: 'row', alignItems: 'center', gap: 10 }, selectBox: { width: 23, height: 23, borderRadius: 6, borderWidth: 1.5, borderColor: '#9AABB8', alignItems: 'center', justifyContent: 'center' }, selectBoxActive: { borderColor: Brand.primary, backgroundColor: Brand.primary }, selectMark: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  loading: { marginTop: 30 },
  error: { color: '#B42318', backgroundColor: '#FEF3F2', borderRadius: 10, padding: 12, fontSize: 13, marginVertical: 8 },
  empty: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginTop: 8 },
  emptyTitle: { color: '#172B3A', fontWeight: '800', fontSize: 16 },
  emptyCopy: { color: '#718194', fontSize: 13, lineHeight: 19, marginTop: 7 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E5ECF1' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sample: { color: '#16834B', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  date: { color: '#8190A0', fontSize: 10 },
  customer: { color: '#172B3A', fontSize: 16, fontWeight: '800', marginTop: 9 },
  equipment: { color: '#526579', fontSize: 12, marginTop: 3 },
  assignee: { color: '#718194', fontSize: 11, marginTop: 9 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  openButton: { minHeight: 48, flex: 1, borderRadius: Shape.control, backgroundColor: Brand.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  openText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  editButton: { minHeight: 46, flex: 1, borderRadius: 11, borderWidth: 1, borderColor: '#D1DCE4', backgroundColor: '#F8FAFB', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  editText: { color: '#355169', fontWeight: '800', fontSize: 11 },
  assignButton: { minHeight: 46, flex: 1, borderRadius: 11, borderWidth: 1, borderColor: '#B8DCC6', backgroundColor: '#F3FAF5', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  assignText: { color: '#16834B', fontWeight: '800', fontSize: 11 },
  detailButton: { minHeight: 46, flex: 1, borderRadius: 11, borderWidth: 1, borderColor: '#D1DCE4', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  detailText: { color: '#355169', fontWeight: '800', fontSize: 11 },
  deleteButton: { minHeight: 46, flex: 1, borderRadius: 11, borderWidth: 1, borderColor: '#F1C8C5', backgroundColor: '#FFF7F6', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  deleteText: { color: '#B42318', fontWeight: '800', fontSize: 11 },
  modalShade: { flex: 1, backgroundColor: 'rgba(9,25,38,0.58)', justifyContent: 'center', padding: 18 },
  modalCard: { maxHeight: '84%', width: '100%', maxWidth: 650, alignSelf: 'center', borderRadius: 18, backgroundColor: '#FFFFFF', padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#E5ECF1', paddingBottom: 12 },
  modalTitle: { color: Brand.text, fontSize: 18, fontWeight: '800' }, modalClose: { color: '#526579', fontSize: 30, lineHeight: 32, paddingHorizontal: 5 },
  detailScroll: { marginTop: 8 }, detailRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#EDF1F4' }, detailKey: { color: '#16834B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 }, detailValue: { color: '#34495A', fontSize: 13, lineHeight: 19, marginTop: 4 },
  assignSubtitle: { color: '#718194', fontSize: 11, marginTop: 4 }, customerList: { maxHeight: 360, marginVertical: 10 }, customerOption: { minHeight: 63, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E3EAEF', borderRadius: 12, padding: 11, marginBottom: 8 }, customerOptionActive: { borderColor: Brand.primary, backgroundColor: '#F1F9F4' }, radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: '#9AABB8', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, radioActive: { borderColor: Brand.primary }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Brand.primary }, customerOptionName: { color: Brand.text, fontSize: 13, fontWeight: '800' }, customerOptionEmail: { color: '#718194', fontSize: 11, marginTop: 3 }, noCustomers: { color: '#718194', textAlign: 'center', padding: 18 }, disabledBulk: { opacity: 0.55 },
  refresh: { alignSelf: 'center', padding: 12 },
  refreshText: { color: '#16834B', fontWeight: '800', fontSize: 12 },
});
