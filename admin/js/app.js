/**
 * Energy Solution - Admin Panel Application
 * Pure HTML/CSS/JavaScript
 */

// Application State
const STATE = {
  apiBaseUrl: localStorage.getItem('es_admin_api_url') || 'https://brocode.fun/api',
  admin: null, // { id, name, email, role }
  adminPassword: '', // kept in session for authenticated API calls
  reports: [],
  selectedReportIds: [],
  users: [],
  activeTab: 'dashboard',
  filters: {
    reportSearch: '',
    reportStatus: 'all',
    userSearch: '',
    userRole: 'all',
  },
  cachedPdfs: {},
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  initApiUrl();
  checkExistingSession();
  setupEventListeners();
});

function initApiUrl() {
  const urlInput = document.getElementById('apiUrlInput');
  const settingsInput = document.getElementById('settingsApiUrl');
  if (urlInput) urlInput.value = STATE.apiBaseUrl;
  if (settingsInput) settingsInput.value = STATE.apiBaseUrl;
}

function checkExistingSession() {
  const storedUser = sessionStorage.getItem('es_admin_user');
  const storedPass = sessionStorage.getItem('es_admin_pass');

  if (storedUser && storedPass) {
    try {
      STATE.admin = JSON.parse(storedUser);
      STATE.adminPassword = storedPass;
      showAppShell();
      refreshAllData();
      return;
    } catch (e) {
      console.error('Session restore failed', e);
      sessionStorage.clear();
    }
  }

  showLoginOverlay();
}

function setupEventListeners() {
  // Mobile nav toggle
  const btnToggle = document.getElementById('btnMobileToggle');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.toggle('open');
    });
  }

  // Sidebar navigation tabs
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      if (tab) switchTab(tab);
      // close mobile sidebar if open
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    });
  });

  // Global refresh button
  const btnRefresh = document.getElementById('btnGlobalRefresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => refreshAllData(true));
  }

  // Quick create user button in topbar
  const btnQuickCreate = document.getElementById('btnQuickCreateUser');
  if (btnQuickCreate) {
    btnQuickCreate.addEventListener('click', () => openCreateUserModal());
  }

  // Sign out button
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  // Login form submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Close modals on clicking backdrop
  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // ESC key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach((modal) => {
        closeModal(modal.id);
      });
    }
  });
}

// ================= TOAST NOTIFICATIONS =================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ================= API SERVICE =================
async function apiRequest(endpoint, body = {}) {
  const url = `${STATE.apiBaseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  const payload = {
    ...body,
    email: STATE.admin?.email,
    password: STATE.adminPassword,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response from server (Status: ${res.status}). Server output: ${text.slice(0, 120)}`);
    }

    if (!res.ok || !data.status) {
      throw new Error(data.message || `Request failed (HTTP ${res.status})`);
    }

    return data.data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// ================= AUTHENTICATION =================
