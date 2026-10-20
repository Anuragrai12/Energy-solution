import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand, Shape } from '@/constants/brand';

const services = [
  { number: '01', title: 'Oil condition monitoring', copy: 'Review lubricant condition and receive clear maintenance recommendations.' },
  { number: '02', title: 'Wear metals analysis', copy: 'Track wear indicators and identify changes that may need attention.' },
  { number: '03', title: 'Ferrography assessment', copy: 'Record particle observations and supporting laboratory findings.' },
];

export default function ExploreScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={require('../../assets/energySolustion/img37.png')} style={styles.logo} contentFit="contain" />
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>ENERGY & LUBRICANT RELIABILITY</Text>
          <Text style={styles.title}>Clear insights for critical equipment.</Text>
          <Text style={styles.intro}>EnergySolutions brings laboratory analysis and customer reporting together in one secure workspace.</Text>
        </View>
        <Text style={styles.sectionTitle}>What you can manage</Text>
        {services.map((service) => (
          <View style={styles.serviceCard} key={service.number}>
            <Text style={styles.number}>{service.number}</Text>
            <View style={styles.serviceCopy}>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceDescription}>{service.copy}</Text>
            </View>
          </View>
        ))}
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>Your reports, in one place</Text>
          <Text style={styles.calloutCopy}>Sign in to view customer reports or manage laboratory reports and user access.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/')} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Go to sign in</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footer}>OIL & FUEL TESTING SOLUTIONS</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 22, paddingTop: 16, paddingBottom: 32 },
  logo: { width: 178, height: 74, backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 21 },
  hero: { backgroundColor: Brand.ink, borderRadius: Shape.panel, padding: 24, marginBottom: 28 },
  eyebrow: { color: '#9BE2B5', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 29, lineHeight: 35, fontWeight: '800', marginTop: 13 },
  intro: { color: '#D0DCE5', fontSize: 14, lineHeight: 22, marginTop: 11 },
  sectionTitle: { color: '#172B3A', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  serviceCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Brand.surface, borderRadius: Shape.card, padding: 17, marginBottom: 10, borderWidth: 1, borderColor: '#E3EAEF' },
  number: { color: '#16834B', fontSize: 12, fontWeight: '800', marginRight: 14, marginTop: 1 },
  serviceCopy: { flex: 1 },
  serviceTitle: { color: '#172B3A', fontSize: 14, fontWeight: '800' },
  serviceDescription: { color: '#718194', fontSize: 12, lineHeight: 18, marginTop: 5 },
  callout: { backgroundColor: '#E7F6ED', borderRadius: 18, padding: 19, marginTop: 17 },
  calloutTitle: { color: '#172B3A', fontSize: 16, fontWeight: '800' },
  calloutCopy: { color: '#526579', fontSize: 12, lineHeight: 19, marginTop: 6 },
  button: { minHeight: 50, borderRadius: Shape.control, backgroundColor: Brand.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  footer: { color: '#8795A3', textAlign: 'center', paddingTop: 24, fontSize: 9, letterSpacing: 1.2 },
});
