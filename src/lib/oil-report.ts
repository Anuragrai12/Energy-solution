import sharedTemplate from '../../shared/oil-report-template';

export type Condition = 'Normal' | 'Monitor' | 'Critical';
export type WearSeverity = number | 'None' | 'Few' | 'Moderate' | 'Heavy' | '';

export const WEAR_SEVERITIES: number[] = Array.from({ length: 11 }, (_, index) => index);

export const WEAR_ASSESSMENT_GROUPS = [
  { title: 'FERROUS WEAR PARTICLES', rows: [
    { key: 'rubbing', label: 'Rubbing Wear (Particles <15 µm)' },
    { key: 'severeSliding', label: 'Severe Sliding Wear' },
    { key: 'cutting', label: 'Cutting Wear' },
    { key: 'chunksGear', label: 'Chunks - Gear Wear' },
    { key: 'reworked', label: 'Reworked (Laminar) Particles-Bearing Wear' },
    { key: 'spheres', label: 'Spheres' },
    { key: 'darkOxides', label: 'Dark Metallo-Oxides (Black Oxides)' },
    { key: 'redOxides', label: 'Red Oxides (Rust / Ferrous Oxides)' },
    { key: 'corrosive', label: 'Corrosive Wear Debris' },
    { key: 'otherFerrous', label: 'Others' },
  ] },
  { title: 'NON-FERROUS WEAR PARTICLES', rows: [
    { key: 'nonFerrousRubbing', label: 'Rubbing Wear' },
    { key: 'nonFerrousSliding', label: 'Sliding Wear' },
    { key: 'gearWear', label: 'Gear Wear' },
    { key: 'otherNonFerrous', label: 'Other (Specify)' },
  ] },
  { title: 'CONTAMINANTS', rows: [
    { key: 'frictionPolymers', label: 'Friction Polymers - Lube Degradation' },
    { key: 'crystalline', label: 'Non-Metallic Crystalline (Sand / Dirt)' },
    { key: 'fibers', label: 'Fibers' },
    { key: 'otherContaminant', label: 'Other (Specify)' },
  ] },
] as const;

export const DEFAULT_WEAR_ASSESSMENTS: Record<string, WearSeverity> = Object.fromEntries(
  WEAR_ASSESSMENT_GROUPS.flatMap((group) => group.rows.map(({ key }) => [key, ''])),
);

export type OilReportData = {
  customer: string;
  reportName: string;
  site: string;
  sampleId: string;
  equipment: string;
  lubricant: string;
  component: string;
  reservoir: string;
  runningHours: string;
  sampleDate: string;
  receivedDate: string;
  reportDate: string;
  lubricantCondition: Condition | '';
  wearCondition: Condition | '';
  recommendation: string;
  results: Record<string, string>;
  limits: Record<string, string>;
  wpc: string;
  dl: string;
  ds: string;
  plp: string;
  allowableWpc: string;
  wearFindings: string;
  contaminationFindings: string;
  ferrographyDiscussion: string;
  ferrousWearParticles: WearSeverity;
  wearAssessments: Record<string, WearSeverity>;
  wearLabels: Record<string, string>;
  trendValues: Record<string, string>;
  rubbingWearImage: string;
  rubbingWearImageName: string;
};

export type BrandImages = {
  logo: string;
  seal: string;
  signature: string;
  stamp: string;
};

export const TEST_GROUPS: { title: string; rows: { key: string; name: string; method: string; unit: string; limit: string }[] }[] = [
  { title: 'TEST REPORT', rows: [
    { key: 'vis40', name: 'Viscosity @ 40 °C', method: 'ASTM D445', unit: 'cSt', limit: '288 - 352' },
    { key: 'vis100', name: 'Viscosity @ 100 °C', method: 'ASTM D445', unit: 'cSt', limit: '-' },
    { key: 'visIndex', name: 'Viscosity Index', method: 'ASTM D2270', unit: '-', limit: '>95' },
    { key: 'acid', name: 'Acid Number', method: 'ASTM D664', unit: 'mg KOH/g', limit: '<1.5' },
  ] },
  { title: 'CONTAMINATION', rows: [
    { key: 'iso', name: 'Particle Count / 1 ml', method: 'ISO 4406', unit: 'ISO code', limit: '-' },
    { key: 'particle4', name: 'Particles >4 µm(c)', method: 'ISO 4406', unit: 'count/ml', limit: '-' },
    { key: 'particle6', name: 'Particles >6 µm(c)', method: 'ISO 4406', unit: 'count/ml', limit: '-' },
    { key: 'particle14', name: 'Particles >14 µm(c)', method: 'ISO 4406', unit: 'count/ml', limit: '-' },
    { key: 'nas', name: 'Particle Count / NAS', method: 'NAS 1638', unit: 'class', limit: '<10' },
    { key: 'moisture', name: 'Moisture Content', method: 'ASTM E203', unit: 'ppm', limit: '<500' },
  ] },
  { title: 'ELEMENTAL CONTAMINATION / MACHINE CONDITION', rows: [
    { key: 'iron', name: 'Iron, Fe', method: 'ASTM D6595', unit: 'ppm', limit: '<150' },
    { key: 'chromium', name: 'Chromium, Cr', method: 'ASTM D6595', unit: 'ppm', limit: '<10' },
    { key: 'tin', name: 'Tin, Sn', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'aluminum', name: 'Aluminium, Al', method: 'ASTM D6595', unit: 'ppm', limit: '<20' },
    { key: 'nickel', name: 'Nickel, Ni', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'copper', name: 'Copper, Cu', method: 'ASTM D6595', unit: 'ppm', limit: '<50' },
    { key: 'silver', name: 'Silver, Ag', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'titanium', name: 'Titanium, Ti', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'cadmium', name: 'Cadmium, Cd', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'manganese', name: 'Manganese, Mn', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'lead', name: 'Lead, Pb', method: 'ASTM D6595', unit: 'ppm', limit: '<50' },
    { key: 'molybdenum', name: 'Molybdenum, Mo', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'vanadium', name: 'Vanadium, V', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'silicon', name: 'Silicon, Si', method: 'ASTM D6595', unit: 'ppm', limit: '<30' },
    { key: 'sodium', name: 'Sodium, Na', method: 'ASTM D6595', unit: 'ppm', limit: '<50' },
  ] },
  { title: 'ADDITIVES', rows: [
    { key: 'calcium', name: 'Calcium, Ca', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'magnesium', name: 'Magnesium, Mg', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'boron', name: 'Boron, B', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'zinc', name: 'Zinc, Zn', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'phosphorus', name: 'Phosphorus, P', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'potassium', name: 'Potassium, K', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
    { key: 'barium', name: 'Barium, Ba', method: 'ASTM D6595', unit: 'ppm', limit: '-' },
  ] },
];

export function buildOilReportHtml(data: OilReportData, images: BrandImages) {
  return sharedTemplate.buildOilReportHtml(data, images);
}


