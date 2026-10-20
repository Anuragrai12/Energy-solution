<?php
require_once 'db.php';
require_once 'reports_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') report_json(false, 'Method not allowed.', null, 405);
$body = report_read_body();
$email = trim((string)($body['email'] ?? ''));
$password = (string)($body['password'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') report_json(false, 'Enter a valid email and password.', null, 422);

$stmt = $conn->prepare('SELECT id, name, email, role, password FROM users WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$user) report_json(false, 'Invalid email or password.', null, 401);

$storedPassword = (string)$user['password'];
$validPassword = password_verify($password, $storedPassword) || hash_equals($storedPassword, $password);
if (!$validPassword) report_json(false, 'Invalid email or password.', null, 401);

report_json(true, 'Signed in.', [
    'access_token' => report_issue_token((int)$user['id']),
    'expires_in' => 43200,
    'user_id' => (int)$user['id'],
]);
