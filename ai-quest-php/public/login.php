<?php
require_once '../includes/auth.php';
require_once '../config/database.php';

if (is_logged_in()) {
    header('Location: dashboard.php');
    exit;
}

$errors = [];
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($email === '' || $password === '') {
        $errors[] = 'Email and password are required.';
    } else {
        $stmt = $pdo->prepare('SELECT id, name, password_hash FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // password_verify() checks the plain password the user just typed
        // against the stored hash. It does the same hashing internally and
        // compares results — the plain password is never stored anywhere.
        //
        // We check `$user &&` first so that if no row was found, PHP never
        // even tries to read $user['password_hash'] (which would error).
        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = (int) $user['id'];
            $_SESSION['user_name'] = $user['name'];
            header('Location: dashboard.php');
            exit;
        } else {
            // Deliberately vague: "wrong email OR password" — never reveal
            // which one was wrong, or you help attackers guess valid emails.
            $errors[] = 'Incorrect email or password.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Login - AI Quest</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <main class="auth-card">
        <h1>Log in to AI Quest</h1>

        <?php if (!empty($errors)): ?>
            <ul class="errors">
                <?php foreach ($errors as $error): ?>
                    <li><?= htmlspecialchars($error) ?></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>

        <form method="POST" action="login.php">
            <label>
                Email
                <input type="email" name="email" value="<?= htmlspecialchars($email) ?>" required>
            </label>

            <label>
                Password
                <input type="password" name="password" required>
            </label>

            <button type="submit">Log in</button>
        </form>

        <p>No account yet? <a href="register.php">Register</a></p>
    </main>
</body>
</html>
