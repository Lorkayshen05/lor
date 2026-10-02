<?php
// config/database.php
// This file's only job: create ONE shared PDO connection object called $pdo.
// Every other PHP file will `require_once` this file to get access to $pdo.

// --- Your local MySQL settings. Change these to match your setup. ---
$db_host = '127.0.0.1';
$db_name = 'ai_quest';
$db_user = 'root';
$db_pass = '';         // XAMPP/MAMP default root password is often empty
$db_charset = 'utf8mb4';

$dsn = "mysql:host={$db_host};dbname={$db_name};charset={$db_charset}";

// PDO options:
//  - ERRMODE_EXCEPTION: throw real PHP exceptions on SQL errors instead of
//    silently returning false. Much easier to debug.
//  - FETCH_ASSOC: rows come back as ['column' => value] instead of numeric
//    arrays, so $row['email'] works.
//  - EMULATE_PREPARES => false: let MySQL itself prepare the statement
//    (true prepared statements), which is what actually protects against
//    SQL injection.
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {
    // In production you would log this, not echo it (never show DB details
    // to visitors). For local learning, seeing the real error is helpful.
    http_response_code(500);
    exit('Database connection failed: ' . $e->getMessage());
}
