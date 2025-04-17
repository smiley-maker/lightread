chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizeText",
    title: "Summarize with LightRead",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error creating context menu:", chrome.runtime.lastError);
    } else {
      console.log("Context menu created successfully!");
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarizeText" && info.selectionText) {
    console.log("Selected text:", info.selectionText);
    const serverUrl = `http://192.168.68.112:3000/summarize?text=${encodeURIComponent(info.selectionText)}`;

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
      console.log(summary);
      const logoUrl = chrome.runtime.getURL("logo.png"); // Get logo URL here

      // Define the function to be injected
      const injectionFunction = (summaryText, logoUrl) => {
        console.log("Injection function executed with summary:", summaryText);

        // Remove any existing summary popups
        const existingPopup = document.getElementById('lightread-popup');
        if (existingPopup) {
          console.log("Existing popup found, removing...");
          existingPopup.remove();
        }

        // Create the popup container
        const popup = document.createElement('div');
        popup.id = 'lightread-popup';
        popup.style.position = 'fixed';
        popup.style.top = '20px';
        popup.style.right = '20px';
        popup.style.backgroundColor = '#f8f9fa';
        popup.style.border = '1px solid #ced4da';
        popup.style.borderRadius = '5px';
        popup.style.padding = '15px';
        popup.style.zIndex = '10000';
        popup.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        popup.style.fontFamily = 'sans-serif';
        popup.style.fontSize = '14px';
        popup.style.color = '#212529';
        popup.style.maxWidth = '500px';

        // Create and append the logo image
        const logoImg = document.createElement('img');
        logoImg.src = logoUrl;
        logoImg.alt = 'LightRead Logo';
        logoImg.id = 'lightread-logo';
        logoImg.style.width = '200px';
        logoImg.style.marginBottom = '10px';
        logoImg.style.display = 'block';
        popup.appendChild(logoImg);

        // Create and append the summary text container
        const summaryTextElement = document.createElement('div');
        summaryTextElement.id = 'lightread-summary-text';
        summaryTextElement.style.marginBottom = '15px';
        summaryTextElement.style.maxHeight = '200px';
        summaryTextElement.style.overflowY = 'auto';
        summaryTextElement.textContent = summaryText;
        popup.appendChild(summaryTextElement);

        // Create and append the copy button
        const copyButton = document.createElement('button');
        copyButton.id = 'lightread-copy-button';
        copyButton.style.backgroundColor = '#BAA5FF';
        copyButton.style.color = 'black';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '4px';
        copyButton.style.padding = '8px 12px';
        copyButton.style.cursor = 'pointer';
        copyButton.style.fontSize = '12px';
        copyButton.style.marginRight = '5px';
        copyButton.textContent = 'Copy';
        popup.appendChild(copyButton);

        // Create and append the close button
        const closeButton = document.createElement('button');
        closeButton.id = 'lightread-close-button';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '8px';
        closeButton.style.right = '8px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '16px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = '#6c757d';
        closeButton.style.padding = '0 5px';
        closeButton.textContent = 'X';
        popup.appendChild(closeButton);

        // Append the popup to the body
        document.body.appendChild(popup);
        console.log("Popup appended to body", popup);

        const copyButtonElement = document.getElementById('lightread-copy-button');
        const closeButtonElement = document.getElementById('lightread-close-button');

        if (copyButtonElement) {
          copyButtonElement.addEventListener('click', () => {
            navigator.clipboard.writeText(summaryText)
              .then(() => {
                copyButtonElement.textContent = 'Copied!'; // Provide feedback
                setTimeout(() => { copyButtonElement.textContent = 'Copy'; }, 2000); // Reset after 2s
              })
              .catch(err => {
                console.error('Failed to copy summary: ', err);
                copyButtonElement.textContent = 'Error';
              });
          });
        } else {
           console.error("Could not find copy button");
        }

        if (closeButtonElement) {
          closeButtonElement.addEventListener('click', () => {
            popup.remove();
          });
        } else {
          console.error("Could not find close button");
        }
      };

      // Execute the injection function
      console.log("Executing the injection function...");
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: injectionFunction,
        args: [summary, logoUrl] // Pass summary and logoUrl as arguments
      });
      console.log("Finished execution of the injection function...")

    } catch (error) {
      console.error("Failed to fetch summary:", error);
      // Optionally, inform the user about the error using an alert or the same popup mechanism
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (errMsg) => { alert(errMsg); }, // Simple alert for error
        args: [`LightRead Error: ${error.message}`]
      });
    }
  }
});

// The separate displaySummary and injectPopup functions are no longer needed here
