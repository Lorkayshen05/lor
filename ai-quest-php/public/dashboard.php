<?php
require_once '../includes/auth.php';
require_once '../config/database.php';

// This is the whole point of require_login(): if you're not logged in,
// you get bounced to login.php before any of this page's content loads.
require_login();

$stmt = $pdo->prepare('SELECT name, email, created_at FROM users WHERE id = ?');
$stmt->execute([current_user_id()]);
$user = $stmt->fetch();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dashboard - AI Quest</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <main class="auth-card">
        <h1>Welcome, <?= htmlspecialchars($user['name']) ?> 🎉</h1>
        <p>Email: <?= htmlspecialchars($user['email']) ?></p>
        <p>Account created: <?= htmlspecialchars($user['created_at']) ?></p>
        <p><a href="logout.php">Log out</a></p>
    </main>
</body>
</html>
