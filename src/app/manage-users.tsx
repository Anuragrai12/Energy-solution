import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reportsApi, type ReportUser } from '@/lib/reports-api';
import { Brand } from '@/constants/brand';

export default function ManageUsersScreen() {
  const params = useLocalSearchParams<{ admin?: string; name?: string; email?: string }>();
  const router = useRouter();
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [message, setMessage] = useState('');
  const admin = params.admin === 'true';

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('');
    try { setUsers(await reportsApi.listUsers(true)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Users could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(loadUsers); }, [loadUsers]);

  const visibleUsers = useMemo(() => users.filter((user) => {
    const term = query.trim().toLowerCase();
    return (roleFilter === 'all' || user.role === roleFilter) && (!term || `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(term));
  }), [users, query, roleFilter]);

  const createUser = async () => {
    if (!newName.trim() || !/^\S+@\S+\.\S+$/.test(newEmail.trim()) || newPassword.length < 4) { setMessage('Enter a name, valid email, and password with at least 4 characters.'); return; }
    setBusy(true); setMessage('');
    try {
      await reportsApi.createUser({ name: newName.trim(), email: newEmail.trim(), password: newPassword, role: newRole });
      setMessage(`${newRole === 'admin' ? 'Admin' : 'Customer'} account created.`); setNewName(''); setNewEmail(''); setNewPassword('');
      await loadUsers();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Account could not be created.'); }
    finally { setBusy(false); }
  };

  const deleteUser = (user: ReportUser) => {
    const execute = async () => {
      setBusy(true); setError('');
      try { await reportsApi.deleteUser(user.id); await loadUsers(); }
      catch (e) { setError(e instanceof Error ? e.message : 'User could not be deleted.'); }
      finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (globalThis.confirm(`Delete ${user.name}? Their assigned reports will become unassigned.`)) void execute(); }
    else Alert.alert('Delete account', `Delete ${user.name}? Their assigned reports will become unassigned.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void execute() }]);
  };

  if (!admin) return <Redirect href="/" />;
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.back}>‹</Text></TouchableOpacity><Image source={require('../../assets/energySolustion/img37.png')} style={styles.logo} resizeMode="contain" /><TouchableOpacity style={styles.addButton} onPress={() => { setShowForm((open) => !open); setMessage(''); }}><Text style={styles.addText}>{showForm ? 'Close' : '+ Add'}</Text></TouchableOpacity></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>User management</Text><Text style={styles.subtitle}>Customer and administrator accounts on the shared server.</Text>
      <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search name, email, or role" placeholderTextColor="#8B9AA8" />
      <View style={styles.filters}>{(['all', 'user', 'admin'] as const).map((role) => <TouchableOpacity key={role} onPress={() => setRoleFilter(role)} style={[styles.filter, roleFilter === role && styles.filterActive]}><Text style={[styles.filterText, roleFilter === role && styles.filterTextActive]}>{role === 'all' ? `All (${users.length})` : role === 'user' ? 'Customers' : 'Admins'}</Text></TouchableOpacity>)}</View>
      {showForm ? <View style={styles.form}><Text style={styles.formTitle}>Create account</Text>
        <View style={styles.roleSwitch}>{(['user', 'admin'] as const).map((role) => <TouchableOpacity key={role} onPress={() => setNewRole(role)} style={[styles.roleOption, newRole === role && styles.roleOptionActive]}><Text style={[styles.roleOptionText, newRole === role && styles.roleOptionTextActive]}>{role === 'user' ? 'Customer' : 'Admin'}</Text></TouchableOpacity>)}</View>
        <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Full name" placeholderTextColor="#8B9AA8" />
        <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} placeholder="Email address" placeholderTextColor="#8B9AA8" keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Initial password" placeholderTextColor="#8B9AA8" secureTextEntry autoCapitalize="none" />
        {message ? <Text style={styles.formMessage}>{message}</Text> : null}
        <TouchableOpacity style={styles.primaryButton} disabled={busy} onPress={() => void createUser()}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Create {newRole === 'admin' ? 'admin' : 'customer'} account</Text>}</TouchableOpacity>
      </View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}{loading ? <ActivityIndicator color={Brand.primary} style={{ marginTop: 28 }} /> : null}
      {!loading && visibleUsers.length === 0 ? <View style={styles.empty}><Text style={styles.cardName}>No matching accounts</Text><Text style={styles.cardMeta}>Change the search or role filter to see accounts.</Text></View> : null}
      {visibleUsers.map((user) => <View style={styles.userCard} key={user.id}>
        <View style={styles.userTop}><View style={styles.avatar}><Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.userCopy}><Text style={styles.cardName}>{user.name}</Text><Text style={styles.cardMeta}>{user.email}</Text></View><View style={[styles.badge, user.role === 'admin' && styles.adminBadge]}><Text style={[styles.badgeText, user.role === 'admin' && styles.adminBadgeText]}>{user.role.toUpperCase()}</Text></View></View>
        <View style={styles.userActions}><Text style={styles.reportCount}>{user.report_count} assigned report{user.report_count === 1 ? '' : 's'}</Text><TouchableOpacity onPress={() => router.push({ pathname: '/reports', params: { mode: 'admin', name: params.name ?? '', search: user.name, filter: 'assigned' } })}><Text style={styles.viewReports}>View reports</Text></TouchableOpacity>{user.email.toLowerCase() !== (params.email ?? '').toLowerCase() ? <TouchableOpacity disabled={busy} onPress={() => deleteUser(user)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity> : <Text style={styles.selfLabel}>Your account</Text>}</View>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas }, header: { minHeight: 76, flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E5ECF1' }, backButton: { width: 40, height: 40, backgroundColor: Brand.canvas, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, back: { color: '#355169', fontSize: 30, lineHeight: 34 }, logo: { flex: 1, height: 58 }, addButton: { backgroundColor: Brand.primary, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11 }, addText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 }, content: { padding: 20, paddingBottom: 35, maxWidth: 760, width: '100%', alignSelf: 'center' }, title: { color: Brand.text, fontSize: 25, fontWeight: '800' }, subtitle: { color: '#718194', fontSize: 13, marginTop: 5, marginBottom: 18 }, search: { minHeight: 48, borderWidth: 1, borderColor: '#DCE5EA', borderRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 14, color: Brand.text }, filters: { flexDirection: 'row', gap: 8, marginVertical: 12 }, filter: { borderWidth: 1, borderColor: '#DCE5EA', borderRadius: 20, backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 8 }, filterActive: { borderColor: '#B8DCC6', backgroundColor: '#E8F5ED' }, filterText: { color: '#526579', fontSize: 11, fontWeight: '700' }, filterTextActive: { color: Brand.primary }, form: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E3EAEF' }, formTitle: { color: Brand.text, fontSize: 16, fontWeight: '800', marginBottom: 12 }, roleSwitch: { flexDirection: 'row', backgroundColor: '#F1F5F7', padding: 4, borderRadius: 11, marginBottom: 12 }, roleOption: { flex: 1, padding: 9, alignItems: 'center', borderRadius: 8 }, roleOptionActive: { backgroundColor: '#FFFFFF', elevation: 1 }, roleOptionText: { color: '#657789', fontWeight: '700', fontSize: 12 }, roleOptionTextActive: { color: Brand.primary }, input: { minHeight: 48, borderWidth: 1, borderColor: Brand.border, borderRadius: 11, paddingHorizontal: 12, backgroundColor: '#FBFCFD', marginBottom: 10, color: Brand.text }, primaryButton: { backgroundColor: Brand.ink, minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 4 }, primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 }, formMessage: { color: Brand.primary, fontSize: 12, marginBottom: 8 }, error: { color: '#B42318', padding: 10 }, empty: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 14 }, userCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5ECF1', borderRadius: 15, padding: 14, marginBottom: 10 }, userTop: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#DDF7E8', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: Brand.primary, fontWeight: '800', fontSize: 16 }, userCopy: { flex: 1, marginLeft: 11 }, cardName: { color: Brand.text, fontSize: 14, fontWeight: '800' }, cardMeta: { color: '#718194', fontSize: 11, marginTop: 3 }, badge: { borderRadius: 20, backgroundColor: '#E8F5ED', paddingHorizontal: 9, paddingVertical: 5 }, badgeText: { color: Brand.primary, fontSize: 9, fontWeight: '800' }, adminBadge: { backgroundColor: '#EAF0FA' }, adminBadgeText: { color: '#3D5C8A' }, userActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderColor: '#EDF1F4', marginTop: 12, paddingTop: 11 }, reportCount: { color: '#718194', fontSize: 10, flex: 1 }, viewReports: { color: Brand.primary, fontSize: 10, fontWeight: '800' }, deleteText: { color: '#B42318', fontWeight: '800', fontSize: 10 }, selfLabel: { color: '#8897A5', fontSize: 10 },
});
