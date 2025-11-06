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
    // Determine the element that actually scrolls (window or an inner container)
    const scrollRoot = getScrollRoot();
    // Wait a bit for page to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get page dimensions - use the maximum scrollable height
    // Try multiple methods to get accurate page height
    const containerHeight = scrollRoot.scrollHeight;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const pageHeight = Math.max(containerHeight, viewportHeight);
    
    // Calculate scroll step (90% of viewport to ensure overlap)
    const scrollStep = Math.floor(viewportHeight * 0.9);
    const maxScrollY = Math.max(0, pageHeight - viewportHeight);
    
    // Calculate total sections needed
    let totalSections = 1;
    if (maxScrollY > 0) {
      totalSections = Math.ceil(pageHeight / scrollStep);
      // Ensure we capture the bottom
      if (maxScrollY > 0 && (totalSections - 1) * scrollStep < maxScrollY) {
        totalSections++;
      }
    }
    
    console.log(`Page dimensions - Height: ${pageHeight}px, Viewport: ${viewportHeight}px, Max scroll: ${maxScrollY}px, Sections: ${totalSections}`);
    
    // Reset scroll position to top with multiple methods for reliability
    window.scrollTo(0, 0);
    window.scroll(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    scrollRoot.scrollTop = 0;
    
    // Wait for scroll to actually reach top
    await waitForScrollComplete(0, 1500);
    
    // Verify we're at the top
    const initialScroll = getCurrentScrollY(scrollRoot);
    if (initialScroll > 10) {
      console.warn(`Warning: Could not scroll to top. Current position: ${initialScroll}`);
      // Try harder
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Notify background script to start new capture session
    chrome.runtime.sendMessage({
      action: 'startCaptureSession',
      totalSections: totalSections,
      viewportHeight: viewportHeight,
      viewportWidth: viewportWidth
    });
    
    // Capture first section at top
    console.log(`Capturing section 1/${totalSections} at top (scrollY: 0)`);
    await captureCurrentSection(0, 0);
    
    // Scroll and capture remaining sections
    if (totalSections > 1) {
      for (let i = 1; i < totalSections; i++) {
        // Calculate target scroll position
        let targetScrollY = Math.min(i * scrollStep, maxScrollY);
        
        // For the last section, ensure we capture the very bottom
        if (i === totalSections - 1) {
          targetScrollY = maxScrollY;
        }
        
        const previousScrollY = getCurrentScrollY(scrollRoot);
        
        console.log(`Scrolling to section ${i + 1}/${totalSections} at scrollY: ${targetScrollY}`);
        
        // Scroll to position using multiple methods for reliability
        window.scrollTo({ top: targetScrollY, left: 0, behavior: 'instant' });
        window.scroll(0, targetScrollY);
        document.documentElement.scrollTop = targetScrollY;
        document.body.scrollTop = targetScrollY;
        scrollRoot.scrollTop = targetScrollY;
        
        // Force multiple reflows to ensure scroll happens
        void document.documentElement.offsetHeight;
        void document.body.offsetHeight;
        
        // Wait for scroll to complete with longer timeout
        await waitForScrollComplete(targetScrollY, 3000);
        
        // Verify scroll actually happened
        const currentScrollY = getCurrentScrollY(scrollRoot);
        
        // Check if scroll actually changed
        if (Math.abs(currentScrollY - previousScrollY) < 10 && i > 0) {
          console.warn(`Scroll may not have changed: ${previousScrollY} -> ${currentScrollY}. Retrying...`);
          // Try scrolling again with a different method
          window.scrollBy(0, targetScrollY - currentScrollY);
          scrollRoot.scrollTop = targetScrollY;
          await waitForScrollComplete(targetScrollY, 2000);
          const retryScrollY = getCurrentScrollY(scrollRoot);
          if (Math.abs(retryScrollY - targetScrollY) > 50) {
            console.warn(`Could not scroll to ${targetScrollY}, current: ${retryScrollY}. Skipping.`);
            continue;
          }
        }
        
        // Additional delay to ensure rendering is complete (images, lazy content, etc.)
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Capture this section
        await captureCurrentSection(i, getCurrentScrollY(scrollRoot));
      }
    }
    
    // Wait a bit before finishing to ensure all captures are processed
    await new Promise(resolve => setTimeout(resolve, 500));
    
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

// Find the most likely scrollable element on the page
function getScrollRoot() {
  const candidates = [
    document.scrollingElement,
    document.documentElement,
    document.body
  ].filter(Boolean);

  let best = candidates[0] || document.documentElement;
  let bestScrollable = (best.scrollHeight - best.clientHeight) || 0;

  try {
    const all = document.querySelectorAll('*');
    for (const el of all) {
      // Skip invisible elements and small containers
      if (!(el instanceof HTMLElement)) continue;
      const style = getComputedStyle(el);
      const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay');
      const scrollableAmount = el.scrollHeight - el.clientHeight;
      if (isScrollable && scrollableAmount > bestScrollable + 50 && el.clientHeight > 0) {
        best = el;
        bestScrollable = scrollableAmount;
      }
    }
  } catch (e) {
    // Fallback to default scrollingElement
  }

  return best;
}

// Helper function to get current scroll position of a given root (default to window/document)
function getCurrentScrollY(root = null) {
  if (root && root !== document.documentElement && root !== document.body) {
    return root.scrollTop || 0;
  }
  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

// Helper function to capture current section
function captureCurrentSection(sectionIndex, scrollY) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'captureSection',
      sectionIndex: sectionIndex,
      scrollY: scrollY
    }, (response) => {
      if (response && response.success) {
        console.log(`✓ Captured section ${sectionIndex + 1} at scrollY: ${scrollY}`);
        resolve();
      } else {
        console.error(`✗ Failed to capture section ${sectionIndex + 1}`);
        resolve(); // Continue even if one fails
      }
    });
  });
}

// Wait for scroll to reach target position and stabilize
function waitForScrollComplete(targetY, maxWaitTime = 2000) {
  return new Promise((resolve) => {
    const tolerance = 10; // Allow 10px tolerance
    const startTime = Date.now();
    let lastScrollY = -1;
    let stableCount = 0;
    const requiredStableFrames = 3; // Need 3 stable frames
    
    const checkScroll = () => {
      const currentY = getCurrentScrollY(getScrollRoot());
      const timeElapsed = Date.now() - startTime;
      
      // Check if scroll position is stable (not changing)
      if (Math.abs(currentY - lastScrollY) < 2) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      lastScrollY = currentY;
      
      // Check if we're at target position (within tolerance) and stable
      const distanceFromTarget = Math.abs(currentY - targetY);
      if (distanceFromTarget <= tolerance && stableCount >= requiredStableFrames) {
        resolve();
        return;
      }
      
      // Timeout after max wait time
      if (timeElapsed > maxWaitTime) {
        // If we're close enough, accept it
        if (distanceFromTarget <= tolerance * 2) {
          console.log(`Scroll close enough: target ${targetY}, current ${currentY} (diff: ${distanceFromTarget}px)`);
          resolve();
          return;
        }
        console.warn(`Scroll timeout: target ${targetY}, current ${currentY}, stable: ${stableCount}`);
        resolve();
        return;
      }
      
      // Continue checking
      requestAnimationFrame(checkScroll);
    };
    
    // Start checking after a small delay
    setTimeout(() => {
      requestAnimationFrame(checkScroll);
    }, 50);
  });
}

