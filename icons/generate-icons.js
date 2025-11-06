// SnapGuard Icon Generator
// Run with: node generate-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

function drawIcon(canvas, size) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  
  // Background circle with gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#8b5cf6');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 * 0.94, 0, Math.PI * 2);
  ctx.fill();
  
  // Shield shape
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.moveTo(size/2, size * 0.156);
  ctx.lineTo(size * 0.313, size * 0.234);
  ctx.lineTo(size * 0.313, size * 0.43);
  ctx.quadraticCurveTo(size * 0.313, size * 0.586, size/2, size * 0.781);
  ctx.quadraticCurveTo(size * 0.687, size * 0.586, size * 0.687, size * 0.43);
  ctx.lineTo(size * 0.687, size * 0.234);
  ctx.closePath();
  ctx.fill();
  
  // Camera lens
  const centerX = size/2;
  const centerY = size * 0.43;
  
  // Outer ring
  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.141, 0, Math.PI * 2);
  ctx.fill();
  
  // Middle ring
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.094, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner ring
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.063, 0, Math.PI * 2);
  ctx.fill();
  
  // Center dot
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.031, 0, Math.PI * 2);
  ctx.fill();
  
  // Shutter lines
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.globalAlpha = 0.6;
  
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - size * 0.063);
  ctx.lineTo(centerX, centerY + size * 0.063);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(centerX - size * 0.063, centerY);
  ctx.lineTo(centerX + size * 0.063, centerY);
  ctx.stroke();
  
  ctx.globalAlpha = 1;
}

const sizes = [16, 48, 128];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  drawIcon(canvas, size);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon-${size}.png`, buffer);
  console.log(`Generated icon-${size}.png`);
});

console.log('All icons generated successfully!');

