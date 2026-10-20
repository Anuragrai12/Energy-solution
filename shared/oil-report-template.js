(function (root) {
const TEST_GROUPS = [
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
  { title: 'MACHINE CONDITION', rows: [
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

// Keep these report values in sync with src/lib/oil-report.ts. They are used
// by both the form-data collector and the PDF template.
const WEAR_SEVERITIES = ['None', 'Few', 'Moderate', 'Heavy'];
const WEAR_ASSESSMENT_GROUPS = [
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
];


const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
  .replace(/\n/g, '<br>');

const normalizedSeverity = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const score = Math.max(0, Math.min(10, Math.round(value)));
    if (score <= 2) return 'None';
    if (score <= 5) return 'Few';
    if (score <= 8) return 'Moderate';
    return 'Heavy';
  }
  return ['None', 'Few', 'Moderate', 'Heavy'].includes(value) ? value : null;
};
const severityScoreLabel = (value) => typeof value === 'number' && Number.isFinite(value)
  ? `${Math.max(0, Math.min(10, Math.round(value)))}/10`
  : '';

const conditionColor = (condition) => condition === 'Normal' ? '#76bd43' : condition === 'Monitor' ? '#e5a72f' : condition === 'Critical' ? '#dc514c' : '#8795a3';

const REPORT_CHART_GROUPS = [
  { title: 'VIS 40C, 100, INDEX, TAN', keys: ['vis40', 'vis100', 'visIndex', 'acid'] },
  { title: 'MOISTURE, NAS', keys: ['moisture', 'nas'] },
  { title: 'MACHINE CONDITION', keys: ['iron', 'chromium', 'tin', 'aluminum', 'nickel', 'copper', 'silver', 'titanium', 'cadmium', 'manganese', 'lead', 'molybdenum', 'vanadium', 'silicon', 'sodium'] },
  { title: 'ADDITIVES', keys: ['calcium', 'magnesium', 'boron', 'zinc', 'phosphorus', 'potassium', 'barium'] },
];


function buildOilReportHtml(data, images) {
  const rows = TEST_GROUPS.map((group) => `
    <tr class="group"><td colspan="5">${escapeHtml(group.title)}</td></tr>
    ${group.rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.method)}</td><td>${escapeHtml(row.unit)}</td>
        <td class="result">${escapeHtml(data.results?.[row.key]?.trim() || '-')}</td><td>${escapeHtml(data.limits && data.limits[row.key] !== undefined ? data.limits[row.key] : row.limit)}</td>
      </tr>`).join('')}
  `).join('');

  const meta = (label, value) => `<div class="meta"><b>${label}</b><span>${escapeHtml(String(value ?? '').trim() || '-')}</span></div>`;
  const metric = (label, value) => `<div class="metric"><div>${label}</div><strong>${escapeHtml(String(value ?? '').trim() || '-')}</strong></div>`;
  const image = (value) => value;
  const recommendation = escapeHtml((data.recommendation || '').trim() || '-');
  const discussion = [
    data.ferrographyDiscussion?.trim() || '',
    data.wearFindings?.trim() ? `Wear particle findings: ${data.wearFindings.trim()}` : '',
    data.contaminationFindings?.trim() ? `Contamination findings: ${data.contaminationFindings.trim()}` : '',
  ].filter(Boolean).map(escapeHtml).join('<br>') || '-';
  const chartColors = ['#4a80b6', '#8bc34a', '#f0a532', '#9c62a8', '#3aa6a0', '#e86d5d'];
  const valueFor = (key) => {
    const rawValue = data.results?.[key]?.trim();
    if (!rawValue) return null;
    const value = Number(rawValue);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const verticalChart = (title, values, height = 104, bars = false) => {
    const present = values.filter(item => item.value !== null);
    if (!present.length) return `<div class="mini-chart"><div class="chart-title">${escapeHtml(title)}</div><div class="chart-empty">No numeric results</div></div>`;
    const max = Math.max(...present.map(({ value }) => value), 1);
    const left = 23; const right = 8; const top = 14; const bottom = 22; const plotHeight = height - top - bottom; const plotWidth = 260;
    const ticks = 4;
    const grid = Array.from({ length: ticks + 1 }, (_, i) => {
      const y = top + (plotHeight * i / ticks); const label = max * (ticks - i) / ticks;
      return `<line x1="${left}" y1="${y}" x2="${plotWidth - right}" y2="${y}" stroke="#d9d9d9" stroke-width=".6"/><text x="${left - 3}" y="${y + 2}" text-anchor="end" font-size="5" fill="#444">${label >= 100 ? Math.round(label) : label.toFixed(1).replace(/\\.0$/, '')}</text>`;
    }).join('');
    const count = Math.max(values.length, 1); const center = left + (plotWidth - left - right) / 2;
    const step = (plotWidth - left - right) / count;
    const marks = values.map((item, i) => {
      if (item.value === null) return '';
      const x = bars ? left + step * (i + .5) : center + (i - (count - 1) / 2) * 2;
      const y = top + plotHeight * (1 - item.value / max);
      const text = item.value >= 100 ? String(Math.round(item.value)) : String(Number(item.value.toFixed(2)));
      const color = item.color || chartColors[i % chartColors.length];
      const mark = bars
        ? `<rect x="${x - step * .34}" y="${y}" width="${step * .68}" height="${top + plotHeight - y}" fill="${color}"/>`
        : `<line x1="${x}" y1="${top + plotHeight}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="2.2" fill="${color}"/>`;
      return `${mark}<text x="${x}" y="${Math.max(11, y - 3)}" text-anchor="middle" font-size="5" fill="#222">${text}</text>`;
    }).join('');
    const dateParts = (data.sampleDate || '').trim().split('-');
    const dateLabel = dateParts.length === 3 ? `${dateParts[0]}-${dateParts[1]}-${dateParts[2].slice(-2)}` : (data.sampleDate || '').trim();
    const legend = values.map((item, i) => `<span><i style="background:${item.color || chartColors[i % chartColors.length]}"></i>${escapeHtml(item.label)}</span>`).join('');
    return `<div class="mini-chart"><div class="chart-title">${escapeHtml(title)}</div><svg viewBox="0 0 ${plotWidth} ${height}" preserveAspectRatio="none">${grid}${marks}<text x="${center}" y="${height - 8}" text-anchor="middle" font-size="5" fill="#333">${escapeHtml(dateLabel || 'Sample')}</text></svg><div class="chart-legend">${legend}</div></div>`;
  };
  const charts = REPORT_CHART_GROUPS.map((group) => {
    return verticalChart(group.title, group.keys.map((key) => ({
      label: TEST_GROUPS.flatMap((testGroup) => testGroup.rows).find((item) => item.key === key)?.name.replace(/, [A-Z]+$/, '') || key,
      value: valueFor(key),
    })), group.keys.length > 8 ? 118 : 106);
  }).join('');

  const severityColors = { None: '#ffffff', Few: '#93d050', Moderate: '#fff200', Heavy: '#ff1515' };
  const severityColor = (value) => severityColors[normalizedSeverity(value)] || '#8795a3';
  const severityRows = WEAR_ASSESSMENT_GROUPS.map((group, groupIndex) =>
    `${groupIndex > 0 ? `<tr class="severity-group"><th colspan="5">${escapeHtml(group.title)}</th></tr>` : ''}${group.rows.map((row) => {
      const rawSeverity = data.wearAssessments?.[row.key];
      const selected = normalizedSeverity(rawSeverity);
      const rowLabel = (data.wearLabels && data.wearLabels[row.key] !== undefined) ? data.wearLabels[row.key] : row.label;
      const scoreLabel = severityScoreLabel(rawSeverity);
      return `<tr><td>${escapeHtml(rowLabel)}</td>${WEAR_SEVERITIES.map((severity) => `<td class="severity-cell">${selected === severity ? `<b class="severity-dot" style="background:${severityColor(severity)};border-color:${severity === 'None' ? '#8795a3' : severityColor(severity)}">${scoreLabel ? scoreLabel.slice(0, -3) : ''}</b>` : ''}</td>`).join('')}</tr>`;
    }).join('')}`
  ).join('');  const rawSeverityValue = data.ferrousWearParticles;
  const severityValue = normalizedSeverity(rawSeverityValue);
  const overallScoreLabel = severityScoreLabel(rawSeverityValue);


  const safeRubbingImage = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data.rubbingWearImage || '')
    ? data.rubbingWearImage
    : '';
  const imageCaption = escapeHtml((data.rubbingWearImageName || '').trim() || 'Rubbing wear');
  const imageHtml = safeRubbingImage
    ? `<img class="rubbing-image" src="${image(safeRubbingImage)}"/>`
    : `<div class="image-placeholder">Rubbing wear micrograph not attached</div>`;
  const secondCharts = [
    verticalChart('PLP', [{ label: 'PLP', value: valueFor('plp') ?? (data.plp ? Number(data.plp) : null), color: '#4a80b6' }], 96),
    verticalChart('WPC', [{ label: 'WPC', value: valueFor('wpc') ?? (data.wpc ? Number(data.wpc) : null), color: '#4a80b6' }], 96),
    verticalChart('FERROUS TREND GRAPH', [
      { label: 'Fe', value: Number.isFinite(Number(data.trendValues?.ferrousFe)) && data.trendValues?.ferrousFe?.trim() ? Number(data.trendValues.ferrousFe) : null, color: '#4a80b6' },
      { label: 'SiO2', value: Number.isFinite(Number(data.trendValues?.ferrousSiO2)) && data.trendValues?.ferrousSiO2?.trim() ? Number(data.trendValues.ferrousSiO2) : null, color: '#75504b' },
    ], 106, true),
    verticalChart('NON-FERROUS TREND GRAPH', [
      { label: 'Cu', value: Number.isFinite(Number(data.trendValues?.nonFerrousCu)) && data.trendValues?.nonFerrousCu?.trim() ? Number(data.trendValues.nonFerrousCu) : null, color: '#4a80b6' },
      { label: 'Cr', value: Number.isFinite(Number(data.trendValues?.nonFerrousCr)) && data.trendValues?.nonFerrousCr?.trim() ? Number(data.trendValues.nonFerrousCr) : null, color: '#93d050' },
      { label: 'Al', value: Number.isFinite(Number(data.trendValues?.nonFerrousAl)) && data.trendValues?.nonFerrousAl?.trim() ? Number(data.trendValues.nonFerrousAl) : null, color: '#f0a532' },
      { label: 'Pb', value: Number.isFinite(Number(data.trendValues?.nonFerrousPb)) && data.trendValues?.nonFerrousPb?.trim() ? Number(data.trendValues.nonFerrousPb) : null, color: '#9c62a8' },
    ], 106, true),
  ].join('');

  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { size: A4 portrait; margin: 9mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #172b3a; font-size: 8px; margin: 0; }
    .page { width: 100%; }
    .top { border: 1px solid #cbd5dd; display: flex; align-items: center; justify-content: space-between; min-height: 54px; padding: 7px 10px; }
    .logo { max-width: 160px; max-height: 47px; object-fit: contain; }
    .report-label { text-align: right; color: #587083; font-size: 8px; line-height: 1.5; }
    .company { background: #f2f7f4; text-align: center; font-size: 11px; font-weight: 700; padding: 8px; border: 1px solid #cbd5dd; border-top: 0; letter-spacing: .2px; }
    .condition-row { display: flex; border: 1px solid #cbd5dd; border-top: 0; margin-bottom: 8px; }
    .condition { flex: 1; display: flex; justify-content: space-between; align-items: center; padding: 6px 9px; border-right: 1px solid #cbd5dd; font-weight: 700; }
    .condition:last-child { border-right: 0; }
    .badge { min-width: 65px; text-align: center; color: white; padding: 4px 6px; border-radius: 3px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #cbd5dd; margin-bottom: 8px; }
    .meta { min-height: 25px; padding: 5px 7px; border-right: 1px solid #e0e6eb; border-bottom: 1px solid #e0e6eb; display: flex; gap: 4px; align-items: baseline; }
    .meta:nth-child(3n) { border-right: 0; }
    .meta b { white-space: nowrap; font-size: 7px; }
    .meta span { word-break: break-word; }
    .section-title { font-size: 10px; font-weight: 700; text-align: center; padding: 6px; background: #edf4f0; border: 1px solid #cbd5dd; border-bottom: 0; }
    .recommendation { border: 1px solid #cbd5dd; padding: 8px; margin-bottom: 8px; line-height: 1.45; }
    .recommendation b { display: block; margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7px; }
    th, td { border: 1px solid #d2dbe1; padding: 3px 4px; text-align: left; vertical-align: middle; overflow-wrap: anywhere; }
    th { background: #e9f0f4; font-weight: 700; text-align: center; }
    td:nth-child(1) { width: 37%; } td:nth-child(2) { width: 22%; } td:nth-child(3) { width: 13%; }
    td:nth-child(4) { width: 14%; } td:nth-child(5) { width: 14%; }
    .result { font-weight: 700; color: #102a43; }
    .group td { text-align: center; background: #edf4f0; font-weight: 700; font-size: 7px; letter-spacing: .3px; padding: 4px; }
    .signature-row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 10px; min-height: 57px; }
    .signature-group { display: grid; grid-template-columns: auto auto; column-gap: 8px; align-items: end; }
    .signature-group .caption { grid-column: 1 / -1; }
    .sig { height: 37px; max-width: 120px; object-fit: contain; display: block; }
    .stamp { height: 37px; max-width: 112px; object-fit: contain; display: block; }
    .seal { height: 42px; width: 42px; object-fit: contain; display: block; }
    .caption { border-top: 1px solid #9aaab6; padding-top: 3px; margin-top: 2px; font-size: 7px; color: #506578; }
    .page-break { page-break-before: always; break-before: page; }
    .ferro-title { font-size: 12px; font-weight: 700; text-align: center; margin: 11px 0 9px; color: #102a43; }
    .metrics { display: flex; border: 1px solid #cbd5dd; margin-bottom: 10px; }
    .metric { flex: 1; text-align: center; border-right: 1px solid #cbd5dd; padding: 8px 4px; color: #607486; font-size: 7px; }
    .metric:last-child { border: 0; }
    .metric strong { display: block; color: #172b3a; font-size: 13px; margin-top: 5px; }
    .page-one-layout, .page-two-layout { display: grid; grid-template-columns: minmax(0, 3.2fr) minmax(0, 1fr); gap: 6px; align-items: start; }
    .table-title { font-size: 10px; font-weight: 700; text-align: center; padding: 6px; border: 1px solid #cbd5dd; border-bottom: 0; }
    .analysis-table { font-size: 6.4px; }
    .analysis-table th, .analysis-table td { padding: 3px 3px; }
    .page-one-charts, .page-two-charts { border: 1px solid #b7b7b7; }
    .mini-chart { border-bottom: 1px solid #777; padding: 3px 3px 2px; break-inside: avoid; }
    .mini-chart:last-child { border-bottom: 0; }
    .chart-title { color: #111; font-size: 7px; font-weight: 700; text-align: center; padding-bottom: 2px; }
    .mini-chart svg { display: block; width: 100%; height: 82px; }
    .chart-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 5px; font-size: 4.5px; line-height: 1.1; }
    .chart-legend span { white-space: nowrap; }
    .chart-legend i { display: inline-block; width: 4px; height: 4px; border-radius: 50%; margin-right: 2px; }
    .chart-empty { color: #8795a3; font-size: 6px; padding: 10px 2px; text-align: center; }
    .ferro-title { border: 1px solid #cbd5dd; margin: 0; padding: 6px; }
    .metrics { margin-bottom: 5px; }
    .metric { padding: 5px 2px; font-size: 6px; }
    .metric strong { font-size: 10px; margin-top: 3px; }
    .discussion { border: 1px solid #cbd5dd; padding: 6px; margin-bottom: 5px; line-height: 1.35; }
    .discussion b { display: block; margin-bottom: 3px; }
    .severity-table { font-size: 6.2px; }
    .severity-table th, .severity-table td { padding: 3px 2px; }
    .severity-table th:first-child, .severity-table td:first-child { width: 48%; }
    .severity-table th:nth-child(n+2), .severity-table td:nth-child(n+2) { width: 13%; }
    .severity-group th { text-align: left; background: #f3f3f3; font-size: 6.5px; }
    .severity-cell { width: 13%; text-align: center !important; }
    .severity-dot { display: inline-block; width: 11px; height: 11px; border: 1px solid transparent; border-radius: 50%; vertical-align: middle; font-size: 5px; line-height: 10px; text-align: center; color: #111; }
    .severity-legend { margin-bottom: 0; }
    .severity-head { text-align: center !important; }
    .severity-legend .overall-label { text-align: left; background: #f3f3f3; }
    .overall-severity .active-severity { color: #111; box-shadow: inset 0 0 0 2px #263238; }
    .wear-photo { margin-top: 7px; width: 125px; }
    .rubbing-image, .image-placeholder { width: 125px; height: 90px; object-fit: contain; background: #f2f2f2; border: 1px solid #d8d8d8; display: block; }
    .image-placeholder { color: #77838b; font-size: 6px; text-align: center; padding: 30px 5px; }
    .photo-caption { font-size: 6px; margin-top: 3px; }
    .page-two-charts .mini-chart svg { height: 72px; }
    .judgement { margin-top: 8px; padding: 7px; text-align: center; border-radius: 3px; font-weight: 700; color: #fff; background: ${conditionColor(data.wearCondition)}; font-size: 8px; }
    .fineprint { color: #718194; text-align: center; margin-top: 8px; font-size: 6.5px; }
  </style></head><body>
    <section class="page">
      <div class="top"><img class="logo" src="${image(images.logo)}"/><div class="report-label"><b>${escapeHtml((data.reportName || '').trim() || 'OIL ANALYSIS TEST REPORT')}</b><br>Oil &amp; Fuel Testing Solutions</div></div>
      <div class="company">${escapeHtml(data.customer.trim() || 'Customer / Organization')}</div>
      <div class="condition-row">
        <div class="condition">Lubricant Condition <span class="badge" style="background:${conditionColor(data.lubricantCondition)}">${data.lubricantCondition || 'Not set'}</span></div>
        <div class="condition">Machine Condition <span class="badge" style="background:${conditionColor(data.wearCondition)}">${data.wearCondition || 'Not set'}</span></div>
      </div>
      <div class="meta-grid">
        ${meta('Sample ID', data.sampleId)}${meta('Lubricant', data.lubricant)}${meta('Sample Date', data.sampleDate)}
        ${meta('Equipment', data.equipment)}${meta('Reservoir / Hours', `${data.reservoir || '-'} / ${data.runningHours || '-'}`)}${meta('Received Date', data.receivedDate)}
        ${meta('Component', data.component)}${meta('Report Date', data.reportDate)}${meta('Area / Site', data.site)}
      </div>
      <div class="recommendation"><b>Recommendations</b>${recommendation}</div>
      <div class="page-one-layout">
        <div><div class="table-title">Oil Analysis Test Results</div>
          <table class="analysis-table"><thead><tr><th>Test Parameter</th><th>Test Method</th><th>Unit</th><th>Test Report</th><th>Limits</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        <aside class="page-one-charts">${charts}</aside>
      </div>
      <div class="signature-row">
        <div class="signature-group">
          <img class="sig" src="${image(images.signature)}"/>
          <img class="seal" src="${image(images.seal)}"/>
          <div class="caption">Authorized Signature</div>
        </div>
        <img class="stamp" src="${image(images.stamp)}"/>
      </div>
      <div class="fineprint">EnergySolutions - Oil &amp; Fuel Testing Solutions | Report ID: ${escapeHtml(data.sampleId.trim() || 'Pending')}</div>
    </section>
    <section class="page page-break">
      <div class="top"><img class="logo" src="${image(images.logo)}"/><div class="report-label"><b>CONSIDERED JUDGEMENT</b><br>Wear Situation</div><span class="badge" style="background:${conditionColor(data.wearCondition)}">${data.wearCondition || 'Not set'}</span></div>
      <div class="company">${escapeHtml(data.customer.trim() || 'Customer / Organization')}</div>
      <div class="meta-grid">
        ${meta('Sample ID', data.sampleId)}${meta('Lubricant', data.lubricant)}${meta('Sample Date', data.sampleDate)}
        ${meta('Equipment', data.equipment)}${meta('Reservoir / Hours', `${data.reservoir || '-'} / ${data.runningHours || '-'}`)}${meta('Received Date', data.receivedDate)}
        ${meta('Component', data.component)}${meta('Report Date', data.reportDate)}${meta('Area / Site', data.site)}
      </div>
      <div class="ferro-title">DIRECT READING FERROGRAPHY ANALYSIS TEST REPORT</div>
      <div class="metrics">${metric('Wear Particle Concentration (WPC)', data.wpc)}${metric('DL', data.dl)}${metric('DS', data.ds)}${metric('PLP', data.plp)}${metric('Allowable WPC Limit', data.allowableWpc)}</div>
      <div class="discussion"><b>Discussion of Results:</b>${discussion}</div>
      <div class="page-two-layout">
        <div>
          <table class="analysis-table severity-table severity-legend"><colgroup><col style="width:48%"/><col span="4" style="width:13%"/></colgroup><tbody><tr><th class="overall-label">FERROUS WEAR PARTICLES:${overallScoreLabel ? ` (${overallScoreLabel})` : ''}</th>${WEAR_SEVERITIES.map((severity) => `<th class="severity-head ${severityValue === severity ? 'active-severity' : ''}" style="background:${severityColor(severity)};color:${severity === 'None' ? '#333' : '#111'}">${severity}</th>`).join('')}</tr></tbody></table>
          <table class="analysis-table severity-table"><colgroup><col style="width:48%"/><col span="4" style="width:13%"/></colgroup><tbody>${severityRows}</tbody></table>
          <div class="wear-photo">${imageHtml}<div class="photo-caption">${imageCaption}</div></div>
        </div>
        <aside class="page-two-charts">${secondCharts}</aside>
      </div>
      <div class="signature-row">
        <div class="signature-group"><img class="sig" src="${image(images.signature)}"/><img class="seal" src="${image(images.seal)}"/><div class="caption">Authorized Signature</div></div>
        <img class="stamp" src="${image(images.stamp)}"/>
      </div>
      <div class="fineprint">EnergySolutions - Oil &amp; Fuel Testing Solutions | Report ID: ${escapeHtml(data.sampleId.trim() || 'Pending')}</div>
    </section>
  </body></html>`;
}
root.EnergyOilReportTemplate = { buildOilReportHtml, TEST_GROUPS, WEAR_SEVERITIES, WEAR_ASSESSMENT_GROUPS };
if (typeof module !== 'undefined' && module.exports) module.exports = root.EnergyOilReportTemplate;
})(globalThis);

