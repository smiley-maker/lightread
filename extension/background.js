// Move background.js to extension directory

// Import configuration
import config from './config.js';

// Constants
const SERVER_URL = config.SERVER_URL;

// Auth state management
let authState = {
  isLoggedIn: false,
  token: null,
  user: null
};

// Load auth state from storage
chrome.storage.local.get(['token', 'user'], (result) => {
  if (result.token && result.user) {
    authState = {
      isLoggedIn: true,
      token: result.token,
      user: result.user
    };
  }
});

// Listen for auth state changes from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH_STATE_CHANGE') {
    authState = request.authState;
    sendResponse({ success: true });
  } else if (request.type === 'THEME_CHANGE') {
    // Update theme for all open popups
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: updateTheme,
          args: [request.theme]
        }).catch(err => console.error('Error executing theme change:', err));
      });
    });
    sendResponse({ success: true });
  } else if (request.type === 'REFRESH_TOKEN') {
    // Handle token refresh request
    refreshToken()
      .then(success => {
        sendResponse({ 
          success: success, 
          token: success ? authState.token : null 
        });
      })
      .catch(error => {
        console.error('Error refreshing token:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates we'll respond asynchronously
  } else if (request.type === 'REFRESH_USAGE') {
    // We don't need to do anything here, just acknowledge
    sendResponse({ success: true });
  }
  
  // For sync responses, return true if handled
  return true;
});

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizeText",
    title: "Summarize with LightRead",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarizeText" && info.selectionText) {
    try {
      // Check auth state
      if (!authState.isLoggedIn) {
        // Try to load auth state from storage
        const { token, user } = await chrome.storage.local.get(['token', 'user']);
        if (token && user) {
          authState = {
            isLoggedIn: true,
            token: token,
            user: user
          };
        } else {
          throw new Error('Please login to use LightRead');
        }
      }

      // Get user settings for summary preferences
      const settings = await getUserSettings();
      const summaryLength = settings?.preferred_summary_length || 'medium';

      const response = await fetch(`${SERVER_URL}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`
        },
        body: JSON.stringify({
          text: info.selectionText,
          source_url: tab.url,
          length: summaryLength
        }),
        mode: 'cors',
        credentials: 'same-origin'
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = await refreshToken();
          if (refreshed) {
            // Retry the request with new token
            return chrome.contextMenus.onClicked.dispatch(info, tab);
          }
          throw new Error('Session expired. Please login again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data = await response.json();
      
      // Prepare summary data
      const summaryData = {
        ...data,
        source_url: tab.url,
        character_count: info.selectionText.length
      };

      // Show the summary popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: showSummaryPopup,
        args: [
          data.summary, 
          chrome.runtime.getURL("logo.png"), 
          {
            ...summaryData,
            original_text: info.selectionText
          },
          authState.token,
          SERVER_URL
        ]
      });

    } catch (error) {
      console.error("Error:", error);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: showErrorPopup,
        args: [error.message]
      });
    }
  }
});

// Function to refresh the auth token
async function refreshToken() {
  try {
    const response = await fetch(`${SERVER_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authState.token}`
      },
      // Add CORS mode to allow for better error handling
      mode: 'cors',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Auth refresh endpoint not found - this is expected in development');
        return false;
      }
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();
    authState.token = data.token;
    await chrome.storage.local.set({ token: data.token });
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    // Clear auth state on refresh failure
    authState = { isLoggedIn: false, token: null, user: null };
    await chrome.storage.local.remove(['token', 'user']);
    return false;
  }
}

