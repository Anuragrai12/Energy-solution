<?php
declare(strict_types=1);

require_once 'db.php';
require_once 'reports_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    report_json(false, 'Method not allowed.', null, 405);
}

$body = report_read_body();

// Require a real signed-in administrator for every request.
$name = trim((string)($body['name'] ?? ''));
$email = trim((string)($body['new_user_email'] ?? $body['email_to_create'] ?? $body['new_email'] ?? $body['email'] ?? ''));
$password = (string)($body['new_user_password'] ?? $body['new_password'] ?? $body['password'] ?? '');
$role = strtolower(trim((string)($body['role'] ?? 'user')));
if ($role !== 'admin' && $role !== 'user') $role = 'user';

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 4) {
    report_json(false, 'Please provide a valid name, email address, and password (at least 4 characters).', null, 422);
}

$admin = report_current_user($conn, $body);
report_require_admin($admin);

// Check existing user
$stmt = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$exists = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($exists) {
    report_json(false, 'A user account with this email address already exists.', null, 409);
}

$hashed = password_hash($password, PASSWORD_DEFAULT);
$insert = $conn->prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
$insert->bind_param('ssss', $name, $email, $hashed, $role);
$insert->execute();
$newId = (int)$conn->insert_id;
$insert->close();

report_json(true, 'User created successfully.', [
    'id' => $newId,
    'name' => $name,
    'email' => $email,
    'role' => $role,
], 201);
