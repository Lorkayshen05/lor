<?php
// includes/auth.php
// Reusable session helpers. Every page that cares about "who is logged in"
// will require_once this file.

// session_start() must run before ANY HTML output, because sessions work by
// sending a cookie in the HTTP response headers. If you echo/print anything
// first, PHP can't add headers anymore and you'll get a warning.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Is anyone logged in right now?
 * We only ever store the user's id in the session — never the password,
 * never the whole user row. Keep sessions small.
 */
function is_logged_in(): bool
{
    return isset($_SESSION['user_id']);
}

/**
 * Get the logged-in user's id, or null if nobody is logged in.
 */
function current_user_id(): ?int
{
    return $_SESSION['user_id'] ?? null;
}

/**
 * Call this at the top of any page that REQUIRES login (e.g. dashboard.php).
 * If nobody is logged in, send them to login.php and stop executing.
 */
function require_login(): void
{
    if (!is_logged_in()) {
        header('Location: login.php');
        exit; // IMPORTANT: always exit after header('Location: ...')
              // otherwise the rest of the page keeps running on the server.
    }
}