async function handleLogin(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const urlInput = document.getElementById('apiUrlInput');
  const errBox = document.getElementById('loginError');
  const btnSubmit = document.getElementById('btnLoginSubmit');

  const email = emailInput?.value.trim();
  const password = passInput?.value;
  const customUrl = urlInput?.value.trim();

  if (!email || !password) {
    showLoginError('Please enter both your administrator email and password.');
    return;
  }

  if (customUrl) {
    STATE.apiBaseUrl = customUrl;
    localStorage.setItem('es_admin_api_url', customUrl);
    initApiUrl();
  }

  errBox?.classList.add('hidden');
  setBtnLoading(btnSubmit, true, 'Signing In...');

  try {
    const res = await fetch(`${STATE.apiBaseUrl}/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(`Server returned non-JSON response (HTTP ${res.status}). ${text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,200)}`);
    }

    if (!res.ok || !result.status || !result.data) {
      throw new Error(result?.message || 'Invalid administrator email or password.');
    }

    const userData = result.data;
    if (String(userData.role || '').toLowerCase() !== 'admin') {
      throw new Error('Access denied. Administrator privileges are required to open this panel.');
    }

    STATE.admin = userData;
    STATE.adminPassword = password;

    sessionStorage.setItem('es_admin_user', JSON.stringify(userData));
    sessionStorage.setItem('es_admin_pass', password);

    showAppShell();
    showToast(`Welcome back, ${userData.name || 'Admin'}!`, 'success');
    refreshAllData();
  } catch (err) {
    showLoginError(err.message || 'Could not sign in. Check connection or credentials.');
  } finally {
    setBtnLoading(btnSubmit, false, 'Sign In as Admin');
  }
}

function showLoginError(msg) {
  const errBox = document.getElementById('loginError');
  if (errBox) {
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
  }
}

function handleLogout() {
  if (!confirm('Are you sure you want to sign out from the Admin Console?')) return;
  STATE.admin = null;
  STATE.adminPassword = '';
  sessionStorage.clear();
  showLoginOverlay();
  showToast('You have been signed out.', 'info');
}

function showLoginOverlay() {
  document.getElementById('loginOverlay')?.classList.remove('hidden');
  document.getElementById('appShell')?.classList.add('hidden');
}

function showAppShell() {
  document.getElementById('loginOverlay')?.classList.add('hidden');
  document.getElementById('appShell')?.classList.remove('hidden');

  // Update profile details
  const name = STATE.admin?.name || 'Administrator';
  const email = STATE.admin?.email || '';

  const sidebarName = document.getElementById('sidebarAdminName');
  const dashName = document.getElementById('dashAdminName');
  const topbarEmail = document.getElementById('topbarAdminEmail');
  const avatar = document.getElementById('adminAvatar');
  const settingsEmail = document.getElementById('settingsCurrentEmail');

  if (sidebarName) sidebarName.textContent = name;
  if (dashName) dashName.textContent = name;
  if (topbarEmail) topbarEmail.textContent = email;
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
  if (settingsEmail) settingsEmail.value = email;
}

// ================= DATA FETCHING =================
async function refreshAllData(showNotification = false) {
  const btnRefresh = document.getElementById('btnGlobalRefresh');
  setBtnLoading(btnRefresh, true, 'Loading...');

  try {
    await Promise.all([loadStats(), loadAllReports(), loadAllUsers()]);
    if (showNotification) showToast('Data refreshed successfully!', 'success');
  } catch (err) {
    showToast('Failed to refresh data: ' + err.message, 'error');
  } finally {
    setBtnLoading(btnRefresh, false, 'Refresh Data');
  }
}

async function loadStats() {
  try {
    const stats = await apiRequest('oil_reports.php', { action: 'stats' });
    if (stats) {
      updateStatDisplay(stats);
    }
  } catch (err) {
    // If stats action fails, fallback to local counts from reports & users arrays
    console.warn('Stats API failed, falling back to client-side count', err);
    updateClientStats();
  }
}

function updateStatDisplay(stats) {
  const elTotalReports = document.getElementById('statTotalReports');
  const elTotalUsers = document.getElementById('statTotalUsers');
  const elAssignedReports = document.getElementById('statAssignedReports');
  const elUnassignedReports = document.getElementById('statUnassignedReports');

  if (elTotalReports) elTotalReports.textContent = stats.total_reports ?? 0;
  if (elTotalUsers) elTotalUsers.textContent = stats.total_users ?? 0;
  if (elAssignedReports) elAssignedReports.textContent = stats.assigned_reports ?? 0;
  if (elUnassignedReports) elUnassignedReports.textContent = stats.unassigned_reports ?? 0;

  const badgeReports = document.getElementById('badgeReportsCount');
  const badgeUsers = document.getElementById('badgeUsersCount');
  if (badgeReports) badgeReports.textContent = stats.total_reports ?? 0;
  if (badgeUsers) badgeUsers.textContent = stats.total_users ?? 0;
}

function updateClientStats() {
  const totalReports = STATE.reports.length;
  const assignedReports = STATE.reports.filter((r) => r.assigned_user_id !== null).length;
  const unassignedReports = totalReports - assignedReports;
  const totalUsers = STATE.users.filter((u) => String(u.role).toLowerCase() === 'user').length;

  updateStatDisplay({
    total_reports: totalReports,
    total_users: totalUsers,
    assigned_reports: assignedReports,
    unassigned_reports: unassignedReports,
  });
}

async function loadAllReports(showNotification = false) {
  try {
    const list = await apiRequest('oil_reports.php', { action: 'list_all' });
    STATE.reports = Array.isArray(list) ? list : [];
    const currentIds = new Set(STATE.reports.map((report) => Number(report.id)));
    STATE.selectedReportIds = STATE.selectedReportIds.filter((id) => currentIds.has(id));
    renderReportsTable();
    renderRecentReports();
    updateClientStats();
    if (showNotification) showToast('Reports loaded.', 'info');
  } catch (err) {
    console.error('Failed to load reports', err);
    showToast('Failed to load reports: ' + err.message, 'error');
  }
}

async function loadAllUsers(showNotification = false) {
  try {
    const list = await apiRequest('oil_reports.php', { action: 'list_users', all_roles: true });
    STATE.users = Array.isArray(list) ? list : [];
    renderUsersTable();
    populateAssignUserDropdown();
    updateClientStats();
    if (showNotification) showToast('Users loaded.', 'info');
  } catch (err) {
    console.error('Failed to load users', err);
    showToast('Failed to load users: ' + err.message, 'error');
  }
}

// ================= REPORTS TAB RENDERING =================
function renderReportsTable() {
  const tbody = document.getElementById('reportsTableBody');
  const countEl = document.getElementById('reportsTableCount');
  if (!tbody) return;

  const search = STATE.filters.reportSearch.toLowerCase().trim();
  const status = STATE.filters.reportStatus;

  let filtered = STATE.reports.filter((r) => {
    const matchesSearch =
      !search ||
      String(r.sample_id || '').toLowerCase().includes(search) ||
      String(r.customer || '').toLowerCase().includes(search) ||
      String(r.equipment || '').toLowerCase().includes(search) ||
      String(r.assigned_user_name || '').toLowerCase().includes(search);

    const isAssigned = r.assigned_user_id !== null && r.assigned_user_id !== undefined;
    const matchesStatus =
      status === 'all' ||
      (status === 'assigned' && isAssigned) ||
      (status === 'unassigned' && !isAssigned);

    return matchesSearch && matchesStatus;
  });

  const selectedVisibleCount = filtered.filter((r) => STATE.selectedReportIds.includes(Number(r.id))).length;
  const selectAll = document.getElementById('selectAllReports');
  if (selectAll) selectAll.checked = filtered.length > 0 && selectedVisibleCount === filtered.length;

  if (countEl) countEl.textContent = `${STATE.selectedReportIds.length} selected · Showing ${filtered.length} of ${STATE.reports.length} reports`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-muted">
          Koi report match nahi hui. Filter ya search badal kar dekhein.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((r) => {
      const isAssigned = r.assigned_user_id !== null && r.assigned_user_id !== undefined;
      const assigneeHtml = isAssigned
        ? `<span class="badge badge-success" title="${escapeHtml(r.assigned_user_email || '')}">👤 ${escapeHtml(r.assigned_user_name || 'Assigned')}</span>`
        : `<span class="badge badge-warning">⏳ Unassigned</span>`;

      return `
        <tr>
          <td><input type="checkbox" aria-label="Select report ${r.id}" ${STATE.selectedReportIds.includes(Number(r.id)) ? 'checked' : ''} onchange="toggleReportSelection(${Number(r.id)}, this.checked)" /></td>
          <td><strong>#${r.id}</strong></td>
          <td><strong style="color: var(--primary-navy);">${escapeHtml(r.sample_id || '-')}</strong></td>
          <td>${escapeHtml(r.customer || '-')}</td>
          <td>${escapeHtml(r.equipment || '-')}</td>
          <td>${escapeHtml(r.report_date || '-')}</td>
          <td>${assigneeHtml}</td>
          <td>
            <div class="table-actions">
              <button class="action-btn" onclick="viewReportDetails(${r.id})" title="View Details">
                👁️ View
              </button>
              <button class="action-btn" onclick="previewOrDownloadPdf(${r.id})" title="Download or Preview PDF">
                📥 PDF
              </button>
              <button class="action-btn btn-assign" onclick="openAssignModal(${r.id})" title="Assign to Customer">
                👤 ${isAssigned ? 'Reassign' : 'Assign'}
              </button>
              ${
                isAssigned
                  ? `<button class="action-btn" onclick="unassignReport(${r.id})" title="Unassign">🔗 Unlink</button>`
                  : ''
              }
              <button class="action-btn btn-del" onclick="deleteReport(${r.id})" title="Delete Report">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderRecentReports() {
  const tbody = document.getElementById('dashRecentReportsBody');
  if (!tbody) return;

  const recent = STATE.reports.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">Abhi koi report generate nahi hui hai.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = recent
    .map((r) => {
      const isAssigned = r.assigned_user_id !== null && r.assigned_user_id !== undefined;
      const statusBadge = isAssigned
        ? `<span class="badge badge-success">Assigned</span>`
        : `<span class="badge badge-warning">Unassigned</span>`;

      return `
        <tr>
          <td><strong>${escapeHtml(r.sample_id || '-')}</strong></td>
          <td>${escapeHtml(r.customer || '-')}</td>
          <td>${escapeHtml(r.equipment || '-')}</td>
          <td>${escapeHtml(r.report_date || '-')}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="table-actions">
              <button class="action-btn" onclick="viewReportDetails(${r.id})">👁️</button>
              <button class="action-btn" onclick="previewOrDownloadPdf(${r.id})">📥</button>
              <button class="action-btn btn-assign" onclick="openAssignModal(${r.id})">👤</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

// Search and Filter Handlers for Reports
function handleReportSearch() {
  const input = document.getElementById('reportSearchInput');
  const btnClear = document.getElementById('btnClearReportSearch');
  STATE.filters.reportSearch = input?.value || '';

  if (btnClear) {
    if (STATE.filters.reportSearch) btnClear.classList.remove('hidden');
    else btnClear.classList.add('hidden');
  }

  renderReportsTable();
}

function clearReportSearch() {
  const input = document.getElementById('reportSearchInput');
  if (input) input.value = '';
  handleReportSearch();
}

function handleReportFilterChange() {
  const filter = document.getElementById('reportStatusFilter');
  STATE.filters.reportStatus = filter?.value || 'all';
  renderReportsTable();
}

function filterReportsByStatus(status) {
  switchTab('reports');
  const filter = document.getElementById('reportStatusFilter');
  if (filter) filter.value = status;
  STATE.filters.reportStatus = status;
  renderReportsTable();
}

function getVisibleReportIds() {
  const search = STATE.filters.reportSearch.toLowerCase().trim();
  const status = STATE.filters.reportStatus;
  return STATE.reports.filter((r) => {
    const matchesSearch = !search || [r.sample_id, r.customer, r.equipment, r.assigned_user_name]
      .some((value) => String(value || '').toLowerCase().includes(search));
    const assigned = r.assigned_user_id !== null && r.assigned_user_id !== undefined;
    const matchesStatus = status === 'all' || (status === 'assigned' && assigned) || (status === 'unassigned' && !assigned);
    return matchesSearch && matchesStatus;
  }).map((r) => Number(r.id));
}

function toggleReportSelection(reportId, selected) {
  const id = Number(reportId);
  STATE.selectedReportIds = selected
    ? [...new Set([...STATE.selectedReportIds, id])]
    : STATE.selectedReportIds.filter((item) => item !== id);
  renderReportsTable();
}

function toggleAllVisibleReports(selected) {
  const visibleIds = getVisibleReportIds();
  STATE.selectedReportIds = selected
    ? [...new Set([...STATE.selectedReportIds, ...visibleIds])]
    : STATE.selectedReportIds.filter((id) => !visibleIds.includes(id));
  renderReportsTable();
}

function assignSelectedReports() {
  if (!STATE.selectedReportIds.length) {
    showToast('Select at least one report first.', 'error');
    return;
  }
  openAssignModal(null);
}

// ================= USERS TAB RENDERING =================
function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  const countEl = document.getElementById('usersTableCount');
  if (!tbody) return;

  const search = STATE.filters.userSearch.toLowerCase().trim();
  const roleFilter = STATE.filters.userRole;

  let filtered = STATE.users.filter((u) => {
    const matchesSearch =
      !search ||
      String(u.name || '').toLowerCase().includes(search) ||
      String(u.email || '').toLowerCase().includes(search);

    const userRole = String(u.role || 'user').toLowerCase();
    const matchesRole = roleFilter === 'all' || userRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${STATE.users.length} users`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          Koi user match nahi hua. Search ya Role filter check karein.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((u) => {
      const isSelf = u.id === STATE.admin?.id;
      const isAdminRole = String(u.role || '').toLowerCase() === 'admin';
      const roleBadge = isAdminRole
        ? `<span class="badge badge-neutral" style="background-color: #102A43; color: #FFFFFF;">ADMIN</span>`
        : `<span class="badge badge-info">CUSTOMER</span>`;

      return `
        <tr>
          <td><strong>#${u.id}</strong></td>
          <td>
            <strong>${escapeHtml(u.name || '-')}</strong>
            ${isSelf ? '<small class="text-muted"> (You)</small>' : ''}
          </td>
          <td>${escapeHtml(u.email || '-')}</td>
          <td>${roleBadge}</td>
          <td>
            <span class="badge ${u.report_count > 0 ? 'badge-success' : 'badge-neutral'}">
              📄 ${u.report_count ?? 0} Reports
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="action-btn" onclick="filterReportsByUser('${escapeHtml(u.name || '')}')" title="View Assigned Reports">
                🔍 Reports
              </button>
              ${
                !isSelf
                  ? `<button class="action-btn btn-del" onclick="deleteUser(${u.id}, '${escapeHtml(u.name || '')}')" title="Delete User">
                      🗑️ Delete
                    </button>`
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function handleUserSearch() {
  const input = document.getElementById('userSearchInput');
  const roleSelect = document.getElementById('userRoleFilter');
  const btnClear = document.getElementById('btnClearUserSearch');

  STATE.filters.userSearch = input?.value || '';
  STATE.filters.userRole = roleSelect?.value || 'all';

  if (btnClear) {
    if (STATE.filters.userSearch) btnClear.classList.remove('hidden');
    else btnClear.classList.add('hidden');
  }

  renderUsersTable();
}

function clearUserSearch() {
  const input = document.getElementById('userSearchInput');
  if (input) input.value = '';
  handleUserSearch();
}

function filterReportsByUser(userName) {
  switchTab('reports');
  const input = document.getElementById('reportSearchInput');
  if (input) {
    input.value = userName;
    handleReportSearch();
  }
}

// ================= CREATE NEW USER =================
function openCreateUserModal() {
  const form = document.getElementById('createUserForm');
  if (form) form.reset();
  openModal('modalCreateUser');
}

async function handleCreateUser(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('createUserName')?.value.trim();
  const email = document.getElementById('createUserEmail')?.value.trim();
  const password = document.getElementById('createUserPassword')?.value;
  const role = document.getElementById('createUserRole')?.value || 'user';
  const btnSubmit = document.getElementById('btnSubmitCreateUser');

  if (!name || !email || !password) {
    showToast('Name, Email and Password are required.', 'error');
    return;
  }

  setBtnLoading(btnSubmit, true, 'Creating...');
  try {
    // Try oil_reports.php create_user action
    await apiRequest('oil_reports.php', {
      action: 'create_user',
      name,
      new_user_email: email,
      new_user_password: password,
      role,
    });

    showToast(`User account for "${name}" created successfully!`, 'success');
    closeModal('modalCreateUser');
    await loadAllUsers();
  } catch (err) {
    showToast('User creation failed: ' + err.message, 'error');
  } finally {
    setBtnLoading(btnSubmit, false, 'Create Account');
  }
}

async function deleteUser(userId, userName) {
  if (!confirm(`Are you sure you want to delete user "${userName}" (ID #${userId})?\n\nTheir assigned reports will become unassigned.`)) {
    return;
  }

  try {
    await apiRequest('oil_reports.php', {
      action: 'delete_user',
      user_id: userId,
    });
    showToast(`User "${userName}" deleted.`, 'success');
    await loadAllUsers();
    await loadAllReports();
  } catch (err) {
    showToast('Failed to delete user: ' + err.message, 'error');
  }
}

// ================= ASSIGN & UNASSIGN REPORTS =================
function populateAssignUserDropdown() {
  const select = document.getElementById('assignSelectUser');
  if (!select) return;

  const currentVal = select.value;
  const search = document.getElementById('assignUserSearch')?.value.toLowerCase().trim() || '';
  select.innerHTML = '<option value="">-- Choose Customer --</option>';

  // Customers only
  const customers = STATE.users.filter((u) => String(u.role).toLowerCase() === 'user' &&
    (!search || `${u.name} ${u.email}`.toLowerCase().includes(search)));
  customers.forEach((u) => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.name} (${u.email})`;
    select.appendChild(opt);
  });

  if (currentVal) select.value = currentVal;
}

function openAssignModal(reportId) {
  const report = reportId ? STATE.reports.find((r) => Number(r.id) === Number(reportId)) : null;
  const ids = report ? [Number(report.id)] : STATE.selectedReportIds;
  if (!ids.length) return;

  document.getElementById('assignReportId').value = ids.length === 1 ? ids[0] : '';
  document.getElementById('assignReportIds').value = ids.join(',');
  const summary = document.querySelector('#modalAssignReport .assign-report-summary');
  if (summary) summary.classList.toggle('hidden', ids.length > 1);
  document.getElementById('assignModalTitle').textContent = ids.length > 1 ? `Assign ${ids.length} Reports to Customer` : 'Assign Report to Customer';
  document.getElementById('assignModalSampleId').textContent = report?.sample_id || '-';
  document.getElementById('assignModalCustomer').textContent = report?.customer || '-';
  document.getElementById('assignModalEquipment').textContent = report?.equipment || '-';
  const searchInput = document.getElementById('assignUserSearch');
  if (searchInput) searchInput.value = '';
  const submitText = document.querySelector('#btnSubmitAssign .btn-text');
  if (submitText) submitText.textContent = ids.length > 1 ? `Assign ${ids.length} Reports` : 'Assign Report';

  populateAssignUserDropdown();

  const select = document.getElementById('assignSelectUser');
  if (select && report?.assigned_user_id) {
    select.value = String(report.assigned_user_id);
  }

  openModal('modalAssignReport');
}

function handleAssignUserSearch() {
  const select = document.getElementById('assignSelectUser');
  const currentVal = select?.value || '';
  populateAssignUserDropdown();
  if (select && [...select.options].some((option) => option.value === currentVal)) select.value = currentVal;
}

async function handleAssignReport(e) {
  if (e) e.preventDefault();
  const reportIds = String(document.getElementById('assignReportIds')?.value || document.getElementById('assignReportId')?.value || '')
    .split(',').map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id) && id > 0);
  const userId = parseInt(document.getElementById('assignSelectUser')?.value, 10);
  const btnSubmit = document.getElementById('btnSubmitAssign');

  if (!reportIds.length || !userId) {
    showToast('Please select a customer account.', 'error');
    return;
  }

  setBtnLoading(btnSubmit, true, 'Assigning...');
  try {
    if (reportIds.length > 1) {
      try {
        await apiRequest('oil_reports.php', { action: 'assign_many', report_ids: reportIds, assigned_user_id: userId });
      } catch (err) {
        if (!/unknown report action/i.test(String(err.message))) throw err;
        for (const id of reportIds) {
          await apiRequest('oil_reports.php', { action: 'assign', report_id: id, assigned_user_id: userId });
        }
      }
    } else {
      await apiRequest('oil_reports.php', { action: 'assign', report_id: reportIds[0], assigned_user_id: userId });
    }

    showToast(`${reportIds.length} report${reportIds.length === 1 ? '' : 's'} assigned successfully!`, 'success');
    STATE.selectedReportIds = STATE.selectedReportIds.filter((id) => !reportIds.includes(id));
    closeModal('modalAssignReport');
    await loadAllReports();
    await loadAllUsers();
  } catch (err) {
    showToast('Failed to assign report: ' + err.message, 'error');
  } finally {
    const submitText = document.querySelector('#btnSubmitAssign .btn-text');
    if (submitText) submitText.textContent = 'Assign Report';
    setBtnLoading(btnSubmit, false, 'Assign Report');
  }
}

async function unassignReport(reportId) {
  if (!confirm(`Are you sure you want to unassign Report #${reportId}?`)) return;

  try {
    await apiRequest('oil_reports.php', {
      action: 'unassign',
      report_id: reportId,
    });
    showToast('Report unassigned.', 'info');
    await loadAllReports();
    await loadAllUsers();
  } catch (err) {
    showToast('Failed to unassign: ' + err.message, 'error');
  }
}

async function deleteReport(reportId) {
  if (!confirm(`Are you sure you want to DELETE Report #${reportId} permanently? This action cannot be undone.`)) {
    return;
  }

  try {
    await apiRequest('oil_reports.php', {
      action: 'delete_report',
      report_id: reportId,
    });
    showToast('Report deleted successfully.', 'success');
    await loadAllReports();
    await loadStats();
  } catch (err) {
    showToast('Failed to delete report: ' + err.message, 'error');
  }
}

// ================= VIEW REPORT DETAILS =================
async function viewReportDetails(reportId) {
  try {
    showToast('Loading report details...', 'info');
    const fullReport = await apiRequest('oil_reports.php', {
      action: 'get',
      report_id: reportId,
    });

    if (!fullReport) throw new Error('Report data not returned.');

    const data = fullReport.data || {};

    // Header info
    document.getElementById('detailReportTitle').textContent = `Oil Analysis Report #${fullReport.id}`;
    document.getElementById('detailReportSub').textContent = `Sample: ${fullReport.sample_id} | Customer: ${fullReport.customer}`;

    document.getElementById('detSampleId').textContent = fullReport.sample_id || '-';
    document.getElementById('detCustomer').textContent = fullReport.customer || '-';
    document.getElementById('detEquipment').textContent = fullReport.equipment || '-';
    document.getElementById('detReportDate').textContent = fullReport.report_date || '-';

    document.getElementById('detSite').textContent = data.site || '-';
    document.getElementById('detLubricant').textContent = data.lubricant || '-';
    document.getElementById('detComponent').textContent = data.component || '-';
    document.getElementById('detRunningHours').textContent = data.runningHours || '-';
    document.getElementById('detSampleDate').textContent = data.sampleDate || '-';
    document.getElementById('detReceivedDate').textContent = data.receivedDate || '-';

    // Condition badges
    renderConditionBadge('detLubeCondition', data.lubricantCondition);
    renderConditionBadge('detWearCondition', data.wearCondition);

    // Assignee
    const assigneeEl = document.getElementById('detAssignee');
    if (assigneeEl) {
      if (fullReport.assigned_user_id) {
        const u = STATE.users.find((user) => user.id === fullReport.assigned_user_id);
        assigneeEl.textContent = u ? `${u.name} (${u.email})` : `User #${fullReport.assigned_user_id}`;
        assigneeEl.className = 'badge badge-success';
      } else {
        assigneeEl.textContent = 'Unassigned';
        assigneeEl.className = 'badge badge-warning';
      }
    }

    // Recommendation
    const recBox = document.getElementById('detRecommendation');
    if (recBox) {
      recBox.textContent = data.recommendation || 'No specific recommendations provided.';
      recBox.className = 'recommendation-box';
    }

    // Test results parameters
    const tbody = document.getElementById('detResultsTableBody');
    if (tbody) {
      const results = data.results || {};
      const keys = Object.keys(results);
      if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted">No test results data recorded.</td></tr>`;
      } else {
        tbody.innerHTML = keys
          .map((k) => `<tr><td><strong>${escapeHtml(formatParamKey(k))}</strong></td><td><code>${escapeHtml(results[k] || '-')}</code></td></tr>`)
          .join('');
      }
    }

    // PDF Download button in modal
    const btnDownload = document.getElementById('btnDownloadDetailPdf');
    if (btnDownload) {
      btnDownload.onclick = () => previewOrDownloadPdf(reportId);
    }

    openModal('modalReportDetails');
  } catch (err) {
    showToast('Failed to load report: ' + err.message, 'error');
  }
}

function renderConditionBadge(elId, condition) {
  const el = document.getElementById(elId);
  if (!el) return;
  const val = String(condition || 'Normal');
  el.textContent = val;
  if (val.toLowerCase() === 'critical') el.className = 'badge badge-danger';
  else if (val.toLowerCase() === 'monitor') el.className = 'badge badge-warning';
  else el.className = 'badge badge-success';
}

function formatParamKey(key) {
  const labels = {
    vis40: 'Viscosity @ 40 °C (cSt)',
    vis100: 'Viscosity @ 100 °C (cSt)',
    visIndex: 'Viscosity Index',
    acid: 'Acid Number (mg KOH/g)',
    iso: 'Particle Count (ISO 4406)',
    particle4: 'Particles >4 µm(c) / ml',
    particle6: 'Particles >6 µm(c) / ml',
    particle14: 'Particles >14 µm(c) / ml',
    nas: 'Particle Count / NAS 1638',
    moisture: 'Moisture Content (ppm)',
    iron: 'Iron, Fe (ppm)',
    chromium: 'Chromium, Cr (ppm)',
    tin: 'Tin, Sn (ppm)',
    aluminum: 'Aluminium, Al (ppm)',
    nickel: 'Nickel, Ni (ppm)',
    copper: 'Copper, Cu (ppm)',
    lead: 'Lead, Pb (ppm)',
    silicon: 'Silicon, Si (ppm)',
    sodium: 'Sodium, Na (ppm)',
    zinc: 'Zinc, Zn (ppm)',
    phosphorus: 'Phosphorus, P (ppm)',
    calcium: 'Calcium, Ca (ppm)',
    magnesium: 'Magnesium, Mg (ppm)',
  };
  return labels[key] || key;
}

// ================= PDF DOWNLOAD & PREVIEW =================
async function previewOrDownloadPdf(reportId) {
  try {
    showToast('Fetching PDF report...', 'info');

    let base64 = STATE.cachedPdfs[reportId];
    if (!base64) {
      const res = await apiRequest('oil_reports.php', {
        action: 'download',
        report_id: reportId,
      });
      base64 = res?.pdf_base64;
      if (!base64) throw new Error('PDF file data not found on server.');
      STATE.cachedPdfs[reportId] = base64;
    }

    const report = STATE.reports.find((r) => r.id === reportId);
    const sampleId = report ? report.sample_id : reportId;
    const fileName = `EnergySolution-Report-${reportId}-${sampleId}.pdf`;

    // Convert base64 to Blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    // Open viewer modal
    const iframe = document.getElementById('pdfViewerFrame');
    const title = document.getElementById('pdfViewerTitle');
    const downloadBtn = document.getElementById('btnPdfDownloadDirect');

    if (iframe) iframe.src = blobUrl;
    if (title) title.textContent = `PDF Preview: ${fileName}`;
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('PDF downloaded successfully.', 'success');
      };
    }

    openModal('modalPdfViewer');
  } catch (err) {
    showToast('Failed to load PDF: ' + err.message, 'error');
  }
}

// ================= CHANGE ADMIN PASSWORD =================
function openChangePasswordModal() {
  const form = document.getElementById('quickChangePasswordForm');
  if (form) form.reset();
  openModal('modalChangePassword');
}

async function handleQuickChangePassword(e) {
  if (e) e.preventDefault();
  const newPass = document.getElementById('quickNewPassword')?.value;
  const confirmPass = document.getElementById('quickConfirmPassword')?.value;
  const btnSubmit = document.getElementById('btnSubmitQuickPw');

  if (!newPass || newPass.length < 6) {
    showToast('Password must be at least 6 characters long.', 'error');
    return;
  }
  if (newPass !== confirmPass) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  setBtnLoading(btnSubmit, true, 'Updating...');
  try {
    await apiRequest('oil_reports.php', {
      action: 'change_password',
      new_password: newPass,
    });

    STATE.adminPassword = newPass;
    sessionStorage.setItem('es_admin_pass', newPass);

    showToast('Admin password changed successfully! New password saved in session.', 'success');
    closeModal('modalChangePassword');
  } catch (err) {
    showToast('Failed to change password: ' + err.message, 'error');
  } finally {
    setBtnLoading(btnSubmit, false, 'Update Password');
  }
}

async function handleSettingsChangePassword(e) {
  if (e) e.preventDefault();
  const newPass = document.getElementById('settingsNewPassword')?.value;
  const confirmPass = document.getElementById('settingsConfirmPassword')?.value;
  const btnSubmit = document.getElementById('btnSaveNewPassword');

  if (!newPass || newPass.length < 6) {
    showToast('Password must be at least 6 characters long.', 'error');
    return;
  }
  if (newPass !== confirmPass) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  setBtnLoading(btnSubmit, true, 'Updating...');
  try {
    await apiRequest('oil_reports.php', {
      action: 'change_password',
      new_password: newPass,
    });

    STATE.adminPassword = newPass;
    sessionStorage.setItem('es_admin_pass', newPass);

    showToast('Admin password changed successfully! New password active.', 'success');
    document.getElementById('settingsChangePasswordForm')?.reset();
    document.getElementById('settingsCurrentEmail').value = STATE.admin?.email || '';
  } catch (err) {
    showToast('Failed to change password: ' + err.message, 'error');
  } finally {
    setBtnLoading(btnSubmit, false, 'Update Admin Password');
  }
}

// ================= SETTINGS & API CONNECTION =================
function handleSaveApiUrl(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('settingsApiUrl');
  const newUrl = input?.value.trim();
  if (!newUrl) return;

  STATE.apiBaseUrl = newUrl;
  localStorage.setItem('es_admin_api_url', newUrl);
  initApiUrl();
  showToast('API URL saved successfully.', 'success');
  testApiConnection();
}

async function testApiConnection() {
  const statusEl = document.getElementById('apiConnectionStatus');
  if (statusEl) {
    statusEl.textContent = 'Testing...';
    statusEl.className = 'badge badge-warning';
  }

  try {
    // Ping login with dummy OPTIONS/POST or reports action
    const res = await fetch(`${STATE.apiBaseUrl}/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (res.status >= 200 && res.status < 500) {
      if (statusEl) {
        statusEl.textContent = `Online (HTTP ${res.status})`;
        statusEl.className = 'badge badge-success';
      }
      showToast('API Server reachable!', 'success');
    } else {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = 'Offline / Error';
      statusEl.className = 'badge badge-danger';
    }
    showToast('Connection failed: ' + err.message, 'error');
  }
}

// ================= TABS & MODALS =================
function switchTab(tabId) {
  STATE.activeTab = tabId;

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach((item) => {
    if (item.getAttribute('data-tab') === tabId) item.classList.add('active');
    else item.classList.remove('active');
  });

  // Update tab pane active state
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    if (pane.id === `tab-${tabId}`) pane.classList.add('active');
    else pane.classList.remove('active');
  });

  // Breadcrumbs title
  const titleMap = {
    dashboard: 'Dashboard',
    reports: 'Oil Reports Management',
    users: 'Users & Customers',
    settings: 'Admin Settings',
  };
  const titleEl = document.getElementById('currentPageTitle');
  if (titleEl) titleEl.textContent = titleMap[tabId] || 'Dashboard';
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    // If pdf viewer, stop iframe
    if (modalId === 'modalPdfViewer') {
      const iframe = document.getElementById('pdfViewerFrame');
      if (iframe) iframe.src = 'about:blank';
    }
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = 'Show';
  }
}

function setBtnLoading(btn, isLoading, text) {
  if (!btn) return;
  btn.disabled = isLoading;
  const btnText = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');

  if (btnText && text) btnText.textContent = text;
  if (spinner) {
    if (isLoading) spinner.classList.remove('hidden');
    else spinner.classList.add('hidden');
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}