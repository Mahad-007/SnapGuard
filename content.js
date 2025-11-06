// Content script for Full Page Screenshot Extension
// Handles scrolling through the page and coordinates with background script for captures

let isCapturing = false;
let capturedSections = 0;

// Listen for capture request from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCapture' && !isCapturing) {
    startCapture();
    sendResponse({ success: true });
  }
  return true;
});

// Main capture function that scrolls through the page
async function startCapture() {
  if (isCapturing) return;
  
  isCapturing = true;
  capturedSections = 0;
  
  try {
    // Get page dimensions
    const pageHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    const viewportHeight = window.innerHeight;
    const scrollStep = viewportHeight - 10; // 10px overlap to avoid gaps
    const totalSections = Math.ceil(pageHeight / scrollStep);
    
    // Reset scroll position to top
    window.scrollTo(0, 0);
    await waitForScroll();
    
    // Notify background script to start new capture session
    chrome.runtime.sendMessage({
      action: 'startCaptureSession',
      totalSections: totalSections
    });
    
    // Scroll and capture each section
    for (let i = 0; i < totalSections; i++) {
      const scrollY = Math.min(i * scrollStep, pageHeight - viewportHeight);
      
      // Scroll to position
      window.scrollTo(0, scrollY);
      await waitForScroll();
      
      // Request capture from background script
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'captureSection',
          sectionIndex: i,
          scrollY: scrollY
        }, (response) => {
          if (response && response.success) {
            capturedSections++;
            resolve();
          } else {
            resolve();
          }
        });
      });
      
      // Small delay to ensure capture completes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Notify background script that all sections are captured
    chrome.runtime.sendMessage({
      action: 'finishCaptureSession'
    });
    
    // Reset scroll to top
    window.scrollTo(0, 0);
    
  } catch (error) {
    console.error('Capture error:', error);
    chrome.runtime.sendMessage({
      action: 'captureError',
      error: error.message
    });
  } finally {
    isCapturing = false;
  }
}

// Wait for scroll animation to complete
function waitForScroll() {
  return new Promise((resolve) => {
    let lastScrollY = window.scrollY;
    let scrollTimeout;
    
    const checkScroll = () => {
      if (window.scrollY === lastScrollY) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          resolve();
        }, 50);
      } else {
        lastScrollY = window.scrollY;
        scrollTimeout = setTimeout(checkScroll, 50);
      }
    };
    
    requestAnimationFrame(() => {
      checkScroll();
    });
  });
}

