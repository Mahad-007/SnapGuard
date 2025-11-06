// Popup script for Full Page Screenshot Extension
// Handles button click, sends message to content script, and updates UI status

const captureBtn = document.getElementById('captureBtn');
const statusDiv = document.getElementById('status');

// Update status message in the UI
function updateStatus(message, type = '') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

// Listen for completion messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureComplete') {
    updateStatus('Screenshot saved!', 'success');
    captureBtn.disabled = false;
  } else if (message.action === 'captureError') {
    updateStatus('Error: ' + message.error, 'error');
    captureBtn.disabled = false;
  }
});

// Handle capture button click
captureBtn.addEventListener('click', async () => {
  try {
    // Disable button during capture
    captureBtn.disabled = true;
    updateStatus('Capturing...', 'info');
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }
    
    // Try to send message first (content script may already be injected)
    chrome.tabs.sendMessage(tab.id, { action: 'startCapture' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not injected yet, inject it
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          // Wait a bit for script to initialize, then send message
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'startCapture' }, (response) => {
              if (chrome.runtime.lastError) {
                updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                captureBtn.disabled = false;
                return;
              }
              
              if (response && response.success) {
                updateStatus('Scrolling and capturing...', 'info');
              }
            });
          }, 100);
        }).catch((e) => {
          updateStatus('Error: Could not inject content script', 'error');
          captureBtn.disabled = false;
        });
        return;
      }
      
      if (response && response.success) {
        updateStatus('Scrolling and capturing...', 'info');
      }
    });
    
  } catch (error) {
    console.error('Capture error:', error);
    updateStatus('Error: ' + error.message, 'error');
    captureBtn.disabled = false;
  }
});

