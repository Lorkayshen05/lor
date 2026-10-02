<?php
require_once '../includes/auth.php';

// Wipe all session data...
$_SESSION = [];

// ...and destroy the session itself on the server.
session_destroy();

header('Location: login.php');
exit;
