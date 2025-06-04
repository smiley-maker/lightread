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

// Cache for user data
let userDataCache = {
  data: null,
  timestamp: null,
  maxAge: 5 * 60 * 1000 // 5 minutes
};

// Function to get user data with caching
async function getUserData(forceRefresh = false) {
  const now = Date.now();
  
  // Return cached data if it's still valid and not forcing refresh
  if (!forceRefresh && userDataCache.data && userDataCache.timestamp && 
      (now - userDataCache.timestamp) < userDataCache.maxAge) {
    return userDataCache.data;
  }
  
  try {
    const response = await fetch(`${SERVER_URL}/api/user`, {
      headers: {
        'Authorization': `Bearer ${authState.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update cache
    userDataCache = {
      data: data,
      timestamp: now
    };
    
    return data;
  } catch (error) {
    console.error('Error fetching user data:', error);
    // Return cached data if available, even if expired
    if (userDataCache.data) {
      return userDataCache.data;
    }
    throw error;
  }
}

// Function to update UI with user data
async function updateUI() {
  try {
    const userData = await getUserData();
    
    // Update plan information
    const planElement = document.getElementById('plan-info');
    if (planElement) {
      planElement.textContent = `Current Plan: ${userData.plan || 'Free'}`;
    }
    
    // Update preferences
    const preferences = userData.settings?.preferences || {};
    updateTheme(preferences.theme || 'system');
    
    // Update summary limits
    const limitsElement = document.getElementById('summary-limits');
    if (limitsElement) {
      const used = userData.summaries_today || 0;
      const limit = userData.daily_summary_limit || 5;
      limitsElement.textContent = `Summaries Today: ${used}/${limit}`;
    }
    
  } catch (error) {
    console.error('Error updating UI:', error);
    showError('Failed to load user data. Please try again.');
  }
}

// Listen for token refresh events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOKEN_REFRESHED') {
    // Force refresh user data when token is refreshed
    updateUI(true);
  }
});

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
});

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
    window.open('https://www.lightread.xyz/dashboard/billing', '_blank');
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
        updateUI();
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
    updateUI(true);
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