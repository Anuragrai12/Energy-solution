import { getCredentials } from './session';
import { getApiBaseUrl } from './api-config';

export const API_ROOT = 'https://brocode.fun/api';

export type ReportListItem = {
  id: number;
  sample_id: string;
  customer: string;
  equipment: string;
  report_date: string;
  updated_at: string;
  assigned_user_id: number | null;
  assigned_user_name: string | null;
  assigned_user_email: string | null;
};

export type ReportUser = { id: number; name: string; email: string; role: 'admin' | 'user'; report_count: number };
export type AdminStats = { total_reports: number; assigned_reports: number; unassigned_reports: number; total_users: number; total_admins: number };
export type SavedReport = ReportListItem & { data: import('./oil-report').OilReportData };

async function request<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const credentials = getCredentials();
  const response = await fetch(`${await getApiBaseUrl()}/oil_reports.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body, ...credentials }),
  });
  const result = await response.json();
  if (!response.ok || !result?.status) throw new Error(result?.message || 'Report request failed.');
  return result.data as T;
}

export const reportsApi = {
  stats: () => request<AdminStats>('stats'),
  listAdmin: () => request<ReportListItem[]>('list_all'),
  listAssigned: () => request<ReportListItem[]>('list_assigned'),
  listUsers: async (allRoles = false): Promise<ReportUser[]> => (await request<ReportUser[]>('list_users', allRoles ? { all_roles: true } : {})).map((user) => {
    const role: ReportUser['role'] = String(user.role).trim().toLowerCase() === 'admin' ? 'admin' : 'user';
    return { ...user, role, report_count: Number(user.report_count) || 0 };
  }),
  createUser: (input: { name: string; email: string; password: string; role: 'admin' | 'user' }) =>
    request<{ id: number }>('create_user', { name: input.name, new_user_email: input.email, new_user_password: input.password, role: input.role }),
  deleteUser: (userId: number) => request<{ id: number }>('delete_user', { user_id: userId }),
  deleteReport: (reportId: number) => request<{ id: number }>('delete_report', { report_id: reportId }),
  unassign: (reportId: number) => request<{ id: number }>('unassign', { report_id: reportId }),
  changePassword: (newPassword: string) => request<null>('change_password', { new_password: newPassword }),
  get: (id: number) => request<SavedReport>('get', { report_id: id }),
  save: (args: { reportId?: number; data: import('./oil-report').OilReportData; pdfBase64: string }) =>
    request<{ id: number }>('save', {
      report_id: args.reportId,
      data: args.data,
      pdf_base64: args.pdfBase64,
    }),
  assign: (reportId: number, assignedUserId: number) =>
    request<{ id: number }>('assign', { report_id: reportId, assigned_user_id: assignedUserId }),
  assignMany: async (reportIds: number[], assignedUserId: number) => {
    try {
      return await request<{ report_ids: number[]; assigned_user_id: number }>('assign_many', { report_ids: reportIds, assigned_user_id: assignedUserId });
    } catch (error) {
      if (!(error instanceof Error) || !/unknown report action/i.test(error.message)) throw error;
      // Older hosted APIs may not have the bulk action yet; use the existing compatible action.
      for (const reportId of reportIds) await request<{ id: number }>('assign', { report_id: reportId, assigned_user_id: assignedUserId });
      return { report_ids: reportIds, assigned_user_id: assignedUserId };
    }
  },
  download: (id: number) => request<{ pdf_base64: string }>('download', { report_id: id }),
};
