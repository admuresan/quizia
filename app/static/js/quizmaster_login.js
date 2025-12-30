// Quizmaster login page
document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const requestBtn = document.getElementById('request-account-btn');
    const messageDiv = document.getElementById('message');

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = type;
        messageDiv.style.display = 'block';
    }

    loginBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showMessage('Please enter username and password', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/quizmaster';
                }, 1000);
            } else {
                showMessage(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            showMessage('Error connecting to server', 'error');
        }
    });

    requestBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showMessage('Please enter username and password', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Account request submitted. Waiting for approval.', 'success');
            } else {
                showMessage(data.error || 'Request failed', 'error');
            }
        } catch (error) {
            showMessage('Error connecting to server', 'error');
        }
    });
});


