// app.js
// This is a UX nicety ONLY — instant feedback before the form even submits.
// It is NOT security. A user can disable JavaScript entirely and submit
// straight to register.php, which is exactly why register.php repeats
// every one of these checks in PHP on the server.

const form = document.getElementById('register-form');

if (form) {
    form.addEventListener('submit', function (event) {
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('password_confirm').value;
        const errorBox = document.getElementById('js-error');

        if (password !== confirm) {
            event.preventDefault(); // stop the form from submitting
            errorBox.textContent = 'Passwords do not match.';
            errorBox.style.display = 'block';
        } else {
            errorBox.style.display = 'none';
        }
    });
}
