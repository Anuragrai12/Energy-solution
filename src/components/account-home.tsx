import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearCredentials } from '@/lib/session';
import { reportsApi, type AdminStats, type ReportListItem } from '@/lib/reports-api';
import { Brand, Shape } from '@/constants/brand';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AccountHomeProps = { name?: string; email?: string; admin?: boolean };

export function AccountHome({ name, email, admin = false }: AccountHomeProps) {
  const router = useRouter();
  const displayName = name?.trim() || (admin ? 'Administrator' : 'there');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentReports, setRecentReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(admin);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    if (!admin) return;
    setLoading(true); setError('');
    try {
      const [nextStats, reports] = await Promise.all([reportsApi.stats(), reportsApi.listAdmin()]);
      setStats(nextStats); setRecentReports(reports.slice(0, 5));
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Dashboard data could not be loaded.'); }
    finally { setLoading(false); }
  }, [admin]);
  useEffect(() => { void Promise.resolve().then(loadStats); }, [loadStats]);

  const navigate = (path: '/reports' | '/manage-users' | '/admin-settings' | '/create-report', params: Record<string, string> = {}) => {
    router.push({ pathname: path, params: { name: name ?? '', email: email ?? '', admin: 'true', ...params } });
  };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><Image source={require('../../assets/energySolustion/img37.png')} style={styles.logo} resizeMode="contain" /><View style={styles.rolePill}><Text style={styles.roleText}>{admin ? 'ADMIN' : 'CUSTOMER'}</Text></View></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}><Text style={styles.eyebrow}>{admin ? 'ADMINISTRATOR WORKSPACE' : 'CUSTOMER PORTAL'}</Text><Text style={styles.title}>Hello, {displayName}</Text><Text style={styles.subtitle}>{admin ? 'Manage reports, customer access, and your shared server workspace.' : 'Your energy account and assigned reports are ready.'}</Text>{email ? <Text style={styles.email}>{email}</Text> : null}</View>
      {admin ? <>
        <View style={styles.statsGrid}>
          {([['Reports', stats?.total_reports], ['Assigned', stats?.assigned_reports], ['Unassigned', stats?.unassigned_reports], ['Customers', stats?.total_users]] as const).map(([label, value]) => <View style={styles.statCard} key={label}><Text style={styles.statValue}>{loading ? '—' : value ?? '—'}</Text><Text style={styles.statLabel}>{label}</Text></View>)}
        </View>
        {loading ? <ActivityIndicator color={Brand.primary} style={{ marginVertical: 10 }} /> : null}{error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.recentHeader}><Text style={styles.sectionHeading}>Recent reports</Text><TouchableOpacity onPress={() => navigate('/reports', { mode: 'admin' })}><Text style={styles.seeAll}>See all</Text></TouchableOpacity></View>
        {recentReports.length ? recentReports.map((report) => <TouchableOpacity key={report.id} style={styles.recentCard} onPress={() => navigate('/reports', { mode: 'admin', search: report.sample_id })}><View style={styles.recentCopy}><Text style={styles.recentSample}>{report.sample_id}</Text><Text style={styles.recentMeta}>{report.customer} · {report.equipment}</Text></View><Text style={[styles.recentStatus, report.assigned_user_id ? styles.assigned : styles.unassigned]}>{report.assigned_user_id ? 'ASSIGNED' : 'UNASSIGNED'}</Text></TouchableOpacity>) : !loading ? <Text style={styles.noRecent}>Newly generated reports will show here.</Text> : null}
        <Text style={styles.sectionHeading}>Workspace</Text>
        <Action title="Manage reports" detail="Search, filter, inspect, assign, and download reports" icon="▤" onPress={() => navigate('/reports', { mode: 'admin' })} />
        <Action title="Create oil analysis report" detail="Generate a report PDF and save it to the shared server" icon="＋" onPress={() => navigate('/create-report')} />
        <Action title="Manage users" detail="Search customers and admins, create accounts, and review report counts" icon="♙" onPress={() => navigate('/manage-users')} />
        <Action title="Admin settings" detail="Change your password or API server address" icon="⚙" onPress={() => navigate('/admin-settings')} />
        <TouchableOpacity style={styles.refresh} onPress={() => void loadStats()}><Text style={styles.refreshText}>Refresh dashboard</Text></TouchableOpacity>
      </> : <Action title="My oil reports" detail="Open or save reports assigned to your account" icon="▤" onPress={() => router.push({ pathname: '/reports', params: { mode: 'user' } })} />}
      <TouchableOpacity style={styles.logout} onPress={() => { clearCredentials(); router.replace('/'); }}><Text style={styles.logoutText}>Sign out</Text></TouchableOpacity>
    </ScrollView>
    <Text style={styles.footer}>CLEANER ENERGY, SMARTER LIVING</Text>
  </SafeAreaView>;
}

