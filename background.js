chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizeText",
    title: "Summarize with LightRead",
    contexts: ["selection"] // Only show when text is selected
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarizeText" && info.selectionText) {
    console.log("Selected text:", info.selectionText);
    const serverUrl = `http://10.88.0.3:5000/summarize?text=${encodeURIComponent(info.selectionText)}`;

    try {
      const response = await fetch(serverUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        let errorMsg = `Error from server: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg += ` - ${errorData.error || 'No specific error message provided.'}`;
        } catch (e) {
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const summary = data.summary;

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: displaySummary,
        args: [summary]
      });

    } catch (error) {
      console.error("Failed to fetch summary:", error);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: displaySummary,
        args: [`Error: Could not get summary. ${error.message}`]
      });
    }
  }
});

async function displaySummary(summary) {
  // Fetch the content of popup.html
  const response = await fetch(chrome.runtime.getURL('popup.html'));
  const popupContent = await response.text();

  // Function to inject the popup into the page
  function injectPopup(popupHTML, summaryText) {
    // Remove any existing summary popups
    const existingPopup = document.getElementById('lightread-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create a container div and set its content to the popup HTML
    const container = document.createElement('div');
    container.innerHTML = popupHTML;

    // Get the popup element
    const popup = container.firstChild;
    popup.style.position = 'fixed';
    popup.style.top = '20px';
    popup.style.right = '20px';
    popup.style.backgroundColor = '#f8f9fa';
    popup.style.border = '1px solid #ced4da';
    popup.style.borderRadius = '5px';
    popup.style.padding = '10px';
    popup.style.zIndex = '10000';
    popup.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    document.body.appendChild(popup);

    // Get references to elements within the popup
    const summaryTextElement = document.getElementById('lightread-summary-text');
    const copyButton = document.getElementById('lightread-copy-button');
    const closeButton = document.getElementById('lightread-close-button');
    const logo = document.getElementById('lightread-logo');

    // Set logo style
    logo.style.width = '100px'; // Adjust size as needed
    logo.style.marginBottom = '10px';

    // Set summary text
    summaryTextElement.textContent = summaryText;
    summaryTextElement.style.marginBottom = '10px';

    // Copy button functionality
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(summaryText)
        .then(() => {
          // Optional: provide user feedback (e.g., a tooltip)
          console.log('Summary copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy summary: ', err);
        });
    });
    copyButton.style.backgroundColor = '#007bff';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.padding = '5px 10px';
    copyButton.style.cursor = 'pointer';

    // Close button functionality
    closeButton.addEventListener('click', () => {
      popup.remove();
    });
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '12px';
    closeButton.style.cursor = 'pointer';
  }

  // Execute the injection function in the content script
  chrome.scripting.executeScript({
    target: { tabId: chrome.tabs.getCurrent().then(tab => tab.id) },
    function: injectPopup,
    args: [popupContent, summary]
  });
}
