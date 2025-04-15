chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizeText",
    title: "Summarize with LightRead",
    contexts: ["selection"] // Only show when text is selected
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => { // Make the listener async
  if (info.menuItemId === "summarizeText" && info.selectionText) {
    console.log("Selected text:", info.selectionText);
    // --- CHANGE THIS LINE --- 
    const serverUrl = `http://192.168.68.112:3000/summarize?text=${encodeURIComponent(info.selectionText)}`; // Use the accessible IP address
    // --- END CHANGE ---

    try {
      const response = await fetch(serverUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        // Try to get error details from server response if possible
        let errorMsg = `Error from server: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg += ` - ${errorData.error || 'No specific error message provided.'}`;
        } catch (e) {
            // Ignore if response is not JSON or error parsing it
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const summary = data.summary; // Assuming server returns { "summary": "..." }

      // Send summary to content script to display
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: displaySummary,
        args: [info.selectionText, summary] // Pass original text and summary
      });

    } catch (error) {
      console.error("Failed to fetch summary:", error);
      // Optionally, display the error to the user
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: displaySummary, // Reuse display function for errors
        args: [info.selectionText, `Error: Could not get summary. ${error.message}`] // Pass error message
      });
    }
  }
});

// This function will be injected into the content script (remains the same)
function displaySummary(selectedText, summary) {
  console.log("Received summary/message:", summary);
  // Find the selection range
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Remove any existing summary divs
  const existingDiv = document.getElementById('lightread-summary');
  if (existingDiv) {
    existingDiv.remove();
  }

  // Create a div to display the summary
  const summaryDiv = document.createElement('div');
  summaryDiv.id = 'lightread-summary'; // Assign an ID for potential removal later
  summaryDiv.style.position = 'absolute';
  summaryDiv.style.top = `${window.scrollY + rect.bottom + 5}px`; // Position below selection
  summaryDiv.style.left = `${window.scrollX + rect.left}px`;
  summaryDiv.style.padding = '10px';
  summaryDiv.style.backgroundColor = '#f8f9fa'; // Light background
  summaryDiv.style.border = '1px solid #ced4da';
  summaryDiv.style.borderRadius = '4px';
  summaryDiv.style.zIndex = '9999'; // Ensure it's on top
  summaryDiv.style.fontFamily = 'sans-serif';
  summaryDiv.style.fontSize = '14px';
  summaryDiv.style.color = '#212529';
  summaryDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  summaryDiv.textContent = summary; // Display the summary or error message

  // Add a close button (optional)
  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.fontSize = '12px';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = () => summaryDiv.remove();
  summaryDiv.appendChild(closeButton);


  document.body.appendChild(summaryDiv);

  // Optional: Add listener to remove summary if user clicks elsewhere
  const clickOutsideListener = (event) => {
    if (!summaryDiv.contains(event.target)) {
      summaryDiv.remove();
      document.removeEventListener('click', clickOutsideListener);
    }
  };
  // Use setTimeout to avoid capturing the click that opened the summary
  setTimeout(() => {
    document.addEventListener('click', clickOutsideListener);
  }, 100);
}
