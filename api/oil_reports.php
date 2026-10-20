<?php
declare(strict_types=1);

require_once 'db.php';
require_once 'reports_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    report_json(false, 'Method not allowed.', null, 405);
}

$body = report_read_body();
$user = report_current_user($conn, $body);
$action = (string)($body['action'] ?? '');

// 1. Dashboard Stats
if ($action === 'stats') {
    report_require_admin($user);

    $totalReportsQuery = $conn->query("SELECT COUNT(*) FROM oil_reports");
    $totalReports = $totalReportsQuery ? (int)($totalReportsQuery->fetch_row()[0] ?? 0) : 0;

    $assignedQuery = $conn->query("SELECT COUNT(*) FROM oil_reports WHERE assigned_user_id IS NOT NULL");
    $assignedReports = $assignedQuery ? (int)($assignedQuery->fetch_row()[0] ?? 0) : 0;
    $unassignedReports = max(0, $totalReports - $assignedReports);

    $usersQuery = $conn->query("SELECT COUNT(*) FROM users WHERE LOWER(role) = 'user'");
    $totalUsers = $usersQuery ? (int)($usersQuery->fetch_row()[0] ?? 0) : 0;

    $adminsQuery = $conn->query("SELECT COUNT(*) FROM users WHERE LOWER(role) = 'admin'");
    $totalAdmins = $adminsQuery ? (int)($adminsQuery->fetch_row()[0] ?? 0) : 0;

    report_json(true, 'Stats loaded.', [
        'total_reports' => $totalReports,
        'assigned_reports' => $assignedReports,
        'unassigned_reports' => $unassignedReports,
        'total_users' => $totalUsers,
        'total_admins' => $totalAdmins,
    ]);
}

// 2. List Users
if ($action === 'list_users') {
    report_require_admin($user);
    $allRoles = !empty($body['all_roles']);
    
    // Check if created_at exists in users table, otherwise omit it
    $sql = $allRoles
        ? "SELECT u.id, u.name, u.email, u.role, (SELECT COUNT(*) FROM oil_reports r WHERE r.assigned_user_id = u.id) AS report_count FROM users u ORDER BY u.role ASC, u.name ASC"
        : "SELECT u.id, u.name, u.email, u.role, (SELECT COUNT(*) FROM oil_reports r WHERE r.assigned_user_id = u.id) AS report_count FROM users u WHERE LOWER(u.role) = 'user' ORDER BY u.name ASC";

    $result = $conn->query($sql);
    $users = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    foreach ($users as &$u) {
        $u['id'] = (int)$u['id'];
        $u['report_count'] = (int)($u['report_count'] ?? 0);
    }
    report_json(true, 'Users loaded.', $users);
}

// 3. Create User
if ($action === 'create_user') {
    report_require_admin($user);
    $name = trim((string)($body['name'] ?? ''));
    $newUserEmail = trim((string)($body['new_user_email'] ?? $body['email_to_create'] ?? $body['new_email'] ?? ''));
    $newUserPassword = (string)($body['new_user_password'] ?? $body['new_password'] ?? '');
    $role = strtolower(trim((string)($body['role'] ?? 'user')));
    if ($role !== 'admin' && $role !== 'user') $role = 'user';

    if ($name === '' || !filter_var($newUserEmail, FILTER_VALIDATE_EMAIL) || strlen($newUserPassword) < 4) {
        report_json(false, 'Please provide valid name, email address, and password (at least 4 characters).', null, 422);
    }

    $chk = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $chk->bind_param('s', $newUserEmail);
    $chk->execute();
    $existing = $chk->get_result()->fetch_assoc();
    $chk->close();
    if ($existing) {
        report_json(false, 'A user account with this email address already exists.', null, 409);
    }

    $hashed = password_hash($newUserPassword, PASSWORD_DEFAULT);
    $stmt = $conn->prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('ssss', $name, $newUserEmail, $hashed, $role);
    $stmt->execute();
    $newId = (int)$conn->insert_id;
    $stmt->close();

    report_json(true, 'User account created successfully.', [
        'id' => $newId,
        'name' => $name,
        'email' => $newUserEmail,
        'role' => $role,
    ], 201);
}

