import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator as ExpoImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { reportsApi } from '@/lib/reports-api';
import { REPORT_BRAND_IMAGES } from '@/lib/report-brand-images';
import { Brand, Shape } from '@/constants/brand';

import {
  buildOilReportHtml,
  TEST_GROUPS,
  type BrandImages,
  type Condition,
  type OilReportData,
  type WearSeverity,
  WEAR_ASSESSMENT_GROUPS,
  DEFAULT_WEAR_ASSESSMENTS,
} from '@/lib/oil-report';

const getWearSeverityColor = (value: WearSeverity) => {
  if (value === '') return '#8795A3';
  const score = typeof value === 'number' ? value : ({ None: 0, Few: 3, Moderate: 6, Heavy: 10 } as const)[value];
  if (!Number.isFinite(score)) return '#8795A3';
  const rating = Math.round(score);
  if (rating === 0) return '#FFFFFF';
  if (rating <= 4) return '#93D050';
  if (rating <= 7) return '#FFF200';
  return '#FF1515';
};

const CONDITIONS: Condition[] = ['Normal', 'Monitor', 'Critical'];

const dateToday = () => {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
};

const sanitizeNumeric = (value: string) => value;

const createBlankReport = (): OilReportData => ({
  customer: '',
  reportName: 'OIL ANALYSIS TEST REPORT',
  site: '',
  sampleId: '',
  equipment: '',
  lubricant: '',
  component: '',
  reservoir: '',
  runningHours: '',
  sampleDate: '',
  receivedDate: '',
  reportDate: dateToday(),
  lubricantCondition: '',
  wearCondition: '',
  recommendation: '',
  oilConditionObservation: '',
  results: {},
  limits: {},
  wpc: '',
  dl: '',
  ds: '',
  plp: '',
  allowableWpc: '',
  machineConditionRecommendation: '',
  machineConditionObservation: '',
  wearFindings: '',
  contaminationFindings: '',
  ferrographyDiscussion: '',
  ferrousWearParticles: '',
  wearAssessments: { ...DEFAULT_WEAR_ASSESSMENTS },
  wearLabels: {},
  trendValues: {},
  rubbingWearImage: '',
  rubbingWearImageName: 'Rubbing wear',
});

type TextFieldKey = Exclude<keyof OilReportData,
  'lubricantCondition' | 'wearCondition' | 'results'>;