function Action({ title, detail, icon, onPress }: { title: string; detail: string; icon: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.8}><View style={styles.actionIcon}><Text style={styles.iconText}>{icon}</Text></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDetail}>{detail}</Text></View><Text style={styles.arrow}>›</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas }, header: { minHeight: 74, backgroundColor: '#FFFFFF', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, logo: { width: 165, height: 66 }, rolePill: { backgroundColor: '#E8F5ED', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 }, roleText: { color: '#147A45', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 860, alignSelf: 'center', padding: 20, paddingTop: 22, paddingBottom: 28 }, hero: { backgroundColor: Brand.ink, borderRadius: Shape.panel, padding: 23, marginBottom: 18 }, eyebrow: { color: '#9BE2B5', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 10 }, subtitle: { color: '#D0DCE5', fontSize: 13, lineHeight: 20, marginTop: 8 }, email: { color: '#9BE2B5', fontSize: 12, fontWeight: '600', marginTop: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 23 }, statCard: { flexGrow: 1, flexBasis: '22%', minWidth: 115, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5ECF1', borderRadius: 14, padding: 15 }, statValue: { color: Brand.ink, fontSize: 23, fontWeight: '800' }, statLabel: { color: '#718194', fontSize: 11, fontWeight: '700', marginTop: 5 }, sectionHeading: { color: Brand.text, fontSize: 17, fontWeight: '800', marginBottom: 12 }, recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, seeAll: { color: Brand.primary, fontSize: 12, fontWeight: '800', marginBottom: 12 }, recentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3EAEF', borderRadius: 13, padding: 13, marginBottom: 8 }, recentCopy: { flex: 1 }, recentSample: { color: Brand.text, fontSize: 13, fontWeight: '800' }, recentMeta: { color: '#718194', fontSize: 10, marginTop: 3 }, recentStatus: { fontSize: 8, fontWeight: '800', borderRadius: 12, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 }, assigned: { color: '#147A45', backgroundColor: '#E8F5ED' }, unassigned: { color: '#A56808', backgroundColor: '#FFF4DC' }, noRecent: { color: '#718194', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, fontSize: 12, marginBottom: 18 }, action: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3EAEF', borderRadius: 15, padding: 15, marginBottom: 10 }, actionIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#DDF7E8', alignItems: 'center', justifyContent: 'center' }, iconText: { color: Brand.primary, fontSize: 21, fontWeight: '800' }, actionCopy: { flex: 1, marginLeft: 13 }, actionTitle: { color: Brand.text, fontSize: 14, fontWeight: '800' }, actionDetail: { color: '#718194', fontSize: 11, lineHeight: 16, marginTop: 4 }, arrow: { color: Brand.primary, fontSize: 26, paddingLeft: 8 }, refresh: { alignSelf: 'center', padding: 12 }, refreshText: { color: Brand.primary, fontSize: 12, fontWeight: '800' }, error: { color: '#B42318', marginBottom: 14 }, logout: { minHeight: 50, borderWidth: 1, borderColor: '#C9D5DE', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, logoutText: { color: '#355169', fontSize: 14, fontWeight: '700' }, footer: { color: '#8795A3', textAlign: 'center', padding: 16, fontSize: 9, letterSpacing: 1.1 },
});
