declare const template: {
  buildOilReportHtml(data: Record<string, any>, images: Record<string, any>): string;
  TEST_GROUPS: Array<{ title: string; rows: Array<{ key: string; name: string; method: string; unit: string; limit: string }> }>;
  WEAR_SEVERITIES: number[];
  WEAR_ASSESSMENT_GROUPS: Array<{ title: string; rows: Array<{ key: string; label: string }> }>;
};
export default template;

