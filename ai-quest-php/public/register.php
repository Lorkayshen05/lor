<?php
require_once '../includes/auth.php';
require_once '../config/database.php';

// Already logged in? No need to register again.
if (is_logged_in()) {
    header('Location: dashboard.php');
    exit;
}

$errors = [];
$name = '';
$email = '';

// $_SERVER['REQUEST_METHOD'] tells us if the browser is just viewing the
// page (GET) or submitting the form (POST). We only try to save data on POST.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // trim() removes accidental leading/trailing spaces (e.g. " bob@x.com ")
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $password_confirm = $_POST['password_confirm'] ?? '';

    // --- Server-side validation. NEVER trust $_POST — always re-check here,
    // even if JavaScript already checked in the browser (JS can be bypassed
    // by anyone using curl/Postman or editing the page). ---
    if ($name === '') {
        $errors[] = 'Name is required.';
    }

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address.';
    }

    if (strlen($password) < 8) {
        $errors[] = 'Password must be at least 8 characters.';
    }

    if ($password !== $password_confirm) {
        $errors[] = 'Passwords do not match.';
    }

    // Only hit the database if the basic checks already passed.
    if (empty($errors)) {
        // Check if this email is already registered.
        // The "?" is a placeholder — PDO sends the email value SEPARATELY
        // from the SQL text, so it can never be interpreted as SQL code.
        // This is what "prepared statement" means and is THE defense
        // against SQL injection.
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);

        if ($stmt->fetch()) {
            $errors[] = 'An account with that email already exists.';
        } else {
            // password_hash() turns "mypassword123" into something like
            // "$2y$10$abcdefg..." — a one-way hash. You CANNOT reverse this
            // back into the original password. PASSWORD_DEFAULT currently
            // means bcrypt, and PHP will automatically use a stronger
            // algorithm in the future if one becomes the new default.
            $hash = password_hash($password, PASSWORD_DEFAULT);

            $stmt = $pdo->prepare(
                'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
            );
            $stmt->execute([$name, $email, $hash]);

            // Log the new user in immediately: grab the id MySQL just
            // generated via AUTO_INCREMENT.
            $_SESSION['user_id'] = (int) $pdo->lastInsertId();

            header('Location: dashboard.php');
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Register - AI Quest</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <main class="auth-card">
        <h1>Create your account</h1>

        <?php if (!empty($errors)): ?>
            <ul class="errors">
                <?php foreach ($errors as $error): ?>
                    <!-- htmlspecialchars() escapes <, >, ", ' so if a user's
                         error text ever contained HTML, it shows as text
                         instead of being rendered (prevents XSS). -->
                    <li><?= htmlspecialchars($error) ?></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>

        <form method="POST" action="register.php" id="register-form">
            <label>
                Name
                <input type="text" name="name" value="<?= htmlspecialchars($name) ?>" required>
            </label>

            <label>
                Email
                <input type="email" name="email" value="<?= htmlspecialchars($email) ?>" required>
            </label>

            <label>
                Password
                <input type="password" name="password" id="password" minlength="8" required>
            </label>

            <label>
                Confirm Password
                <input type="password" name="password_confirm" id="password_confirm" minlength="8" required>
            </label>

            <p id="js-error" class="errors" style="display:none;"></p>

            <button type="submit">Register</button>
        </form>

        <p>Already have an account? <a href="login.php">Log in</a></p>
    </main>

    <script src="assets/js/app.js"></script>
</body>
</html>
