# Icon Generation Instructions

To generate the PNG icons for SnapGuard, you have two options:

## Option 1: Using the HTML Generator (Easiest)

1. Open `generate-icons.html` in your web browser
2. Click the buttons to generate each icon size (16x16, 48x48, 128x128)
3. The PNG files will be automatically downloaded
4. Move the downloaded files to the `icons` folder

## Option 2: Using Node.js Script

1. Install the `canvas` package: `npm install canvas`
2. Run: `node generate-icons.js`
3. The icons will be generated in the `icons` folder

## Option 3: Manual Creation

If you prefer, you can create the icons manually:
- Use the SVG file (`icon.svg`) as a reference
- Export it at 16x16, 48x48, and 128x128 pixel sizes
- Save them as `icon-16.png`, `icon-48.png`, and `icon-128.png`

The icon design features:
- Gradient background (purple/indigo)
- Shield shape representing "Guard"
- Camera lens inside representing "Snap"
- Crosshair shutter lines for camera effect

