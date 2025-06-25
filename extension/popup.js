// Import configuration
import config from './config.js';

// Use the SERVER_URL from config
const SERVER_URL = config.SERVER_URL;

// Helper function to show error messages
function showError(message) {
  const errorElement = document.getElementById('errorMessage');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    // Hide error after 5 seconds
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

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
async function fetchDropdownOptions() {
  try {
    const { token } = await chrome.storage.local.get('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${SERVER_URL}/rpc/get_enum_values`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dropdown options: ${response.status}`);
    }

    const data = await response.json();
    
    // Process the enum values into our options format
    const options = {
      summary_length: [],
      summary_tone: [],
      summary_difficulty: []
    };

    // Map the enum data to our options
    data.forEach(item => {
      if (item.enum_name === 'summary_length') {
        options.summary_length = item.enum_values;
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

// Function to get user data from backend (no caching)
async function getUserData() {
  try {
    const { token } = await chrome.storage.local.get('token');
    console.log('Token found:', !!token);
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    // First get user limits
    const limitsResponse = await fetch(`${SERVER_URL}/user/limits`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      mode: 'cors',
      credentials: 'include'
    });
    
    if (!limitsResponse.ok) {
      throw new Error(`Failed to fetch user limits: ${limitsResponse.status}`);
    }
    
    const limitsData = await limitsResponse.json();
    console.log('Limits data:', limitsData);

    // Then get user settings
    const settingsResponse = await fetch(`${SERVER_URL}/user/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      mode: 'cors',
      credentials: 'include'
    });

    if (!settingsResponse.ok) {
      throw new Error(`Failed to fetch user settings: ${settingsResponse.status}`);
    }

    const settingsData = await settingsResponse.json();
    console.log('Settings data:', settingsData);

    // Get today's usage
    const usageResponse = await fetch(`${SERVER_URL}/user/usage`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      mode: 'cors',
      credentials: 'include'
    });

    if (!usageResponse.ok) {
      throw new Error(`Failed to fetch user usage: ${usageResponse.status}`);
    }

    const usageData = await usageResponse.json();
    console.log('Usage data:', usageData);
    
    // Combine all data
    const combinedData = {
      ...limitsData,
      settings: settingsData,
      usage: usageData
    };
    
    return combinedData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}

// Function to update UI with user data
async function updateUI() {
  try {
    console.log('Updating UI...');
    const userData = await getUserData();
    console.log('User data received:', userData);
    
    // Update plan information
    const userPlanElement = document.getElementById('userPlan');
    if (userPlanElement) {
      const planType = userData.plan_type || 'Free';
      userPlanElement.textContent = planType;
      console.log('Updated plan info:', planType);
    }
    
    // Update daily limit
    const dailyLimitElement = document.getElementById('dailyLimit');
    if (dailyLimitElement) {
      const limit = userData.daily_summaries || 5;
      dailyLimitElement.textContent = limit;
      console.log('Updated daily limit:', limit);
    }

    // Update max text length
    const maxTextLengthElement = document.getElementById('maxTextLength');
    if (maxTextLengthElement) {
      const maxLength = userData.max_text_length || 10000;
      maxTextLengthElement.textContent = maxLength;
      console.log('Updated max text length:', maxLength);
    }

    // Update usage display
    const usageTextElement = document.getElementById('usageText');
    const usageProgressElement = document.getElementById('usageProgress');
    if (usageTextElement && usageProgressElement) {
      const used = userData.usage?.summaries_count || 0;
      const limit = userData.daily_summaries || 5;
      const percentage = Math.min((used / limit) * 100, 100);
      
      usageTextElement.textContent = `${used}/${limit} summaries used today`;
      usageProgressElement.style.width = `${percentage}%`;
      console.log('Updated usage:', { used, limit, percentage });
    }

    // Update settings dropdowns
    if (userData.settings) {
      // Get available options
      const options = await fetchDropdownOptions();
      console.log('Dropdown options:', options);

      // Update summary length dropdown
      const summaryLengthSelect = document.getElementById('summaryLength');
      if (summaryLengthSelect && options?.summary_length) {
        summaryLengthSelect.innerHTML = '';
        options.summary_length.forEach(length => {
          const option = document.createElement('option');
          option.value = length;
          option.textContent = length;
          if (length === userData.settings.preferred_summary_length) {
            option.selected = true;
          }
          summaryLengthSelect.appendChild(option);
        });
      }

      // Update theme dropdown
      const themeSelect = document.getElementById('theme');
      if (themeSelect) {
        themeSelect.innerHTML = `
          <option value="light" ${userData.settings.theme === 'light' ? 'selected' : ''}>Light</option>
          <option value="dark" ${userData.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
          <option value="system" ${userData.settings.theme === 'system' ? 'selected' : ''}>System</option>
        `;
      }

      // Update summary tone dropdown (pro only)
      const summaryToneSelect = document.getElementById('summaryTone');
      if (summaryToneSelect && options?.summary_tone) {
        summaryToneSelect.innerHTML = '';
        options.summary_tone.forEach(tone => {
          const option = document.createElement('option');
          option.value = tone;
          option.textContent = tone.charAt(0).toUpperCase() + tone.slice(1);
          if (tone === userData.settings.summary_tone) {
            option.selected = true;
          }
          summaryToneSelect.appendChild(option);
        });
      }

      // Update summary difficulty dropdown (pro only)
      const summaryDifficultySelect = document.getElementById('summaryDifficulty');
      if (summaryDifficultySelect && options?.summary_difficulty) {
        summaryDifficultySelect.innerHTML = '';
        options.summary_difficulty.forEach(difficulty => {
          const option = document.createElement('option');
          option.value = difficulty;
          option.textContent = difficulty;
          if (difficulty === userData.settings.summary_difficulty) {
            option.selected = true;
          }
          summaryDifficultySelect.appendChild(option);
        });
      }

      // Update save source URL dropdown
      const saveSourceUrlSelect = document.getElementById('saveSourceUrl');
      if (saveSourceUrlSelect) {
        saveSourceUrlSelect.value = userData.settings.save_source_url ? 'true' : 'false';
      }

      // Apply theme
      applyTheme(userData.settings.theme);
      console.log('Updated theme:', userData.settings.theme);
    }

    // Show/hide pro-only settings
    const proOnlyElements = document.querySelectorAll('.pro-only');
    const isPro = userData.plan_type === 'pro' || userData.plan_type === 'enterprise';
    proOnlyElements.forEach(element => {
      element.style.display = isPro ? 'block' : 'none';
    });
    
  } catch (error) {
    console.error('Error updating UI:', error);
    // If we get an auth error, show the login screen
    if (error.message.includes('Session expired') || error.message.includes('No authentication token')) {
      updateUIForAuthState(false);
    } else {
      showError('Failed to load user data. Please try again.');
    }
  }
}

// Listen for token refresh events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOKEN_REFRESHED') {
    // Force refresh user data when token is refreshed
    updateUI();
  }
});

// Initialize popup - always fetch fresh data
document.addEventListener('DOMContentLoaded', () => {
  // First check if user is authenticated, then update UI
  checkAuth();
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

// Authentication - check with backend
async function checkAuth() {
    const { token, user } = await chrome.storage.local.get(['token', 'user']);
    
    if (token && user) {
        try {
            // Try to get user data from backend to verify token is still valid
            await getUserData();
            
            // If we get here, token is valid
            document.getElementById('userEmail').textContent = user.email;
            updateUIForAuthState(true);
            updateUI();
        } catch (error) {
            console.error('Token validation failed:', error);
            // Token is invalid, clear storage and show login
            await chrome.storage.local.remove(['token', 'user']);
            chrome.runtime.sendMessage({ type: 'SESSION_CLEAR' });
            updateUIForAuthState(false);
        }
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
});

// Listen for refresh usage message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_USAGE') {
    updateUI();
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