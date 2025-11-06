// Content script for Full Page Screenshot Extension
// Handles scrolling through the page and coordinates with background script for captures

// Use a global flag to prevent multiple instances
if (typeof window.snapGuardCapturing === 'undefined') {
  window.snapGuardCapturing = false;
}

// Listen for capture request from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCapture' && !window.snapGuardCapturing) {
    startCapture();
    sendResponse({ success: true });
  }
  return true;
});

// Main capture function that scrolls through the page
async function startCapture() {
  if (window.snapGuardCapturing) {
    console.warn('Capture already in progress');
    return;
  }
  
  window.snapGuardCapturing = true;
  
  try {
    // Get page dimensions - use the maximum scrollable height
    const pageHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    );
    
    const viewportHeight = window.innerHeight;
    const scrollStep = Math.max(viewportHeight - 20, viewportHeight * 0.9); // 20px overlap to avoid gaps
    const maxScrollY = Math.max(0, pageHeight - viewportHeight);
    const totalSections = Math.ceil(pageHeight / scrollStep);
    
    console.log(`Page height: ${pageHeight}, Viewport: ${viewportHeight}, Sections: ${totalSections}`);
    
    // Reset scroll position to top with multiple methods for reliability
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Wait for scroll to actually reach top
    await waitForScrollComplete(0, 1000);
    
    // Verify we're at the top
    const initialScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    if (initialScroll > 5) {
      console.warn(`Warning: Could not scroll to top. Current position: ${initialScroll}`);
    }
    
    // Notify background script to start new capture session
    chrome.runtime.sendMessage({
      action: 'startCaptureSession',
      totalSections: totalSections
    });
    
    // Scroll and capture each section
    for (let i = 0; i < totalSections; i++) {
      // Calculate target scroll position
      let targetScrollY = Math.min(i * scrollStep, maxScrollY);
      
      // For the last section, ensure we capture the bottom
      if (i === totalSections - 1) {
        targetScrollY = maxScrollY;
      }
      
      const previousScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      
      // Scroll to position using multiple methods for reliability
      window.scrollTo(0, targetScrollY);
      document.documentElement.scrollTop = targetScrollY;
      document.body.scrollTop = targetScrollY;
      
      // Force a reflow
      void document.documentElement.offsetHeight;
      
      // Wait for scroll to complete with longer timeout
      await waitForScrollComplete(targetScrollY, 2000);
      
      // Verify scroll actually happened
      const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      
      // Check if scroll actually changed (except for first section)
      if (i > 0 && Math.abs(currentScrollY - previousScrollY) < 5) {
        console.warn(`Scroll may not have changed: ${previousScrollY} -> ${currentScrollY}. Skipping duplicate.`);
        // Skip this section to avoid duplicate
        continue;
      }
      
      // Additional delay to ensure rendering is complete (images, lazy content, etc.)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Request capture from background script
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'captureSection',
          sectionIndex: i,
          scrollY: currentScrollY
        }, (response) => {
          if (response && response.success) {
            console.log(`Captured section ${i + 1}/${totalSections} at scrollY: ${currentScrollY}`);
            resolve();
          } else {
            console.error(`Failed to capture section ${i + 1}`);
            resolve();
          }
        });
      });
      
      // Small delay between captures
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Notify background script that all sections are captured
    chrome.runtime.sendMessage({
      action: 'finishCaptureSession'
    });
    
    // Reset scroll to top
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    
  } catch (error) {
    console.error('Capture error:', error);
    chrome.runtime.sendMessage({
      action: 'captureError',
      error: error.message
    });
  } finally {
    window.snapGuardCapturing = false;
  }
}

// Wait for scroll to reach target position and stabilize
function waitForScrollComplete(targetY, maxWaitTime = 2000) {
  return new Promise((resolve) => {
    const tolerance = 5; // Allow 5px tolerance
    const startTime = Date.now();
    let lastScrollY = -1;
    let stableCount = 0;
    
    const checkScroll = () => {
      const currentY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const timeElapsed = Date.now() - startTime;
      
      // Check if scroll position is stable (not changing)
      if (Math.abs(currentY - lastScrollY) < 1) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      lastScrollY = currentY;
      
      // Check if we're at target position (within tolerance) and stable
      if (Math.abs(currentY - targetY) <= tolerance && stableCount >= 2) {
        resolve();
        return;
      }
      
      // Timeout after max wait time
      if (timeElapsed > maxWaitTime) {
        console.warn(`Scroll timeout: target ${targetY}, current ${currentY}, stable: ${stableCount}`);
        resolve();
        return;
      }
      
      // Continue checking
      requestAnimationFrame(checkScroll);
    };
    
    // Start checking immediately
    requestAnimationFrame(checkScroll);
  });
}

