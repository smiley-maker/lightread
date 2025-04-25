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

// Function to fetch dropdown options
async function fetchDropdownOptions(token) {
    try {
        // Get enum values from Supabase
        const response = await fetch(`${SERVER_URL}/rpc/get_enum_values`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch enum values: ${response.status}`);
        }

        const enumData = await response.json();
        
        // Process the enum values into our options format
        const options = {
            summary_length: [],
            theme_type: [],
            summary_tone: [],
            summary_difficulty: []
        };

        // Map the enum data to our options
        enumData.forEach(item => {
            if (item.enum_name === 'summary_length') {
                options.summary_length = item.enum_values;
            } else if (item.enum_name === 'theme_type') {
                options.theme_type = item.enum_values;
            } else if (item.enum_name === 'summary_tone') {
                options.summary_tone = item.enum_values;
            } else if (item.enum_name === 'summary_difficulty') {
                options.summary_difficulty = item.enum_values;
            }
        });

        return options;
    } catch (error) {
        console.error('Error fetching dropdown options:', error);
        return null;
    }
}

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
            
            // Load dropdown options
            const options = await fetchDropdownOptions(token);
            if (options) {
                // Populate summary length options from enum
                const summaryLengthSelect = document.getElementById('summaryLength');
                summaryLengthSelect.innerHTML = options.summary_length.map(length => 
                    `<option value="${length}">${length.charAt(0).toUpperCase() + length.slice(1)}</option>`
                ).join('');
                summaryLengthSelect.value = settings.preferred_summary_length;

                // Populate theme options from enum
                const themeSelect = document.getElementById('theme');
                themeSelect.innerHTML = options.theme_type.map(theme => 
                    `<option value="${theme}">${theme.charAt(0).toUpperCase() + theme.slice(1)}</option>`
                ).join('');
                themeSelect.value = settings.theme;

                // Populate summary tone options from enum
                const summaryToneSelect = document.getElementById('summaryTone');
                summaryToneSelect.innerHTML = options.summary_tone.map(tone => 
                    `<option value="${tone}">${tone.charAt(0).toUpperCase() + tone.slice(1)}</option>`
                ).join('');
                summaryToneSelect.value = settings.summary_tone;

                // Populate summary difficulty options from enum
                const summaryDifficultySelect = document.getElementById('summaryDifficulty');
                summaryDifficultySelect.innerHTML = options.summary_difficulty.map(difficulty => 
                    `<option value="${difficulty}">${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</option>`
                ).join('');
                summaryDifficultySelect.value = settings.summary_difficulty;

                applyTheme(settings.theme);
            }
        }

        // Load user limits (includes plan type)
        const limitsResponse = await fetch(`${SERVER_URL}/user/limits`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (limitsResponse.ok) {
            const limits = await limitsResponse.json();
            // Store the plan type and daily limit for later use
            window.userPlan = {
                type: limits.plan_type,
                dailyLimit: limits.daily_summaries
            };
            
            // Update plan text in account tab
            document.getElementById('userPlan').textContent = limits.plan_type.charAt(0).toUpperCase() + limits.plan_type.slice(1);
            
            // Show/hide pro-only settings and upgrade button
            const proOnlyElements = document.querySelectorAll('.pro-only');
            const upgradeButton = document.getElementById('upgradeButton');
            if (limits.plan_type === 'pro') {
                proOnlyElements.forEach(el => el.style.display = 'block');
                upgradeButton.style.display = 'none';
            } else {
                proOnlyElements.forEach(el => el.style.display = 'none');
                upgradeButton.style.display = 'block';
            }
        }

        // Load usage
        const usageResponse = await fetch(`${SERVER_URL}/user/usage`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (usageResponse.ok) {
            const usage = await usageResponse.json();
            const dailyLimit = window.userPlan?.dailyLimit || 5; // Fallback to 5 if not loaded
            const progress = (usage.summaries_count / dailyLimit) * 100;
            document.getElementById('usageProgress').style.width = `${progress}%`;
            document.getElementById('usageText').textContent = `${usage.summaries_count}/${dailyLimit} summaries used today`;
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
            theme: document.getElementById('theme').value,
            summary_tone: document.getElementById('summaryTone').value,
            summary_difficulty: document.getElementById('summaryDifficulty').value
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
    const theme = e.target.value;
    applyTheme(theme);
    // Send theme change to background script
    chrome.runtime.sendMessage({ type: 'THEME_CHANGE', theme });
});

// System theme change listener
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const theme = document.getElementById('theme').value;
    if (theme === 'system') {
        applyTheme('system');
        // Send theme change to background script
        chrome.runtime.sendMessage({ type: 'THEME_CHANGE', theme: 'system' });
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