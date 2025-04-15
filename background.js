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

function displaySummary(summary) {
  // Inline HTML for the popup
  const popupHTML = `
    <div id="lightread-popup" style="position: fixed; top: 20px; right: 20px; background-color: #f8f9fa; border: 1px solid #ced4da; border-radius: 5px; padding: 10px; z-index: 10000; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
      <img src="${chrome.runtime.getURL("logo.png")}" alt="LightRead Logo" id="lightread-logo" style="width: 100px; margin-bottom: 10px;">
      <div id="lightread-summary-text" style="margin-bottom: 10px;"></div>
      <button id="lightread-copy-button" style="background-color: #007bff; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer;">Copy</button>
      <button id="lightread-close-button" style="position: absolute; top: 5px; right: 5px; background: none; border: none; font-size: 12px; cursor: pointer;">X</button>
    </div>
  `;

  function injectPopup(popupHTML, summaryText) {
    // Remove any existing summary popups
    const existingPopup = document.getElementById('lightread-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    const container = document.createElement('div');
    container.innerHTML = popupHTML;
    const popup = container.firstChild;
    document.body.appendChild(popup);

    const summaryTextElement = document.getElementById('lightread-summary-text');
    const copyButton = document.getElementById('lightread-copy-button');
    const closeButton = document.getElementById('lightread-close-button');

    summaryTextElement.textContent = summaryText;

    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(summaryText)
        .then(() => {
          console.log('Summary copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy summary: ', err);
        });
    });

    closeButton.addEventListener('click', () => {
      popup.remove();
    });
  }

  chrome.scripting.executeScript({
    target: { tabId: chrome.tabs.getCurrent().then(tab => tab.id) },
    function: injectPopup,
    args: [popupHTML, summary]
  });
}
