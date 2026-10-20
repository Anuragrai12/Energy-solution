<?php
// Debugging ke liye error display ON karein
error_reporting(E_ALL);
ini_set('display_errors', '0');   // never print PHP errors into the JSON body
ini_set('log_errors', '1');

// Always answer in JSON, even when PHP crashes (uncaught exception or fatal error).
function es_fail_json($message, $file = '', $line = 0) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
    }
    echo json_encode(['status' => false, 'message' => $message, 'debug' => basename((string)$file) . ':' . $line]);
}
set_exception_handler(function ($e) {
    error_log('[api] ' . $e);
    es_fail_json($e->getMessage(), $e->getFile(), $e->getLine());
});
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        es_fail_json($err['message'], $err['file'], $err['line']);
    }
});

// CORS Headers aur Preflight Handling
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Agar browser preflight OPTIONS request bhej raha hai toh yahin rok dein
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// MySQLi Exception mode ON karein
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$host = getenv('DB_HOST') ?: 'localhost';
$user = getenv('DB_USER') ?: '';
$password = getenv('DB_PASSWORD') ?: '';
$dbname = getenv('DB_NAME') ?: '';

try {
    $conn = new mysqli($host, $user, $password, $dbname);
    $conn->set_charset("utf8mb4");
} catch (Exception $e) {
    http_response_code(200); // JSON format me error bhejne ke liye
    echo json_encode([
        "status" => false,
        "message" => "Database connection failed: " . $e->getMessage()
    ]);
    exit();
}