export default function CreateReportScreen() {
  const { admin, name, reportId } = useLocalSearchParams<{ admin?: string; name?: string; reportId?: string }>();
  const router = useRouter();
  const [form, setForm] = useState<OilReportData>(createBlankReport);
  const [generating, setGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState('');
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [editingReportId, setEditingReportId] = useState<number | undefined>(
    reportId && Number.isFinite(Number(reportId)) ? Number(reportId) : undefined,
  );
  const [loadingReport, setLoadingReport] = useState(true);

  useEffect(() => {
    let active = true;
    const existingReport = reportId && Number.isFinite(Number(reportId))
      ? reportsApi.get(Number(reportId))
      : Promise.resolve(null);
    existingReport.then((report) => {
      if (!active) return;
      if (report) {
        setForm({
          ...createBlankReport(),
          ...report.data,
          machineConditionRecommendation: report.data.machineConditionRecommendation ?? [
            report.data.ferrographyDiscussion ? `Discussion of results: ${report.data.ferrographyDiscussion}` : '',
            report.data.wearFindings ? `Wear particle findings: ${report.data.wearFindings}` : '',
            report.data.contaminationFindings ? `Contamination findings: ${report.data.contaminationFindings}` : '',
          ].filter(Boolean).join('\n'),
          machineConditionObservation: report.data.machineConditionObservation ?? '',
          oilConditionObservation: report.data.oilConditionObservation ?? '',
          wearAssessments: { ...DEFAULT_WEAR_ASSESSMENTS, ...report.data.wearAssessments },
          wearLabels: { ...report.data.wearLabels },
          trendValues: { ...report.data.trendValues },
        });
      }
    }).catch((error: unknown) => {
      if (active) setMessage({ text: error instanceof Error ? error.message : 'Report data could not be loaded.', success: false });
    }).finally(() => { if (active) setLoadingReport(false); });
    return () => { active = false; };
  }, [reportId]);

  if (admin !== 'true') return <Redirect href="/" />;

  const update = <K extends keyof OilReportData,>(key: K, value: OilReportData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setPdfUri('');
  };

  const updateNumeric = (key: 'wpc' | 'dl' | 'ds' | 'plp' | 'allowableWpc' | 'reservoir' | 'runningHours', value: string) => {
    update(key, sanitizeNumeric(value));
  };

  const updateWearAssessment = (key: string, value: WearSeverity) => {
    setForm((current) => ({ ...current, wearAssessments: { ...current.wearAssessments, [key]: value } }));
    setMessage(null);
    setPdfUri('');
  };

  const pickRubbingWearImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      const asset = result.assets[0];
      const context = ExpoImageManipulator.manipulate(asset.uri);
      context.resize({ width: 1200 });
      const resized = await context.renderAsync();
      const compressed = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
      if (!compressed.base64) throw new Error('Image compression failed.');
      update('rubbingWearImage', `data:image/jpeg;base64,${compressed.base64}`);
    } catch (error) {
      console.error('Rubbing wear image selection failed:', error);
      setMessage({ text: 'The rubbing-wear image could not be added.', success: false });
    }
  };

  const textField = (
    label: string,
    key: TextFieldKey,
    placeholder = '',
    options: { multiline?: boolean; keyboardType?: 'default' | 'decimal-pad' } = {},
  ) => (
    <View style={[styles.field, options.multiline && styles.fullField]} key={key}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        value={String(form[key] ?? '')}
        onChangeText={(value) => update(key, value as OilReportData[typeof key])}
        placeholder={placeholder || label}
        placeholderTextColor="#97A6B4"
        keyboardType={options.keyboardType ?? 'default'}
        multiline={options.multiline}
        maxLength={options.multiline ? 5000 : 500}
        autoCapitalize={key === 'sampleId' ? 'characters' : 'sentences'}
        textAlignVertical={options.multiline ? 'top' : 'center'}
        style={[styles.input, options.multiline && styles.multilineInput]}
      />
    </View>
  );

  const conditionPicker = (label: string, key: 'lubricantCondition' | 'wearCondition') => (
    <View style={styles.conditionField} key={key}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <View style={styles.conditionOptions}>
        {CONDITIONS.map((condition) => {
          const selected = form[key] === condition;
          return (
            <Pressable
              key={condition}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => update(key, condition)}
              style={[styles.conditionOption, selected && styles.conditionSelected]}>
              <Text style={[styles.conditionText, selected && styles.conditionSelectedText]}>{condition}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const generateReport = async () => {
    setGenerating(true);
    setMessage(null);
    setPdfUri('');
    try {
      const images: BrandImages = REPORT_BRAND_IMAGES;

      const html = buildOilReportHtml(form, images);
      const result = await Print.printToFileAsync({ html, base64: true });
      if (!result.base64) throw new Error('The PDF data was not returned.');
      // Save locally before contacting the API so an API outage won't lose the PDF.
      if (Platform.OS !== 'web') {
        const safeSampleId = form.sampleId.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
        const shareablePdf = new File(
          Paths.document,
          `EnergySolutions-Oil-Report-${safeSampleId || 'report'}-${Date.now()}.pdf`,
        );
        shareablePdf.create();
        shareablePdf.write(result.base64, { encoding: 'base64' });
        if (!shareablePdf.exists) throw new Error('The report copy could not be read.');
        setPdfUri(shareablePdf.uri);
      }
      try {
        const saved = await reportsApi.save({ reportId: editingReportId, data: form, pdfBase64: result.base64 });
        setEditingReportId(saved.id);
        setMessage({ text: Platform.OS === 'web'
          ? 'PDF generated and saved to the shared server. You can assign it from Saved reports.'
          : 'PDF generated and saved to the database. You can assign it from Saved reports.', success: true });
      } catch (error) {
        console.error('Report PDF was generated, but server save failed:', error);
        setMessage({ text: Platform.OS === 'web'
          ? 'PDF generated. The server could not be reached, so it was not saved to Saved reports.'
          : 'PDF generated on this device. The server could not be reached, so it was not saved to Saved reports.', success: true });
      }
    } catch (error) {
      console.error('Report PDF generation failed:', error);
      setMessage({ text: error instanceof Error ? `The PDF could not be generated: ${error.message}` : 'The PDF could not be generated. Try again.', success: false });
    } finally {
      setGenerating(false);
    }
  };

  const sharePdf = async () => {
    if (!pdfUri) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: `Oil analysis report - ${form.sampleId}`,
        });
      } else {
        setMessage({ text: 'PDF sharing is not available on this device.', success: false });
      }
    } catch (error) {
      console.error('Report PDF sharing failed:', error);
      setMessage({ text: 'The PDF could not be shared. Try again.', success: false });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>ADMIN · {name?.trim() || 'REPORTS'}</Text>
          <Text style={styles.headerTitle}>Create oil report</Text>
        </View>
        <Image source={require('../../assets/energySolustion/img37.png')} style={styles.headerLogo} resizeMode="contain" />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>Enter the sample and laboratory results. The PDF will use the EnergySolutions branding and a two-page oil analysis layout.</Text>
          {loadingReport ? <View style={styles.loadRow}><ActivityIndicator color="#16834B" /><Text style={styles.loadText}>Loading saved report...</Text></View> : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Sample information</Text>
            <Text style={styles.sectionHint}>Details shown in the report heading.</Text>
            <View style={styles.twoColumn}>
              {textField('Report name', 'reportName', 'OIL ANALYSIS TEST REPORT')}
              {textField('Customer / organization', 'customer', 'Company name')}
              {textField('Area / site', 'site', 'Facility or site')}
              {textField('Sample ID', 'sampleId', 'e.g. 24596')}
              {textField('Equipment name', 'equipment', 'e.g. Turbine N-01')}
              {textField('Lubricant name', 'lubricant', 'e.g. ISO VG 320')}
              {textField('Component', 'component', 'e.g. gearbox')}
              {([['Reservoir quantity (L)', 'reservoir'], ['Running hours', 'runningHours']] as const).map(([label, key]) => (
                <View style={styles.field} key={key}>
                  <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
                  <TextInput
                    value={form[key]}
                    onChangeText={(value) => updateNumeric(key, value)}
                    placeholder="Enter a number"
                    placeholderTextColor="#97A6B4"
                    keyboardType="default"
                    style={styles.input}
                  />
                </View>
              ))}
              {textField('Sample date', 'sampleDate', 'DD-MM-YYYY')}
              {textField('Received date', 'receivedDate', 'DD-MM-YYYY')}
              {textField('Report date', 'reportDate', 'DD-MM-YYYY')}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Condition and recommendation</Text>
            <Text style={styles.sectionHint}>Select the lab judgement and provide the maintenance recommendation.</Text>
            <View style={styles.conditionStack}>
              {conditionPicker('Lubricant condition', 'lubricantCondition')}
              {conditionPicker('Wear metals condition', 'wearCondition')}
            </View>
            {textField('Oil Condition Recommendations', 'recommendation', 'Describe recommended action', { multiline: true })}
            {textField('Oil Condition Observation', 'oilConditionObservation', 'Describe oil condition observations', { multiline: true })}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Oil analysis test results</Text>
            <Text style={styles.sectionHint}>Enter available values. Test methods, units and reference limits are included in the PDF.</Text>
            {TEST_GROUPS.map((group) => (
              <View key={group.title} style={styles.testGroup}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                {group.rows.map((row) => (
                  <View key={row.key} style={styles.testRow}>
                    <View style={styles.testInfo}>
                      <Text style={styles.testName}>{row.name}</Text>
                      <Text style={styles.testMeta}>{row.method} · {row.unit}</Text>
                    </View>
                    <View style={styles.resultGroup}>
                      <View style={styles.inputCol}>
                        <Text style={styles.inputColLabel}>Limit</Text>
                        <TextInput
                          value={(form.limits && form.limits[row.key] !== undefined) ? form.limits[row.key] : row.limit}
                          onChangeText={(value) => update('limits', { ...(form.limits || {}), [row.key]: value })}
                          placeholder="Limit"
                          placeholderTextColor="#A2AFBA"
                          style={styles.resultInput}
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={styles.inputCol}>
                        <Text style={styles.inputColLabel}>Result</Text>
                        <TextInput
                          value={form.results[row.key] ?? ''}
                          onChangeText={(value) => update('results', {
                            ...form.results,
                            [row.key]: value,
                          })}
                          placeholder="-"
                          placeholderTextColor="#A2AFBA"
                          style={styles.resultInput}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ferrography analysis</Text>
            <Text style={styles.sectionHint}>Add particle readings, wear severity ratings, micrograph and analyst observations.</Text>
            <View style={styles.twoColumn}>
              {([
                ['Wear particle concentration (WPC)', 'wpc'], ['DL', 'dl'], ['DS', 'ds'],
                ['PLP', 'plp'], ['Allowable WPC limit', 'allowableWpc'],
              ] as const).map(([label, key]) => (
                <View style={styles.field} key={key}>
                  <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
                  <TextInput
                    value={form[key]}
                    onChangeText={(value) => updateNumeric(key, value)}
                    placeholder="Enter a number"
                    placeholderTextColor="#97A6B4"
                    keyboardType="default"
                    style={styles.input}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.subsectionTitle}>Trend graph values</Text>
            <Text style={styles.fieldHelp}>Enter particle counts for this sample; these are separate from wear-metal ppm results.</Text>
            <View style={styles.twoColumn}>
              {([
                ['Rubbing wear', 'ferrousRubbingWear'], ['Severe sliding wear', 'ferrousSevereSlidingWear'],
                ['Cutting wear', 'ferrousCuttingWear'], ['Chunks or gear wear', 'ferrousChunksGearWear'],
                ['Bearing wear', 'ferrousBearingWear'], ['Spheres', 'ferrousSpheres'],
                ['Rubbing wear', 'nonFerrousRubbingWear'], ['Sliding wear', 'nonFerrousSlidingWear'],
                ['Babbitt / white metal journal bearings', 'nonFerrousBabbittWhiteMetal'],
                ['White non-ferrous particles – aluminium', 'nonFerrousAluminium'],
                ['Non-metallic crystalline (sand / dirt)', 'nonFerrousCrystalline'], ['Fibers', 'nonFerrousFibers'],
              ] as const).map(([label, key]) => (
                <View style={styles.field} key={key}>
                  <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
                  <TextInput
                    value={form.trendValues[key] ?? ''}
                    onChangeText={(value) => update('trendValues', { ...form.trendValues, [key]: sanitizeNumeric(value) })}
                    placeholder="Enter a number"
                    placeholderTextColor="#97A6B4"
                    keyboardType="default"
                    style={styles.input}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.subsectionTitle}>Wear severity (0–10 subjective scale)</Text>
            <Text style={styles.fieldHelp}>0 = None; 1–4 = Few (green); 5–7 = Moderate (yellow); 8–10 = Heavy (red).</Text>
            <View style={styles.severityRow}>
              <TextInput
                value={form.ferrousWearParticles === '' ? '' : String(form.ferrousWearParticles)}
                onChangeText={(value) => update('ferrousWearParticles', value === '' ? '' : Math.max(0, Math.min(10, Number(value))))}
                placeholder="0–10"
                keyboardType="number-pad"
                style={[styles.input, styles.severityInput, { borderColor: getWearSeverityColor(form.ferrousWearParticles) }]}
              />
            </View>
            <Text style={styles.subsectionTitle}>Wear and contaminant assessment</Text>
            {WEAR_ASSESSMENT_GROUPS.map((group) => (
              <View key={group.title} style={styles.assessmentGroup}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                {group.rows.map((row) => (
                  <View key={row.key} style={styles.assessmentRow}>
                    <View style={styles.assessmentLabelCol}>
                      <TextInput
                        value={form.wearLabels?.[row.key] !== undefined ? form.wearLabels[row.key] : row.label}
                        onChangeText={(val) => setForm((cur) => ({ ...cur, wearLabels: { ...cur.wearLabels, [row.key]: val } }))}
                        style={styles.assessmentLabelInput}
                        placeholderTextColor="#97A6B4"
                        placeholder={row.label}
                      />
                    </View>
                    <View style={styles.assessmentChoices}>
                      <TextInput
                        value={form.wearAssessments[row.key] === '' ? '' : String(form.wearAssessments[row.key])}
                        onChangeText={(value) => updateWearAssessment(row.key, value === '' ? '' : Math.max(0, Math.min(10, Number(value))))}
                        placeholder="0–10"
                        keyboardType="number-pad"
                        style={[styles.assessmentScoreInput, { borderColor: getWearSeverityColor(form.wearAssessments[row.key]) }]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ))}
            <Text style={styles.subsectionTitle}>Rubbing wear micrograph</Text>
            {textField('Ferrography image name', 'rubbingWearImageName', 'Rubbing wear')}
            <TouchableOpacity style={styles.imagePickButton} onPress={() => void pickRubbingWearImage()} activeOpacity={0.85}>
              <Text style={styles.imagePickText}>{form.rubbingWearImage ? 'Replace rubbing-wear image' : 'Attach rubbing-wear image'}</Text>
            </TouchableOpacity>
            {form.rubbingWearImage ? (
              <Image source={{ uri: form.rubbingWearImage }} style={styles.rubbingPreview} resizeMode="contain" />
            ) : null}
            {textField('Machine Condition Recommendations', 'machineConditionRecommendation', 'Describe recommended machine condition actions', { multiline: true })}
            {textField('Machine Condition Observation', 'machineConditionObservation', 'Describe machine condition observations', { multiline: true })}
          </View>

          {message ? (
            <Text accessibilityRole="alert" style={[styles.formMessage, message.success && styles.successMessage]}>
              {message.text}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.generateButton, (generating || loadingReport) && styles.disabledButton]}
            onPress={generateReport}
            disabled={generating || loadingReport}
            activeOpacity={0.85}>
            {generating
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.generateText}>{editingReportId ? 'Update report and PDF' : 'Generate report PDF'}</Text>}
          </TouchableOpacity>

          {pdfUri && Platform.OS !== 'web' ? (
            <>
              <TouchableOpacity style={styles.shareButton} onPress={sharePdf} activeOpacity={0.85}>
                <Text style={styles.shareText}>Save or share PDF</Text>
              </TouchableOpacity>
              {editingReportId ? (
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={() => router.push({ pathname: '/assign-report', params: { admin: 'true', name: name ?? '', reportId: String(editingReportId) } })}
                  activeOpacity={0.85}>
                  <Text style={styles.assignText}>Assign to customer</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
          <Text style={styles.footer}>ENERGYSOLUTIONS · OIL &amp; FUEL TESTING SOLUTIONS</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: Brand.canvas },
  header: { minHeight: 88, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#E5ECF1' },
  backButton: { width: 42, height: 42, borderRadius: Shape.control, backgroundColor: Brand.canvas, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#355169', fontSize: 30, lineHeight: 35 },
  headerCopy: { flex: 1, marginLeft: 5 },
  headerEyebrow: { color: '#16834B', fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  headerTitle: { color: Brand.text, fontSize: 18, fontWeight: '800', marginTop: 3 },
  headerLogo: { width: 105, height: 42 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 38, maxWidth: 820, width: '100%', alignSelf: 'center' },
  intro: { color: '#667A8B', fontSize: 13, lineHeight: 20, marginBottom: 15 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  loadText: { color: '#526579', fontSize: 12 },
  sectionCard: { backgroundColor: Brand.surface, borderRadius: Shape.card, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#E4EBEF', shadowColor: '#15324B', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  sectionTitle: { color: Brand.text, fontSize: 17, fontWeight: '800' },
  sectionHint: { color: '#718194', fontSize: 12, lineHeight: 19, marginTop: 5, marginBottom: 17 },
  subsectionTitle: { color: '#355169', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 13, marginBottom: 9 },
  fieldHelp: { color: '#718194', fontSize: 11, lineHeight: 17, marginTop: -3, marginBottom: 10 },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityInput: { flex: 1 },
  assessmentGroup: { marginTop: 8, borderWidth: 1, borderColor: '#DCE5EC', borderRadius: 10, overflow: 'hidden' },
  assessmentRow: { minHeight: 52, paddingHorizontal: 9, paddingVertical: 5, borderTopWidth: 1, borderColor: '#E6ECF0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  assessmentLabelCol: { flex: 1 },
  assessmentLabelInput: { color: '#263B4B', fontSize: 10, flex: 1, borderBottomWidth: 1, borderColor: '#E0E8EE', paddingVertical: 3, paddingHorizontal: 2 },
  assessmentLabel: { color: '#263B4B', fontSize: 10, flex: 1 },
  assessmentChoices: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  assessmentScoreInput: { width: 62, minHeight: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, textAlign: 'center', color: '#172B3A', backgroundColor: '#FBFCFD' },
  imagePickButton: { minHeight: 42, borderRadius: 9, backgroundColor: '#EAF6EE', borderWidth: 1, borderColor: '#BBDCC7', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  imagePickText: { color: '#16834B', fontSize: 12, fontWeight: '800' },
  rubbingPreview: { width: 180, height: 135, borderRadius: 8, backgroundColor: '#F1F5F8', marginBottom: 10 },
  twoColumn: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  field: { width: '48.5%', marginBottom: 11 },
  fullField: { width: '100%' },
  fieldLabel: { color: '#526579', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: Brand.border, borderRadius: Shape.control, paddingHorizontal: 12, color: Brand.text, fontSize: 14, backgroundColor: '#FBFCFD' },
  multilineInput: { width: '100%', minHeight: 82, paddingTop: 11, textAlignVertical: 'top' },
  conditionStack: { gap: 13, marginBottom: 16 },
  conditionField: {},
  conditionOptions: { flexDirection: 'row', gap: 8 },
  conditionOption: { minHeight: 38, borderWidth: 1, borderColor: '#DCE5EC', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9, justifyContent: 'center' },
  conditionSelected: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  conditionText: { color: '#526579', fontSize: 11, fontWeight: '700' },
  conditionSelectedText: { color: '#FFFFFF' },
  testGroup: { marginTop: 6, marginBottom: 14 },
  groupTitle: { color: '#16834B', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, paddingVertical: 7, borderBottomWidth: 1, borderColor: '#E4EBEF' },
  testRow: { flexDirection: 'row', alignItems: 'center', minHeight: 53, borderBottomWidth: 1, borderColor: '#EEF2F5', paddingVertical: 7, gap: 9 },
  testInfo: { flex: 1, paddingRight: 10 },
  testName: { color: '#243B4D', fontSize: 13, fontWeight: '700' },
  testMeta: { color: '#718194', fontSize: 10, marginTop: 4 },
  resultGroup: { flexDirection: 'row', gap: 10 },
  inputCol: { alignItems: 'center' },
  inputColLabel: { color: '#718194', fontSize: 9, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },
  resultInput: { width: 78, minHeight: 42, borderWidth: 1, borderColor: '#D5E0E7', borderRadius: 10, paddingHorizontal: 9, color: '#172B3A', fontSize: 13, textAlign: 'center', backgroundColor: '#FBFCFD' },
  formMessage: { color: '#B42318', fontSize: 12, lineHeight: 18, marginVertical: 7 },
  successMessage: { color: '#137A43' },
  generateButton: { minHeight: 56, borderRadius: Shape.control, backgroundColor: Brand.primary, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  disabledButton: { opacity: 0.65 },
  generateText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  shareButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#B8C7D1', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  shareText: { color: '#355169', fontSize: 14, fontWeight: '700' },
  assignButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#16834B', alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  assignText: { color: '#16834B', fontSize: 14, fontWeight: '800' },
  footer: { color: '#8A98A5', textAlign: 'center', fontSize: 8, letterSpacing: 1, paddingVertical: 20 },
});
