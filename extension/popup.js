// Import configuration
import config from './config.js';

// Use the SERVER_URL from config
const SERVER_URL = config.SERVER_URL;

// Helper function for fetch requests with proper CORS and error handling
async function fetchWithAuth(endpoint, options = {}) {
  const { token } = await chrome.storage.local.get('token');
  
  // Default headers with auth token if available
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  // Merge options with defaults
  const fetchOptions = {
    ...options,
    headers,
    mode: 'cors',
    credentials: 'same-origin'
  };

  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, fetchOptions);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, try to refresh
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          // Try again with new token
          return fetchWithAuth(endpoint, options);
        } else {
          throw new Error('Session expired. Please login again.');
        }
      }
      
      // Try to parse error message from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Request failed with status: ${response.status}`);
      } catch (parseError) {
        throw new Error(`Request failed with status: ${response.status}`);
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// Helper function to refresh token
async function refreshToken() {
  try {
    const { token } = await chrome.storage.local.get('token');
    if (!token) return false;
    
    const response = await fetch(`${SERVER_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      mode: 'cors',
      credentials: 'same-origin'
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    await chrome.storage.local.set({ token: data.token });
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

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
        const enumData = await fetchWithAuth('/rpc/get_enum_values', {
            method: 'POST'
        });
        
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
        const settings = await fetchWithAuth('/user/settings');
        
        // Load dropdown options
        const options = await fetchDropdownOptions(token);
        if (options) {
            // Populate summary length options from enum
            const summaryLengthSelect = document.getElementById('summaryLength');
            summaryLengthSelect.innerHTML = options.summary_length.map(length => 
                `<option value="${length}">${length}</option>`
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

            // Set save source URL setting
            const saveSourceUrlSelect = document.getElementById('saveSourceUrl');
            saveSourceUrlSelect.value = settings.save_source_url ? 'true' : 'false';

            applyTheme(settings.theme);
        }

        // Load user limits (includes plan type)
        const limits = await fetchWithAuth('/user/limits');
        
        console.log('Received limits:', limits); // Debug log
        
        // Store the plan type and daily limit for later use
        window.userPlan = {
            type: limits?.plan_type || 'free',
            dailyLimit: limits?.daily_summaries || 5,
            maxTextLength: limits?.max_text_length || 10000
        };
        
        // Update plan text in account tab with null check
        const planType = limits?.plan_type || 'free';
        document.getElementById('userPlan').textContent = planType.charAt(0).toUpperCase() + planType.slice(1);
        
        // Update plan limits display with null checks
        document.getElementById('dailyLimit').textContent = limits?.daily_summaries || 5;
        document.getElementById('maxTextLength').textContent = (limits?.max_text_length || 10000).toLocaleString();
        
        // Show/hide pro-only settings and upgrade button
        const proOnlyElements = document.querySelectorAll('.pro-only');
        const upgradeButton = document.getElementById('upgradeButton');
        if (planType === 'pro') {
            proOnlyElements.forEach(el => {
                el.style.display = 'block';
                // Enable all selects inside pro-only elements
                el.querySelectorAll('select').forEach(sel => sel.disabled = false);
            });
            upgradeButton.style.display = 'none';
        } else {
            proOnlyElements.forEach(el => {
                el.style.display = 'none';
                // Disable all selects inside pro-only elements
                el.querySelectorAll('select').forEach(sel => sel.disabled = true);
            });
            upgradeButton.style.display = 'block';
        }
        // Ensure all non-pro-only selects are enabled for free users
        document.querySelectorAll('.settings-option:not(.pro-only) select').forEach(sel => sel.disabled = false);

        // Load usage
        const usage = await fetchWithAuth('/user/usage');
        
        const dailyLimit = window.userPlan?.dailyLimit || 5; // Fallback to 5 if not loaded
        const progress = (usage.summaries_count / dailyLimit) * 100;
        document.getElementById('usageProgress').style.width = `${progress}%`;
        document.getElementById('usageText').textContent = `${usage.summaries_count}/${dailyLimit} summaries used today`;
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Save settings
document.getElementById('saveSettings').addEventListener('click', async () => {
    try {
        const saveButton = document.getElementById('saveSettings');
        const settingsMessage = document.getElementById('settingsMessage');
        
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        settingsMessage.textContent = '';
        
        const settings = {
            preferred_summary_length: document.getElementById('summaryLength').value,
            theme: document.getElementById('theme').value,
            summary_tone: document.getElementById('summaryTone').value,
            summary_difficulty: document.getElementById('summaryDifficulty').value,
            save_source_url: document.getElementById('saveSourceUrl').value === 'true'
        };

        await fetchWithAuth('/user/settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        });

        // Apply theme immediately after successful save
        applyTheme(settings.theme);
        
        // Show success message
        settingsMessage.textContent = 'Settings saved successfully';
        settingsMessage.style.color = 'var(--success-color, #4CAF50)';
        
        // Notify background script of theme change
        chrome.runtime.sendMessage({ 
            type: 'THEME_CHANGE', 
            theme: settings.theme 
        });

    } catch (error) {
        console.error('Error saving settings:', error);
        const settingsMessage = document.getElementById('settingsMessage');
        settingsMessage.textContent = error.message || 'Failed to save settings';
        settingsMessage.style.color = 'var(--error-color, #f44336)';
    } finally {
        const saveButton = document.getElementById('saveSettings');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Settings';
        
        // Clear message after 3 seconds
        setTimeout(() => {
            document.getElementById('settingsMessage').textContent = '';
        }, 3000);
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

// Helper to decode JWT and get payload
function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        // Add padding if needed
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Show welcome screen or authenticated content based on auth state
function updateUIForAuthState(isAuthenticated) {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const authenticatedContent = document.getElementById('authenticatedContent');
    const loginForm = document.getElementById('loginForm');
    
    if (isAuthenticated) {
        welcomeScreen.style.display = 'none';
        loginForm.style.display = 'none';
        authenticatedContent.style.display = 'block';
    } else {
        welcomeScreen.style.display = 'block';
        loginForm.style.display = 'none';
        authenticatedContent.style.display = 'none';
    }
}

// Authentication
async function checkAuth() {
    const { token, user } = await chrome.storage.local.get(['token', 'user']);
    
    if (token && user) {
        // Decode token expiry
        const payload = decodeJwt(token);
        const now = Math.floor(Date.now() / 1000);
        let validToken = true;
        if (payload && payload.exp && payload.exp < now) {
            // Token expired, try to refresh
            try {
                const response = await fetchWithAuth('/auth/refresh', { method: 'POST' });
                if (response && response.token) {
                    await chrome.storage.local.set({ token: response.token });
                    // Also notify the background script
                    chrome.runtime.sendMessage({ 
                        type: 'SESSION_UPDATE', 
                        jwtToken: response.token,
                        session: { email: user.email }
                    });
                } else {
                    validToken = false;
                }
            } catch (e) {
                validToken = false;
            }
        }
        if (!validToken) {
            // Refresh failed, clear storage and show login
            await chrome.storage.local.remove(['token', 'user']);
            chrome.runtime.sendMessage({ type: 'SESSION_CLEAR' });
            updateUIForAuthState(false);
            return;
        }
        // Token is valid, show user info
        document.getElementById('userEmail').textContent = user.email;
        updateUIForAuthState(true);
        loadUserData();
    } else {
        updateUIForAuthState(false);
    }
}

// Login button click handler (shows login form)
document.getElementById('loginButton').addEventListener('click', () => {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
});

// Signup button click handler (redirects to landing page)
document.getElementById('signupButton').addEventListener('click', () => {
    chrome.tabs.create({ url: "https://lightread.xyz" });
});

// Login form submission
document.getElementById('loginSubmitButton').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');
    loginError.textContent = '';

    if (!email || !password) {
        loginError.textContent = 'Please enter both email and password';
        return;
    }

    try {
        document.getElementById('loginSubmitButton').disabled = true;
        document.getElementById('loginSubmitButton').textContent = 'Logging in...';
        
        const response = await fetch(`${SERVER_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            mode: 'cors',
            credentials: 'same-origin'
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

        // Also notify the background script
        chrome.runtime.sendMessage({ 
            type: 'SESSION_UPDATE', 
            jwtToken: data.token,
            session: { email }
        });

        checkAuth();
    } catch (error) {
        loginError.textContent = error.message || 'Login failed. Please try again.';
    } finally {
        document.getElementById('loginSubmitButton').disabled = false;
        document.getElementById('loginSubmitButton').textContent = 'Login';
    }
});

// Logout
document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
        const logoutButton = document.getElementById('logoutButton');
        logoutButton.disabled = true;
        logoutButton.textContent = 'Logging out...';
        
        // Clear storage
        await chrome.storage.local.remove(['token', 'user']);
        
        // Notify background script
        chrome.runtime.sendMessage({ type: 'SESSION_CLEAR' });
        
        checkAuth();
    } catch (error) {
        console.error('Error during logout:', error);
    } finally {
        const logoutButton = document.getElementById('logoutButton');
        logoutButton.disabled = false;
        logoutButton.textContent = 'Logout';
    }
});

// Setup event listener for signup link
document.addEventListener("DOMContentLoaded", function() {
    const signupLink = document.getElementById("goToSignup");
    if (signupLink) {
        signupLink.addEventListener("click", function(event) {
            chrome.tabs.create({ url: "https://lightread.xyz" });
        });
    }

    checkAuth();
});

// Listen for refresh usage message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_USAGE') {
    loadUserData();
  }
});

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