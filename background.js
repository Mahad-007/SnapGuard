// Background service worker for Full Page Screenshot Extension
// Handles screenshot capture, image stitching, and file download

let captureSession = null;
let capturedImages = [];
let capturedIndices = new Set(); // Track which section indices have been captured

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCaptureSession') {
    startCaptureSession(message.totalSections);
    sendResponse({ success: true });
  } else if (message.action === 'captureSection') {
    captureSection(sender.tab.id, message.sectionIndex, message.scrollY)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
  } else if (message.action === 'finishCaptureSession') {
    finishCaptureSession();
    sendResponse({ success: true });
  } else if (message.action === 'captureError') {
    handleCaptureError(message.error);
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

// Start a new capture session
function startCaptureSession(totalSections) {
  captureSession = {
    totalSections: totalSections,
    startTime: Date.now()
  };
  capturedImages = [];
  capturedIndices.clear(); // Reset captured indices
  console.log(`Starting capture session: ${totalSections} sections`);
}

// Capture a single section of the page
async function captureSection(tabId, sectionIndex, scrollY) {
  try {
    // Check if this section was already captured (prevent duplicates)
    if (capturedIndices.has(sectionIndex)) {
      console.warn(`Section ${sectionIndex} already captured, skipping duplicate`);
      return;
    }
    
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });
    
    // Convert data URL to image to get dimensions
    const img = await dataUrlToImage(dataUrl);
    
    // Mark this index as captured
    capturedIndices.add(sectionIndex);
    
    capturedImages.push({
      index: sectionIndex,
      dataUrl: dataUrl,
      image: img,
      width: img.width,
      height: img.height,
      scrollY: scrollY
    });
    
    console.log(`Captured section ${sectionIndex + 1}/${captureSession.totalSections} at scrollY: ${scrollY}`);
    
  } catch (error) {
    console.error(`Error capturing section ${sectionIndex}:`, error);
    throw error;
  }
}

// Convert data URL to ImageBitmap (service worker compatible)
async function dataUrlToImage(dataUrl) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    return imageBitmap;
  } catch (error) {
    console.error('Error converting data URL to image:', error);
    throw error;
  }
}

// Convert blob to data URL (service worker compatible)
async function blobToDataUrl(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Convert to base64 in chunks to avoid stack overflow
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  
  const base64 = btoa(binary);
  return `data:image/png;base64,${base64}`;
}

// Finish capture session and stitch images
async function finishCaptureSession() {
  if (capturedImages.length === 0) {
    console.error('No images captured');
    handleCaptureError('No images captured');
    return;
  }
  
  try {
    console.log(`Stitching ${capturedImages.length} images...`);
    
    // Sort images by index
    capturedImages.sort((a, b) => a.index - b.index);
    
    // Calculate total height (accounting for overlap)
    const overlap = 10; // pixels of overlap between sections
    let totalHeight = capturedImages[0].height;
    const width = capturedImages[0].width;
    
    for (let i = 1; i < capturedImages.length; i++) {
      totalHeight += capturedImages[i].height - overlap;
    }
    
    // Create canvas for stitching
    const canvas = new OffscreenCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');
    
    // Draw images onto canvas
    let currentY = 0;
    for (let i = 0; i < capturedImages.length; i++) {
      const img = capturedImages[i].image;
      
      if (i === 0) {
        // First image: draw full height
        ctx.drawImage(img, 0, currentY);
        currentY += img.height;
      } else {
        // Subsequent images: skip overlap region
        currentY -= overlap;
        ctx.drawImage(img, 0, currentY);
        currentY += img.height;
      }
    }
    
    // Convert canvas to blob
    const blob = await canvas.convertToBlob({ type: 'image/png', quality: 1.0 });
    
    // Convert blob to data URL (service worker compatible)
    const dataUrl = await blobToDataUrl(blob);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `fullpage_screenshot_${timestamp}.png`;
    
    // Download the stitched image using data URL
    await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });
    
    console.log(`Screenshot saved: ${filename}`);
    capturedImages = [];
    captureSession = null;
    
    // Notify popup of completion
    chrome.runtime.sendMessage({
      action: 'captureComplete'
    });
    
  } catch (error) {
    console.error('Error stitching images:', error);
    handleCaptureError(error.message);
  }
}

// Handle capture errors
function handleCaptureError(error) {
  capturedImages = [];
  capturedIndices.clear();
  captureSession = null;
  
  chrome.runtime.sendMessage({
    action: 'captureError',
    error: error
  });
}

