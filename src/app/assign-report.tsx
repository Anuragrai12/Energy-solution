import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { reportsApi, type ReportUser, type SavedReport } from '@/lib/reports-api';
import { Brand, Shape } from '@/constants/brand';

export default function AssignReportScreen() {
  const { admin, reportId } = useLocalSearchParams<{ admin?: string; reportId?: string }>();
  const router = useRouter();
  const hasValidReportId = Number.isFinite(Number(reportId)) && Number(reportId) > 0;
  const [report, setReport] = useState<SavedReport | null>(null);
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(hasValidReportId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(hasValidReportId ? '' : 'A valid report was not selected.');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    const id = Number(reportId);
    if (!hasValidReportId) return () => { active = false; };
    Promise.all([reportsApi.get(id), reportsApi.listUsers()])
      .then(([savedReport, customerUsers]) => {
        if (!active) return;
        setReport(savedReport);
        setUsers(customerUsers);
        if (savedReport.assigned_user_id) setSelectedUserId(String(savedReport.assigned_user_id));
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Report details could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hasValidReportId, reportId]);

  if (admin !== 'true') return <Redirect href="/" />;

  const saveAssignment = async () => {
    if (!report || !selectedUserId) {
      setError('Select a customer account to assign this report.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await reportsApi.assign(report.id, Number(selectedUserId));
      setReport((current) => current ? { ...current, assigned_user_id: Number(selectedUserId) } : current);
      setSuccess('Report assigned successfully. The customer can now open and save the PDF.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The report could not be assigned.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back"><Text style={styles.back}>‹</Text></TouchableOpacity>
        <View style={styles.headerCopy}>
          <Image source={require('../../assets/energySolustion/img37.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Assign report</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Choose a customer after the report has been created. The selected customer will be able to view and save its PDF.</Text>
        {loading ? <ActivityIndicator color="#16834B" style={styles.loading} /> : null}
        {report ? (
          <View style={styles.reportCard}>
            <Text style={styles.sample}>SAMPLE {report.sample_id}</Text>
            <Text style={styles.customer}>{report.customer}</Text>
            <Text style={styles.equipment}>{report.equipment}</Text>
          </View>
        ) : null}
        {!loading && users.length === 0 ? <Text style={styles.hint}>No customer accounts are available. Create a user account first.</Text> : null}
        {users.map((user) => {
          const selected = selectedUserId === String(user.id);
          return (
            <Pressable
              key={user.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => { setSelectedUserId(String(user.id)); setSuccess(''); }}
              style={[styles.userCard, selected && styles.userCardSelected]}>
              <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
              <View style={styles.userCopy}>
                <Text style={[styles.userName, selected && styles.selectedText]}>{user.name}</Text>
                <Text style={[styles.userEmail, selected && styles.selectedText]}>{user.email}</Text>
              </View>
              {report?.assigned_user_id === user.id ? <Text style={styles.currentTag}>CURRENT</Text> : null}
            </Pressable>
          );
        })}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {success ? <Text accessibilityRole="alert" style={styles.success}>{success}</Text> : null}
        <TouchableOpacity style={[styles.saveButton, (saving || loading || !users.length) && styles.disabled]} onPress={() => void saveAssignment()} disabled={saving || loading || !users.length}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save assignment</Text>}
        </TouchableOpacity>
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 36, maxWidth: 760, width: '100%', alignSelf: 'center' },
  intro: { color: '#718194', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  loading: { marginVertical: 25 },
  reportCard: { backgroundColor: '#E7F6ED', borderWidth: 1, borderColor: '#C8E9D4', borderRadius: 13, padding: 14, marginBottom: 16 },
  sample: { color: '#16834B', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  customer: { color: '#172B3A', fontSize: 16, fontWeight: '800', marginTop: 7 },
  equipment: { color: '#526579', fontSize: 12, marginTop: 3 },
  hint: { color: '#B42318', fontSize: 12, marginBottom: 12 },
  userCard: { minHeight: 72, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE5EC', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  userCardSelected: { backgroundColor: '#F1F9F4', borderColor: '#16834B', borderWidth: 1.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#9AABB8', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  radioSelected: { borderColor: '#16834B' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16834B' },
  userCopy: { flex: 1 },
  userName: { color: '#172B3A', fontSize: 14, fontWeight: '800' },
  userEmail: { color: '#718194', fontSize: 12, marginTop: 4 },
  selectedText: { color: '#12663C' },
  currentTag: { color: '#16834B', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  error: { color: '#B42318', backgroundColor: '#FEF3F2', borderRadius: 9, padding: 11, marginTop: 8, fontSize: 12 },
  success: { color: '#137A43', backgroundColor: '#E7F6ED', borderRadius: 9, padding: 11, marginTop: 8, fontSize: 12, lineHeight: 18 },
  saveButton: { minHeight: 54, borderRadius: Shape.control, backgroundColor: Brand.primary, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  disabled: { opacity: 0.6 },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
