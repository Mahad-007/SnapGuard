# SnapGuard

A Chrome extension that takes a screenshot of a whole web page, not just the visible part. It scrolls down the page, captures each section, stitches the sections together in the browser and saves one PNG.

Nothing is uploaded anywhere. Capturing, stitching and downloading all happen locally in your browser.

## How it works

1. You click **Capture** in the popup.
2. The content script works out the page height and the real scroll container. This includes pages that scroll inside an inner element instead of the window.
3. It scrolls one viewport at a time, waits for the page to settle and asks the background worker to grab the visible tab.
4. The background service worker draws all the sections onto an `OffscreenCanvas` in order. It skips duplicate sections and removes the 20px overlap between them.
5. The result is downloaded as `fullpage_screenshot_<timestamp>.png`.

## Install (unpacked)

1. Clone the repo:

   ```bash
   git clone https://github.com/Mahad-007/SnapGuard.git
   ```

2. Go to `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the `SnapGuard` folder.
4. Pin the extension, open any page and click **Capture**.

The icons are already in `icons/`. To regenerate them, see `icons/README.md`.

## Permissions

| Permission | Why it's needed |
| --- | --- |
| `activeTab` | To capture the tab you're looking at |
| `scripting` | To inject the scroll script if the page loaded before the extension |
| `downloads` | To save the finished PNG |

## Files

```
manifest.json   Manifest V3 config
popup.html/js   The capture button and status messages
content.js      Scrolls the page and reports each section
background.js   Captures, stitches and downloads
styles.css      Popup styles
icons/          Extension icons and the scripts that generate them
```

## Known limits

- Sticky headers and fixed elements can show up in more than one section.
- Very long pages produce very large images and can hit Chrome's canvas size limit.
- Chrome blocks extensions on `chrome://` pages and the Chrome Web Store, so those can't be captured.
