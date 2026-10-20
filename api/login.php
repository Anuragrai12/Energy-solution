<?php
require_once 'db.php';
require_once 'reports_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    report_json(false, 'Method not allowed.', null, 405);
}

$body = report_read_body();
$user = report_current_user($conn, $body);
report_json(true, 'Login successful.', $user);