// 4. Change Password (for the currently signed-in admin)
if ($action === 'change_password') {
    report_require_admin($user);
    $newPassword = (string)($body['new_password'] ?? '');
    if (strlen($newPassword) < 6) {
        report_json(false, 'New password must be at least 6 characters long.', null, 422);
    }

    $hashed = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $conn->prepare('UPDATE users SET password = ? WHERE id = ?');
    $stmt->bind_param('si', $hashed, $user['id']);
    $stmt->execute();
    $stmt->close();

    report_json(true, 'Password updated successfully.');
}

// 5. Delete User
if ($action === 'delete_user') {
    report_require_admin($user);
    $targetUserId = filter_var($body['user_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$targetUserId) report_json(false, 'Invalid user ID.', null, 422);
    if ($targetUserId === $user['id']) report_json(false, 'You cannot delete your own account.', null, 400);

    // Unassign reports linked to this user first
    $uStmt = $conn->prepare('UPDATE oil_reports SET assigned_user_id = NULL WHERE assigned_user_id = ?');
    $uStmt->bind_param('i', $targetUserId);
    $uStmt->execute();
    $uStmt->close();

    $stmt = $conn->prepare('DELETE FROM users WHERE id = ?');
    $stmt->bind_param('i', $targetUserId);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected <= 0) report_json(false, 'User not found.', null, 404);
    report_json(true, 'User deleted successfully.', ['id' => $targetUserId]);
}

// 6. List Reports for Admin (Supports both all reports or admin-created)
if ($action === 'list_admin' || $action === 'list_all') {
    report_require_admin($user);
    $viewAll = !empty($body['view_all']) || $action === 'list_all';

    if ($viewAll) {
        $stmt = $conn->prepare('SELECT r.id, r.sample_id, r.customer, r.equipment, r.report_date, r.created_at, r.updated_at, r.assigned_user_id, r.created_by, u.name AS assigned_user_name, u.email AS assigned_user_email, c.name AS creator_name FROM oil_reports r LEFT JOIN users u ON u.id = r.assigned_user_id LEFT JOIN users c ON c.id = r.created_by ORDER BY r.updated_at DESC');
    } else {
        $stmt = $conn->prepare('SELECT r.id, r.sample_id, r.customer, r.equipment, r.report_date, r.created_at, r.updated_at, r.assigned_user_id, r.created_by, u.name AS assigned_user_name, u.email AS assigned_user_email FROM oil_reports r LEFT JOIN users u ON u.id = r.assigned_user_id WHERE r.created_by = ? ORDER BY r.updated_at DESC');
        $stmt->bind_param('i', $user['id']);
    }
    $stmt->execute();
    $reports = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($reports as &$r) {
        $r['id'] = (int)$r['id'];
        $r['assigned_user_id'] = $r['assigned_user_id'] !== null ? (int)$r['assigned_user_id'] : null;
        $r['created_by'] = (int)$r['created_by'];
    }
    report_json(true, 'Reports loaded.', $reports);
}

// 7. List Assigned Reports for User
if ($action === 'list_assigned') {
    $stmt = $conn->prepare('SELECT id, sample_id, customer, equipment, report_date, updated_at, assigned_user_id FROM oil_reports WHERE assigned_user_id = ? ORDER BY updated_at DESC');
    $stmt->bind_param('i', $user['id']);
    $stmt->execute();
    $reports = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($reports as &$r) {
        $r['id'] = (int)$r['id'];
        $r['assigned_user_id'] = (int)$r['assigned_user_id'];
    }
    report_json(true, 'Assigned reports loaded.', $reports);
}

// 8. Get Single Report or Download PDF
if ($action === 'get' || $action === 'download') {
    $reportId = filter_var($body['report_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$reportId) report_json(false, 'Invalid report ID.', null, 422);

    $stmt = $conn->prepare('SELECT id, sample_id, customer, equipment, report_date, updated_at, assigned_user_id, created_by, report_data, pdf_data FROM oil_reports WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $reportId);
    $stmt->execute();
    $report = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$report) {
        report_json(false, 'Report not found.', null, 404);
    }

    if ($user['role'] !== 'admin' && (int)$report['assigned_user_id'] !== $user['id']) {
        report_json(false, 'Access denied.', null, 403);
    }

    if ($action === 'download') {
        report_json(true, 'PDF loaded.', ['pdf_base64' => base64_encode($report['pdf_data'])]);
    }

    unset($report['pdf_data']);
    $report['data'] = json_decode($report['report_data'], true);
    unset($report['report_data']);
    $report['id'] = (int)$report['id'];
    $report['assigned_user_id'] = $report['assigned_user_id'] === null ? null : (int)$report['assigned_user_id'];
    $report['created_by'] = (int)$report['created_by'];

    report_json(true, 'Report loaded.', $report);
}

// Assign multiple reports to one customer in a single admin action.
if ($action === 'assign_many') {
    report_require_admin($user);
    $assignedUserId = filter_var($body['assigned_user_id'] ?? null, FILTER_VALIDATE_INT);
    $reportIds = $body['report_ids'] ?? null;
    if (!$assignedUserId || !is_array($reportIds) || count($reportIds) < 1) {
        report_json(false, 'Choose at least one report and a customer account.', null, 422);
    }
    $customerStmt = $conn->prepare("SELECT id FROM users WHERE id = ? AND LOWER(role) = 'user' LIMIT 1");
    $customerStmt->bind_param('i', $assignedUserId);
    $customerStmt->execute();
    $validCustomer = $customerStmt->get_result()->fetch_assoc();
    $customerStmt->close();
    if (!$validCustomer) report_json(false, 'Select a valid customer account.', null, 422);

    $ids = [];
    foreach ($reportIds as $reportIdValue) {
        $validId = filter_var($reportIdValue, FILTER_VALIDATE_INT);
        if (!$validId || $validId < 1) report_json(false, 'One or more report IDs are invalid.', null, 422);
        $ids[] = (int)$validId;
    }
    $ids = array_values(array_unique($ids));
    $safeIds = implode(',', $ids);
    $check = $conn->query("SELECT COUNT(*) FROM oil_reports WHERE id IN ($safeIds)");
    $foundCount = $check ? (int)($check->fetch_row()[0] ?? 0) : 0;
    if ($foundCount !== count($ids)) report_json(false, 'One or more reports could not be found. Refresh and try again.', null, 404);

    $stmt = $conn->prepare("UPDATE oil_reports SET assigned_user_id = ? WHERE id IN ($safeIds)");
    $stmt->bind_param('i', $assignedUserId);
    $stmt->execute();
    $stmt->close();
    report_json(true, 'Reports assigned.', ['report_ids' => $ids, 'assigned_user_id' => (int)$assignedUserId]);
}

// 9. Assign Report to User
if ($action === 'assign') {
    report_require_admin($user);
    $reportId = filter_var($body['report_id'] ?? null, FILTER_VALIDATE_INT);
    $assignedUserId = filter_var($body['assigned_user_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$reportId || !$assignedUserId) report_json(false, 'Choose a report and customer account.', null, 422);

    $userStmt = $conn->prepare("SELECT id FROM users WHERE id = ? AND LOWER(role) = 'user' LIMIT 1");
    $userStmt->bind_param('i', $assignedUserId);
    $userStmt->execute();
    $validUser = $userStmt->get_result()->fetch_assoc();
    $userStmt->close();
    if (!$validUser) report_json(false, 'Select a valid customer account.', null, 422);

    $ownerStmt = $conn->prepare('SELECT id FROM oil_reports WHERE id = ? LIMIT 1');
    $ownerStmt->bind_param('i', $reportId);
    $ownerStmt->execute();
    $reportExists = $ownerStmt->get_result()->fetch_assoc();
    $ownerStmt->close();
    if (!$reportExists) report_json(false, 'Report not found.', null, 404);

    $stmt = $conn->prepare('UPDATE oil_reports SET assigned_user_id = ? WHERE id = ?');
    $stmt->bind_param('ii', $assignedUserId, $reportId);
    $stmt->execute();
    $updated = $stmt->affected_rows;
    $stmt->close();

    if ($updated < 0) report_json(false, 'The report assignment could not be saved.', null, 500);
    report_json(true, 'Report assigned.', ['id' => (int)$reportId, 'assigned_user_id' => (int)$assignedUserId]);
}

// 10. Unassign Report
if ($action === 'unassign') {
    report_require_admin($user);
    $reportId = filter_var($body['report_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$reportId) report_json(false, 'Invalid report ID.', null, 422);

    $stmt = $conn->prepare('UPDATE oil_reports SET assigned_user_id = NULL WHERE id = ?');
    $stmt->bind_param('i', $reportId);
    $stmt->execute();
    $stmt->close();

    report_json(true, 'Report unassigned.', ['id' => (int)$reportId]);
}

// 11. Delete Report
if ($action === 'delete_report') {
    report_require_admin($user);
    $reportId = filter_var($body['report_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$reportId) report_json(false, 'Invalid report ID.', null, 422);

    $stmt = $conn->prepare('DELETE FROM oil_reports WHERE id = ?');
    $stmt->bind_param('i', $reportId);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected <= 0) report_json(false, 'Report not found.', null, 404);
    report_json(true, 'Report deleted successfully.', ['id' => $reportId]);
}

// 12. Save Report (Create or Update)
if ($action === 'save') {
    report_require_admin($user);
    $reportId = isset($body['report_id']) ? filter_var($body['report_id'], FILTER_VALIDATE_INT) : null;
    $data = $body['data'] ?? null;
    $pdfBase64 = (string)($body['pdf_base64'] ?? '');
    $pdf = base64_decode($pdfBase64, true);

    if (!is_array($data) || $pdf === false || strlen($pdf) < 100 || substr($pdf, 0, 4) !== '%PDF') {
        report_json(false, 'Report data and a valid PDF are required.', null, 422);
    }

    $sampleId = trim((string)($data['sampleId'] ?? ''));
    $customer = trim((string)($data['customer'] ?? ''));
    $equipment = trim((string)($data['equipment'] ?? ''));
    $reportDate = trim((string)($data['reportDate'] ?? ''));
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if (!$sampleId || !$customer || !$equipment || !$reportDate || !$json) {
        report_json(false, 'Required report details are missing.', null, 422);
    }

    if ($reportId) {
        $ownerStmt = $conn->prepare('SELECT id FROM oil_reports WHERE id = ? LIMIT 1');
        $ownerStmt->bind_param('i', $reportId);
        $ownerStmt->execute();
        $ownsReport = $ownerStmt->get_result()->fetch_assoc();
        $ownerStmt->close();
        if (!$ownsReport) report_json(false, 'Report not found.', null, 404);

        $stmt = $conn->prepare('UPDATE oil_reports SET sample_id = ?, customer = ?, equipment = ?, report_date = ?, report_data = ?, pdf_data = ? WHERE id = ?');
        $stmt->bind_param('sssssbi', $sampleId, $customer, $equipment, $reportDate, $json, $pdf, $reportId);
        $stmt->send_long_data(5, $pdf);
        $stmt->execute();
        $stmt->close();
        report_json(true, 'Report updated.', ['id' => (int)$reportId]);
    }

    $stmt = $conn->prepare('INSERT INTO oil_reports (sample_id, customer, equipment, report_date, report_data, pdf_data, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('sssssbi', $sampleId, $customer, $equipment, $reportDate, $json, $pdf, $user['id']);
    $stmt->send_long_data(5, $pdf);
    $stmt->execute();
    $id = (int)$conn->insert_id;
    $stmt->close();
    report_json(true, 'Report saved.', ['id' => $id], 201);
}

report_json(false, 'Unknown report action.', null, 400);
