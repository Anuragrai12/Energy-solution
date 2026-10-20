import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setCredentials } from '@/lib/session';
import { Brand, Shape } from '@/constants/brand';
import { getApiBaseUrl } from '@/lib/api-config';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Enter both your email address and password.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${await getApiBaseUrl()}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const responseBody = await response.text();
      let result: { status?: boolean; data?: { role?: string; name?: string; email?: string }; message?: string } | null = null;
      try {
        result = responseBody.trim() ? JSON.parse(responseBody) : null;
      } catch {
        result = null;
      }

      if (!result) {
        console.error('Login API returned an empty or invalid JSON response.', {
          status: response.status,
          contentType: response.headers.get('content-type'),
          bodyLength: responseBody.length,
          bodyPreview: responseBody.trim().slice(0, 240).replace(/\s+/g, ' '),
        });
        const looksLikeHtml = /<\s*(?:!doctype\s+html|html|head|body)\b/i.test(responseBody);
        setError(looksLikeHtml
          ? `The API address returned a web page instead of login data (HTTP ${response.status}). Check Admin Settings and set the API URL to the folder containing login.php.`
          : responseBody.trim()
            ? `The login service returned an invalid response (HTTP ${response.status}). Check the server API configuration.`
            : `The login service returned an empty response (HTTP ${response.status}). Please try again later or contact support.`);
        return;
      }

      if (!response.ok || !result.status || !result.data) {
        setError('Login failed. Check your credentials and try again.');
        return;
      }

      const user = result.data;
      setCredentials(cleanEmail, password);
      const isAdmin = String(user.role ?? '').trim().toLowerCase() === 'admin';
      const destination = isAdmin ? '/admin' : '/home';
      router.replace({
        pathname: destination,
        params: { name: String(user.name ?? ''), email: String(user.email ?? cleanEmail) },
      });
    } catch (e) {
      setError('Could not connect to the server. Check your internet connection and try again.');
      console.error('Login request failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image source={require('../../assets/energySolustion/img37.png')} style={styles.logoImage} resizeMode="contain" />
            <View style={styles.brandPill}><View style={styles.brandDot} /><Text style={styles.brand}>CUSTOMER & ADMIN PORTAL</Text></View>
            <Text style={styles.heroTitle}>Powering a{ '\n' }brighter future.</Text>
            <Text style={styles.heroCaption}>Sign in to manage your energy, your way.</Text>
            <View style={styles.heroGlow} />
          </View>

          <View style={styles.card}>
            <View style={styles.cardIntro}>
              <View><Text style={styles.cardEyebrow}>ACCOUNT ACCESS</Text><Text style={styles.heading}>Welcome back</Text></View>
              <View style={styles.secureBadge}><Text style={styles.secureBadgeText}>SECURE</Text></View>
            </View>
            <Text style={styles.subheading}>Sign in to continue to your Energy Solution account.</Text>

            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={styles.inputShell}>
              <Text style={styles.inputIcon}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#96A5B5"
                value={email}
                onChangeText={(value) => { setEmail(value); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="next"
                editable={!loading}
                accessibilityLabel="Email address"
              />
            </View>

            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>PASSWORD</Text>
            </View>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#96A5B5"
                value={password}
                onChangeText={(value) => { setPassword(value); setError(''); }}
                secureTextEntry={!passwordVisible}
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setPasswordVisible((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}>
                <Text style={styles.showPassword}>{passwordVisible ? 'HIDE' : 'SHOW'}</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.86}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Sign in  →</Text>}
            </TouchableOpacity>

            <View style={styles.secureNoteRow}><Text style={styles.lock}>✓</Text><Text style={styles.secureNote}>Your details are protected with secure sign in.</Text></View>
          </View>
          <Text style={styles.footer}>ENERGY SOLUTION  ·  CLEANER ENERGY, SMARTER LIVING</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: Brand.canvas },
  scrollContent: { flexGrow: 1, paddingBottom: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: {
    minHeight: 310,
    overflow: 'hidden',
    backgroundColor: Brand.ink,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 68,
  },
  logoImage: { width: 176, height: 68, borderRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 7, marginBottom: 19 },
  brandPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1A3A50' },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#78D89D' },
  brand: { color: '#B8F0CB', fontSize: 9, letterSpacing: 1.5, fontWeight: '800' },
  heroTitle: { color: '#FFFFFF', fontSize: 33, lineHeight: 39, fontWeight: '800', marginTop: 14 },
  heroCaption: { color: '#C3D2DF', fontSize: 14, marginTop: 9 },
  heroGlow: {
    position: 'absolute', width: 210, height: 210, borderRadius: 105,
    backgroundColor: '#174666', right: -80, top: 105, opacity: 0.55, pointerEvents: 'none',
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, marginHorizontal: 18, marginTop: -42,
    paddingHorizontal: 23, paddingTop: 25, paddingBottom: 23, borderWidth: 1, borderColor: '#E8EEF2',
    shadowColor: '#15324B', shadowOpacity: 0.14, shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 }, elevation: 6,
  },
  cardIntro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardEyebrow: { color: Brand.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  secureBadge: { backgroundColor: Brand.primaryTint, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  secureBadgeText: { color: Brand.primaryDark, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  heading: { fontSize: 25, color: Brand.text, fontWeight: '800' },
  subheading: { marginTop: 7, marginBottom: 23, fontSize: 13, lineHeight: 19, color: '#728294' },
  label: { color: '#526579', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 9 },
  inputShell: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Brand.border, borderRadius: Shape.control, backgroundColor: '#FBFCFD', paddingLeft: 14, paddingRight: 10, marginBottom: 19 },
  inputIcon: { width: 25, color: '#8393A2', fontWeight: '700', fontSize: 17 },
  input: {
    flex: 1, minHeight: 52, paddingHorizontal: 5, color: Brand.text, fontSize: 15, backgroundColor: 'transparent',
  },
  passwordLabelRow: { flexDirection: 'row' },
  passwordWrap: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: Brand.border, borderRadius: Shape.control, backgroundColor: '#FBFCFD', paddingHorizontal: 15,
  },
  passwordInput: { flex: 1, color: Brand.text, fontSize: 15, paddingVertical: 12 },
  showPassword: { color: '#14804A', fontWeight: '800', fontSize: 10, letterSpacing: 0.8, padding: 5 },
  error: { color: '#B42318', backgroundColor: '#FEF3F2', borderRadius: 9, padding: 11, marginTop: 14, fontSize: 13, lineHeight: 19 },
  button: {
    minHeight: 54, borderRadius: Shape.control, backgroundColor: Brand.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 22,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secureNoteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 19 },
  secureNote: { color: '#8190A0', fontSize: 10 },
  lock: { color: Brand.primary, fontWeight: '900', fontSize: 12 },
  footer: { textAlign: 'center', marginHorizontal: 20, marginTop: 21, color: '#8795A3', fontSize: 9, letterSpacing: 1.1 },
});
