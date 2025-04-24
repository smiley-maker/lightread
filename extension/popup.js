const SERVER_URL = 'http://localhost:3000';

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Theme handling
function applyTheme(theme) {
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        updateLogo(prefersDark ? 'dark' : 'light');
    } else {
        document.body.setAttribute('data-theme', theme);
        updateLogo(theme);
    }
}

// Update logo based on theme
function updateLogo(theme) {
    const logo = document.getElementById('logo');
    logo.src = theme === 'dark' ? 'logo_light.png' : 'logo.png';
}

// Close button functionality
document.getElementById('closeButton').addEventListener('click', () => {
    window.close();
});

// Load user settings and usage
async function loadUserData() {
    try {
        const { token } = await chrome.storage.local.get('token');
        if (!token) return;

        // Load settings
        const settingsResponse = await fetch(`${SERVER_URL}/user/settings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (settingsResponse.ok) {
            const settings = await settingsResponse.json();
            document.getElementById('summaryLength').value = settings.preferred_summary_length;
            document.getElementById('theme').value = settings.theme;
            applyTheme(settings.theme);
        }

        // Load usage
        const usageResponse = await fetch(`${SERVER_URL}/user/usage`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (usageResponse.ok) {
            const usage = await usageResponse.json();
            console.log(usage);
            const progress = (usage.summaries_count / 5) * 100; // Assuming 5 is the free tier limit
            document.getElementById('usageProgress').style.width = `${progress}%`;
            document.getElementById('usageText').textContent = `${usage.summaries_count}/5 summaries used today`;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Save settings
document.getElementById('saveSettings').addEventListener('click', async () => {
    try {
        const { token } = await chrome.storage.local.get('token');
        if (!token) {
            alert('Please login to save settings');
            return;
        }

        const settings = {
            preferred_summary_length: document.getElementById('summaryLength').value,
            theme: document.getElementById('theme').value
        };

        const response = await fetch(`${SERVER_URL}/user/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            throw new Error('Failed to save settings');
        }

        applyTheme(settings.theme);
        document.getElementById('settingsMessage').textContent = 'Settings saved successfully';
        setTimeout(() => {
            document.getElementById('settingsMessage').textContent = '';
        }, 3000);
    } catch (error) {
        console.error('Error saving settings:', error);
        document.getElementById('settingsMessage').textContent = 'Failed to save settings';
    }
});

// Upgrade button
document.getElementById('upgradeButton').addEventListener('click', () => {
    // TODO: Replace with actual landing page URL
    window.open('https://lightread.app/upgrade', '_blank');
});

// Theme change listener
document.getElementById('theme').addEventListener('change', (e) => {
    applyTheme(e.target.value);
});

// System theme change listener
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const theme = document.getElementById('theme').value;
    if (theme === 'system') {
        applyTheme('system');
    }
});

// Authentication
async function checkAuth() {
    const { token, user } = await chrome.storage.local.get(['token', 'user']);
    
    if (token && user) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('userEmail').textContent = user.email;
        loadUserData();
    } else {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('userInfo').style.display = 'none';
    }
}

// Login
document.getElementById('loginButton').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${SERVER_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        await chrome.storage.local.set({
            token: data.token,
            user: { email }
        });

        checkAuth();
    } catch (error) {
        document.getElementById('loginError').textContent = error.message;
    }
});

// Signup
document.getElementById('signupButton').addEventListener('click', async () => {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        document.getElementById('signupError').textContent = 'Passwords do not match';
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Signup failed');
        }

        const data = await response.json();
        await chrome.storage.local.set({
            token: data.token,
            user: { email }
        });

        checkAuth();
    } catch (error) {
        document.getElementById('signupError').textContent = error.message;
    }
});

// Toggle between login and signup forms
document.getElementById('showSignup').addEventListener('click', () => {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
});

document.getElementById('showLogin').addEventListener('click', () => {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
});

// Logout
document.getElementById('logoutButton').addEventListener('click', async () => {
    await chrome.storage.local.remove(['token', 'user']);
    checkAuth();
});

// Initialize
console.log('Popup initialized');
checkAuth();

chrome.storage.session.get(['session', 'jwtToken'], (result) => {
  if (result.session && result.jwtToken) {
    // Restore the session
    chrome.storage.local.set({
      token: result.jwtToken,
      user: result.session
    });
    checkAuth();
  }
}); 