// Function to get user settings
async function getUserSettings() {
  try {
    const response = await fetch(`${SERVER_URL}/user/settings`, {
      headers: {
        'Authorization': `Bearer ${authState.token}`
      },
      // Add CORS mode to allow for better error handling
      mode: 'cors', 
      credentials: 'same-origin'
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          return getUserSettings();
        }
      }
      throw new Error(`Failed to get user settings: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting user settings:', error);
    // Return default settings instead of null
    return {
      preferred_summary_length: 'medium',
      theme: 'light',
      summary_tone: 'neutral',
      summary_difficulty: 'normal',
      save_source_url: true
    };
  }
}

// Function to show the summary popup
function showSummaryPopup(summary, logoUrl, summaryData, token, serverUrl) {
  // Remove any existing popups
  const existingPopup = document.getElementById('lightread-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'lightread-popup';
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: var(--background-color, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 16px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    max-width: 400px;
    width: 90%;
    color: var(--text-color, #333);
  `;

  // Add header with logo and close button
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
  
  // Add logo
  const logo = document.createElement('img');
  logo.id = 'lightread-logo';
  logo.style.cssText = 'width: 120px;';
  logo.src = logoUrl; // Set default logo
  header.appendChild(logo);

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: var(--text-color, #333);
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  `;
  closeButton.onclick = () => {
    // Clear summary data
    summaryData = null;
    
    // Stop any ongoing speech
    if (speechSynthesis && isSpeaking) {
      speechSynthesis.cancel();
    }
    
    // Remove popup
    popup.remove();
  };

  // Add click handler for clicks outside the popup
  document.addEventListener('click', (event) => {
    if (!popup.contains(event.target)) {
      // Clear summary data
      summaryData = null;
      
      // Stop any ongoing speech
      if (speechSynthesis && isSpeaking) {
        speechSynthesis.cancel();
      }
      
      // Remove popup
      popup.remove();
    }
  });

  header.appendChild(closeButton);

  popup.appendChild(header);

  // Add summary text
  const summaryText = document.createElement('div');
  summaryText.textContent = summary;
  summaryText.style.cssText = `
    margin-bottom: 16px;
    max-height: 200px;
    overflow-y: auto;
    line-height: 1.5;
  `;
  popup.appendChild(summaryText);

  // Add buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 16px;';

  // Add copy button
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy';
  copyButton.style.cssText = `
    background-color: var(--primary-color, #BAA5FF);
    color: black;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    flex: 1;
  `;
  copyButton.onclick = () => {
    navigator.clipboard.writeText(summaryText.textContent);
    copyButton.textContent = 'Copied!';
    setTimeout(() => copyButton.textContent = 'Copy', 2000);
  };

  // Add text-to-speech button
  const speakButton = document.createElement('button');
  speakButton.textContent = 'Listen';
  speakButton.style.cssText = `
    background-color: var(--primary-color, #BAA5FF);
    color: black;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    flex: 1;
  `;
  
  // TTS state variables
  let isSpeaking = false;
  let speechSynthesis = window.speechSynthesis;
  let speechUtterance = null;
  
  speakButton.onclick = () => {
    if (isSpeaking) {
      // Stop speaking
      speechSynthesis.cancel();
      speakButton.textContent = 'Listen';
      isSpeaking = false;
    } else {
      // Start speaking
      speechUtterance = new SpeechSynthesisUtterance(summaryText.textContent);
      
      // Set speaking state and button text
      isSpeaking = true;
      speakButton.textContent = 'Stop';
      
      // When speech ends
      speechUtterance.onend = () => {
        isSpeaking = false;
        speakButton.textContent = 'Listen';
      };
      
      // When speech errors
      speechUtterance.onerror = () => {
        isSpeaking = false;
        speakButton.textContent = 'Listen';
      };
      
      // Start speaking
      speechSynthesis.speak(speechUtterance);
    }
  };

  // Add save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.style.cssText = `
    background-color: var(--secondary-color, #4CAF50);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    flex: 1;
  `;
  saveButton.onclick = async () => {
    try {
      // Set button to loading state
      saveButton.textContent = 'Saving...';
      saveButton.disabled = true;
      
      let settings = { save_source_url: true }; // Default value
      
      try {
        // Get user settings to check save_source_url
        const settingsResponse = await fetch(`${serverUrl}/user/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          // Add no-cors mode as fallback
          mode: 'cors',
          credentials: 'same-origin'
        });

        if (settingsResponse.ok) {
          settings = await settingsResponse.json();
        } else {
          console.warn('Could not fetch settings, using defaults');
        }
      } catch (settingsError) {
        console.warn('Error fetching settings:', settingsError);
        // Continue with default settings
      }

      // Prepare summary data based on settings
      const dataToSave = {
        ...summaryData,
        source_url: settings.save_source_url ?? true ? summaryData.source_url : null
      };

      const response = await fetch(`${serverUrl}/summaries/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSave),
        // Add no-cors mode as fallback
        mode: 'cors',
        credentials: 'same-origin'
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token through background script
          chrome.runtime.sendMessage({ type: 'REFRESH_TOKEN' }, async (response) => {
            if (response && response.success) {
              // Re-enable button
              saveButton.textContent = 'Save';
              saveButton.disabled = false;
              // Try again with new token
              saveButton.click();
            } else {
              throw new Error('Failed to refresh token');
            }
          });
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save summary');
      }

      saveButton.textContent = 'Saved!';
      setTimeout(() => {
        saveButton.textContent = 'Save';
        saveButton.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Error saving summary:', error);
      saveButton.textContent = 'Error';
      setTimeout(() => {
        saveButton.textContent = 'Save';
        saveButton.disabled = false;
      }, 2000);
    }
  };

  buttonsContainer.appendChild(copyButton);
  buttonsContainer.appendChild(speakButton);
  buttonsContainer.appendChild(saveButton);
  popup.appendChild(buttonsContainer);

  // Add pro controls if user is pro (before buttons)
  const addProControls = async () => {
    try {
      // Get user limits to check if pro
      const limitsResponse = await fetch(`${serverUrl}/user/limits`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        // Add no-cors mode as fallback
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (!limitsResponse.ok) {
        console.warn('Failed to get user limits, status:', limitsResponse.status);
        return;
      }
      
      const limits = await limitsResponse.json();
      const isPro = limits.plan_type === 'pro' || limits.plan_type === 'enterprise';
      
      if (isPro) {
        try {
          // Get available options
          const optionsResponse = await fetch(`${serverUrl}/rpc/get_enum_values`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            // Add no-cors mode as fallback
            mode: 'cors',
            credentials: 'same-origin'
          });
          
          if (!optionsResponse.ok) {
            console.warn('Failed to get options, status:', optionsResponse.status);
            return;
          }
          
          const options = await optionsResponse.json();
          
          // Create controls container
          const controlsContainer = document.createElement('div');
          controlsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 16px 0;
            padding: 12px;
            background-color: var(--background-color-secondary, #f5f5f5);
            border-radius: 6px;
          `;
  
          // Create selects container
          const selectsContainer = document.createElement('div');
          selectsContainer.style.cssText = `
            display: flex;
            gap: 12px;
          `;
  
          // Create tone control
          const toneGroup = document.createElement('div');
          toneGroup.style.cssText = 'flex: 1;';
          
          const toneLabel = document.createElement('label');
          toneLabel.textContent = 'Tone';
          toneLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: var(--text-color-secondary, #666);';
          
          const toneSelect = document.createElement('select');
          toneSelect.style.cssText = `
            width: 100%;
            padding: 6px;
            border: 1px solid var(--border-color, #e0e0e0);
            border-radius: 4px;
            background-color: var(--background-color, #ffffff);
            color: var(--text-color, #333);
          `;
          
          // Add tone options
          const toneOptions = options.find(o => o.enum_name === 'summary_tone')?.enum_values || [];
          toneOptions.forEach(tone => {
            const option = document.createElement('option');
            option.value = tone;
            option.textContent = tone.charAt(0).toUpperCase() + tone.slice(1);
            toneSelect.appendChild(option);
          });
  
          // Create difficulty control
          const difficultyGroup = document.createElement('div');
          difficultyGroup.style.cssText = 'flex: 1;';
          
          const difficultyLabel = document.createElement('label');
          difficultyLabel.textContent = 'Difficulty';
          difficultyLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: var(--text-color-secondary, #666);';
          
          const difficultySelect = document.createElement('select');
          difficultySelect.style.cssText = `
            width: 100%;
            padding: 6px;
            border: 1px solid var(--border-color, #e0e0e0);
            border-radius: 4px;
            background-color: var(--background-color, #ffffff);
            color: var(--text-color, #333);
          `;
          
          // Add difficulty options
          const difficultyOptions = options.find(o => o.enum_name === 'summary_difficulty')?.enum_values || [];
          difficultyOptions.forEach(difficulty => {
            const option = document.createElement('option');
            option.value = difficulty;
            option.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
            difficultySelect.appendChild(option);
          });
  
          // Create update button
          const updateButton = document.createElement('button');
          updateButton.textContent = 'Update Summary';
          updateButton.style.cssText = `
            background-color: var(--primary-color, #BAA5FF);
            color: black;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 8px;
            width: 100%;
          `;
  
          // Add regenerate function
          const regenerateSummary = async (tone, difficulty) => {
            try {
              if (!summaryData.original_text) {
                throw new Error('Unable to regenerate summary: original text not available');
              }
  
              summaryText.textContent = 'Generating new summary...';
              updateButton.disabled = true;
              updateButton.style.opacity = '0.7';
              
              const response = await fetch(`${serverUrl}/summarize`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  text: summaryData.original_text,
                  override_tone: tone,
                  override_difficulty: difficulty
                }),
                // Add no-cors mode as fallback
                mode: 'cors',
                credentials: 'same-origin'
              });
  
              if (!response.ok) {
                const errorData = await response.json();
                if (errorData.code === 'PRO_FEATURE') {
                  throw new Error('Summary regeneration is only available for pro users. Please upgrade to pro to use this feature.');
                }
                throw new Error(errorData.error || 'Failed to generate summary');
              }
              
              const data = await response.json();
              summaryText.textContent = data.summary;
              
              // Update summary data with new summary
              summaryData.summary = data.summary;
  
              // Refresh usage display in popup
              chrome.runtime.sendMessage({ type: 'REFRESH_USAGE' });
            } catch (error) {
              console.error('Error regenerating summary:', error);
              summaryText.textContent = error.message || 'Failed to generate new summary. Please try again.';
            } finally {
              updateButton.disabled = false;
              updateButton.style.opacity = '1';
            }
          };
  
          // Add click handler for update button
          updateButton.onclick = () => regenerateSummary(toneSelect.value, difficultySelect.value);
  
          // Assemble controls
          toneGroup.appendChild(toneLabel);
          toneGroup.appendChild(toneSelect);
          difficultyGroup.appendChild(difficultyLabel);
          difficultyGroup.appendChild(difficultySelect);
          
          selectsContainer.appendChild(toneGroup);
          selectsContainer.appendChild(difficultyGroup);
          
          controlsContainer.appendChild(selectsContainer);
          controlsContainer.appendChild(updateButton);
          
          // Insert controls before buttons
          popup.insertBefore(controlsContainer, buttonsContainer);
        } catch (optionsError) {
          console.error('Error fetching options:', optionsError);
        }
      }
    } catch (error) {
      console.error('Error setting up pro controls:', error);
    }
  };

  // Add CSS variables for theme support
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --primary-color: #BAA5FF;
      --secondary-color: #4CAF50;
      --text-color: #333;
      --text-color-secondary: #666;
      --border-color: #e0e0e0;
      --background-color: #ffffff;
      --background-color-secondary: #f5f5f5;
    }

    [data-theme="dark"] {
      --text-color: #ffffff;
      --text-color-secondary: #aaaaaa;
      --border-color: #444;
      --background-color: #1a1a1a;
      --background-color-secondary: #2a2a2a;
    }

    select {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 8px;
      padding-right: 24px;
    }
  `;
  document.head.appendChild(style);

  // Set a default theme (light) immediately
  document.body.setAttribute('data-theme', 'light');
  logo.src = chrome.runtime.getURL('logo.png');

  // Then try to get user's theme setting from Supabase
  try {
    fetch(`${serverUrl}/user/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      // Add no-cors mode as fallback
      mode: 'cors',
      credentials: 'same-origin'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch theme settings: ${response.status}`);
      }
      return response.json();
    })
    .then(settings => {
      const theme = settings.theme;
      
      // Apply theme based on user's saved preference
      if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        logo.src = chrome.runtime.getURL('logo_light.png');
      } else if (theme === 'system') {
        // Only use system preference if theme is set to 'system'
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.body.setAttribute('data-theme', 'dark');
          logo.src = chrome.runtime.getURL('logo_light.png');
        } else {
          document.body.removeAttribute('data-theme');
          logo.src = chrome.runtime.getURL('logo.png');
        }
      } else {
        // Default to light theme
        document.body.removeAttribute('data-theme');
        logo.src = chrome.runtime.getURL('logo.png');
      }

      // Listen for system theme changes only if theme is set to system
      if (theme === 'system') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (e.matches) {
            document.body.setAttribute('data-theme', 'dark');
            logo.src = chrome.runtime.getURL('logo_light.png');
          } else {
            document.body.removeAttribute('data-theme');
            logo.src = chrome.runtime.getURL('logo.png');
          }
        });
      }
    })
    .catch(error => {
      console.error('Error getting theme settings:', error);
      // Default theme already set, no need to set again
    });
  } catch (e) {
    console.error('Error setting theme:', e);
    // Default theme already set, no need to set again
  }

  document.body.appendChild(popup);
  
  // Initialize pro controls
  addProControls();
}

// Function to show error popup
function showErrorPopup(errorMessage) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #ffebee;
    border: 1px solid #ffcdd2;
    border-radius: 8px;
    padding: 16px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    max-width: 400px;
    width: 90%;
  `;

  const message = document.createElement('div');
  message.textContent = errorMessage;
  message.style.cssText = 'color: #c62828; margin-bottom: 12px;';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    background-color: #c62828;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
  `;
  closeButton.onclick = () => popup.remove();

  popup.appendChild(message);
  popup.appendChild(closeButton);
  document.body.appendChild(popup);
}

// Function to update theme in popup
function updateTheme(theme) {
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.setAttribute('data-theme', 'dark');
    const logo = document.getElementById('lightread-logo');
    if (logo) logo.src = chrome.runtime.getURL('logo_light.png');
  } else {
    document.body.removeAttribute('data-theme');
    const logo = document.getElementById('lightread-logo');
    if (logo) logo.src = chrome.runtime.getURL('logo.png');
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SESSION_UPDATE') {
    // Store the session and token in extension storage
    chrome.storage.session.set({
      session: message.session,
      jwtToken: message.jwtToken
    });
    
    // Also update the authState for immediate use
    if (message.jwtToken) {
      authState = {
        isLoggedIn: true,
        token: message.jwtToken,
        user: message.session
      };
    }
    
    sendResponse({ success: true });
  } else if (message.type === 'SESSION_CLEAR') {
    // Clear extension storage
    chrome.storage.session.clear();
    
    // Clear authState
    authState = {
      isLoggedIn: false,
      token: null,
      user: null
    };
    
    sendResponse({ success: true });
  }
  
  // Allow async response
  return true;
});