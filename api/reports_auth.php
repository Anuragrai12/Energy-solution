<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

function report_json(bool $status, string $message, $data = null, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['status' => $status, 'message' => $message, 'data' => $data]);
    exit();
}

function report_current_user(mysqli $conn, array $body): array {
    $email = trim((string)($body['email'] ?? ''));
    $password = (string)($body['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        report_json(false, 'Please sign in again.', null, 401);
    }
    $stmt = $conn->prepare('SELECT id, name, email, role, password FROM users WHERE email = ? LIMIT 1');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$user) report_json(false, 'Invalid email or password.', null, 401);
    $storedPassword = (string)$user['password'];
    if (!(password_verify($password, $storedPassword) || hash_equals($storedPassword, $password))) {
        report_json(false, 'Invalid email or password.', null, 401);
    }
    unset($user['password']);
    $user['id'] = (int)$user['id'];
    $user['role'] = strtolower(trim((string)$user['role']));
    return $user;
}

function report_require_admin(array $user): void {
    if ($user['role'] !== 'admin') report_json(false, 'Administrator access is required.', null, 403);
}

function report_read_body(): array {
    $body = json_decode(file_get_contents('php://input'), true);
    return is_array($body) ? $body : [];
}
