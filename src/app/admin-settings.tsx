import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkApiConnection, getApiBaseUrl, setApiBaseUrl } from '@/lib/api-config';
import { getCredentials, setCredentials } from '@/lib/session';
import { reportsApi } from '@/lib/reports-api';
import { Brand } from '@/constants/brand';

export default function AdminSettingsScreen() {
  const params = useLocalSearchParams<{ admin?: string; email?: string }>();
  const router = useRouter();
  const admin = params.admin === 'true';
  const [apiRoot, setApiRoot] = useState('https://brocode.fun/api');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  useEffect(() => { void getApiBaseUrl().then(setApiRoot); }, []);
  if (!admin) return <Redirect href="/" />;

  const run = async (task: () => Promise<void>) => { setBusy(true); setMessage(''); setMessageError(false); try { await task(); } catch (e) { setMessageError(true); setMessage(e instanceof Error ? e.message : 'The action could not be completed.'); } finally { setBusy(false); } };
  const saveApi = () => run(async () => { const saved = await setApiBaseUrl(apiRoot); setApiRoot(saved); setMessage('API server address saved on this device. Use the same URL as the admin website for shared data.'); });
  const testConnection = () => run(async () => { const ok = await checkApiConnection(apiRoot); if (!ok) throw new Error('The API server returned an error. Check the address and server status.'); setMessage('Server is reachable.'); });
  const changePassword = () => run(async () => {
    if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) throw new Error('The passwords do not match.');
    await reportsApi.changePassword(newPassword);
    const credentials = getCredentials();
    setCredentials(credentials.email || params.email || '', newPassword);
    setNewPassword(''); setConfirmPassword(''); setMessage('Administrator password updated successfully.');
  });

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.back}>‹</Text></TouchableOpacity><Image source={require('../../assets/energySolustion/img37.png')} style={styles.logo} resizeMode="contain" /><View style={{ width: 40 }} /></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Admin settings</Text><Text style={styles.subtitle}>Configure this app to use the same API server as the admin website.</Text>
      <View style={styles.card}><Text style={styles.cardTitle}>Shared API server</Text><Text style={styles.help}>Both the app and website must point to the same server to show the same users and reports.</Text><Text style={styles.label}>API BASE URL</Text><TextInput style={styles.input} value={apiRoot} onChangeText={setApiRoot} autoCapitalize="none" keyboardType="url" placeholder="https://brocode.fun/api" placeholderTextColor="#8B9AA8" /><View style={styles.buttonRow}><TouchableOpacity style={styles.secondaryButton} disabled={busy} onPress={() => void testConnection()}><Text style={styles.secondaryText}>Test connection</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} disabled={busy} onPress={() => void saveApi()}><Text style={styles.primaryText}>Save server</Text></TouchableOpacity></View></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Change administrator password</Text><Text style={styles.help}>Use at least 6 characters. The current app session will be updated after a successful change.</Text><TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="New password" placeholderTextColor="#8B9AA8" secureTextEntry autoCapitalize="none" /><TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor="#8B9AA8" secureTextEntry autoCapitalize="none" /><TouchableOpacity style={styles.primaryButton} disabled={busy} onPress={() => void changePassword()}><Text style={styles.primaryText}>Update password</Text></TouchableOpacity></View>
      {busy ? <ActivityIndicator color={Brand.primary} style={{ marginTop: 10 }} /> : null}{message ? <Text style={[styles.message, messageError && styles.messageError]}>{message}</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: Brand.canvas }, header: { minHeight: 76, flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E5ECF1' }, backButton: { width: 40, height: 40, backgroundColor: Brand.canvas, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, back: { color: '#355169', fontSize: 30, lineHeight: 34 }, logo: { flex: 1, height: 58 }, content: { padding: 20, paddingBottom: 35, maxWidth: 720, width: '100%', alignSelf: 'center' }, title: { color: Brand.text, fontSize: 25, fontWeight: '800' }, subtitle: { color: '#718194', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 18 }, card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5ECF1', borderRadius: 16, padding: 17, marginBottom: 13 }, cardTitle: { color: Brand.text, fontSize: 16, fontWeight: '800' }, help: { color: '#718194', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 16 }, label: { color: '#526579', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 7 }, input: { minHeight: 49, borderWidth: 1, borderColor: Brand.border, borderRadius: 11, paddingHorizontal: 13, marginBottom: 10, color: Brand.text, backgroundColor: '#FBFCFD' }, buttonRow: { flexDirection: 'row', gap: 9 }, primaryButton: { minHeight: 47, flex: 1, borderRadius: 11, backgroundColor: Brand.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }, primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 }, secondaryButton: { minHeight: 47, flex: 1, borderRadius: 11, borderWidth: 1, borderColor: '#B8DCC6', backgroundColor: '#F3FAF5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, secondaryText: { color: Brand.primary, fontWeight: '800', fontSize: 12 }, message: { color: Brand.primary, lineHeight: 19, fontSize: 12, padding: 12, backgroundColor: '#E8F5ED', borderRadius: 10 }, messageError: { color: '#B42318', backgroundColor: '#FEF3F2' } });
