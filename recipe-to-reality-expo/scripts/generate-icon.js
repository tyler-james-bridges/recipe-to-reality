#!/usr/bin/env node

/**
 * App Icon Generator for Recipe to Reality
 *
 * Generates app icons matching the onboarding screen design:
 * - Orange gradient background (#FF9500 to #FF9500CC)
 * - Rounded corners (iOS style, ~22% corner radius)
 * - White fork and knife icon centered
 *
 * Outputs:
 * - icon.png (1024x1024) - Main app icon
 * - adaptive-icon.png (1024x1024) - Android adaptive icon
 * - splash-icon.png (512x512) - Splash screen icon
 * - favicon.png (48x48) - Web favicon
 *
 * @requires canvas - npm install canvas
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Configuration
const ICON_CONFIGS = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'splash-icon.png', size: 512 },
  { name: 'favicon.png', size: 48 },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'images');

// Colors from onboarding.tsx
const COLORS = {
  gradientStart: '#FF9500',
  gradientEnd: '#FF9500CC', // 80% opacity orange
  iconColor: '#FFFFFF',
};

/**
 * Draw a rounded rectangle path
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} radius - Corner radius
 */
function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw a fork icon
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} scale - Scale factor
 */
function drawFork(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const handleWidth = 8;
  const handleHeight = 50;
  const tineWidth = 4;
  const tineHeight = 30;
  const tineGap = 6;
  const numTines = 4;

  // Draw handle
  ctx.fillRect(-handleWidth / 2, 10, handleWidth, handleHeight);

  // Draw base connecting tines
  const baseWidth = (numTines - 1) * (tineWidth + tineGap) + tineWidth;
  ctx.fillRect(-baseWidth / 2, -5, baseWidth, 18);

  // Draw tines
  for (let i = 0; i < numTines; i++) {
    const tineX = -baseWidth / 2 + i * (tineWidth + tineGap);
    ctx.fillRect(tineX, -5 - tineHeight, tineWidth, tineHeight);

    // Round the top of each tine
    ctx.beginPath();
    ctx.arc(tineX + tineWidth / 2, -5 - tineHeight, tineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Round the bottom of the handle
  ctx.beginPath();
  ctx.arc(0, 10 + handleHeight, handleWidth / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a knife icon
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} scale - Scale factor
 */
function drawKnife(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const handleWidth = 10;
  const handleHeight = 35;
  const bladeWidth = 14;
  const bladeHeight = 45;

  // Draw handle
  ctx.fillRect(-handleWidth / 2, 15, handleWidth, handleHeight);

  // Round the bottom of handle
  ctx.beginPath();
  ctx.arc(0, 15 + handleHeight, handleWidth / 2, 0, Math.PI * 2);
  ctx.fill();

  // Draw blade (curved shape)
  ctx.beginPath();
  ctx.moveTo(-bladeWidth / 2, 15);
  ctx.lineTo(-bladeWidth / 2, -bladeHeight + 10);
  // Curved tip
  ctx.quadraticCurveTo(-bladeWidth / 2, -bladeHeight - 5, 0, -bladeHeight - 8);
  ctx.quadraticCurveTo(bladeWidth / 4, -bladeHeight - 5, bladeWidth / 4, -bladeHeight + 15);
  // Back edge (slightly curved)
  ctx.quadraticCurveTo(bladeWidth / 4, 5, handleWidth / 2, 15);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Generate an app icon
 * @param {number} size - Icon size in pixels
 * @returns {Buffer} PNG buffer
 */
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // iOS app icon corner radius is approximately 22.37% of the icon size
  const cornerRadius = Math.round(size * 0.2237);

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, COLORS.gradientStart);
  gradient.addColorStop(1, COLORS.gradientEnd);

  // Draw rounded rectangle background
  roundedRect(ctx, 0, 0, size, size, cornerRadius);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Add subtle inner shadow/glow effect
  ctx.save();
  roundedRect(ctx, 0, 0, size, size, cornerRadius);
  ctx.clip();

  // Subtle radial gradient overlay for depth
  const radialGradient = ctx.createRadialGradient(
    size * 0.3, size * 0.3, 0,
    size * 0.5, size * 0.5, size * 0.7
  );
  radialGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // Draw fork and knife icons
  ctx.fillStyle = COLORS.iconColor;

  // Scale factor based on icon size
  const iconScale = size / 1024;
  const utensileScale = 4.5 * iconScale;

  // Position fork and knife with slight offset from center
  const centerX = size / 2;
  const centerY = size / 2;
  const spacing = 55 * iconScale;

  // Draw fork (left side)
  drawFork(ctx, centerX - spacing, centerY, utensileScale);

  // Draw knife (right side)
  drawKnife(ctx, centerX + spacing, centerY, utensileScale);

  return canvas.toBuffer('image/png');
}

/**
 * Generate adaptive icon for Android (with safe zone consideration)
 * @param {number} size - Icon size in pixels
 * @returns {Buffer} PNG buffer
 */
function generateAdaptiveIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Adaptive icons need content in the center 66% (safe zone)
  // The outer 17% on each side may be masked

  // Create gradient background (full bleed)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, COLORS.gradientStart);
  gradient.addColorStop(1, COLORS.gradientEnd);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add subtle radial gradient overlay
  const radialGradient = ctx.createRadialGradient(
    size * 0.3, size * 0.3, 0,
    size * 0.5, size * 0.5, size * 0.7
  );
  radialGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, size, size);

  // Draw fork and knife (slightly smaller for safe zone)
  ctx.fillStyle = COLORS.iconColor;

  const iconScale = size / 1024;
  const utensileScale = 3.8 * iconScale; // Slightly smaller for safe zone

  const centerX = size / 2;
  const centerY = size / 2;
  const spacing = 50 * iconScale;

  drawFork(ctx, centerX - spacing, centerY, utensileScale);
  drawKnife(ctx, centerX + spacing, centerY, utensileScale);

  return canvas.toBuffer('image/png');
}

/**
 * Main function to generate all icons
 */
async function main() {
  console.log('Recipe to Reality - App Icon Generator');
  console.log('======================================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}\n`);
  }

  for (const config of ICON_CONFIGS) {
    const outputPath = path.join(OUTPUT_DIR, config.name);

    let buffer;
    if (config.name === 'adaptive-icon.png') {
      buffer = generateAdaptiveIcon(config.size);
    } else {
      buffer = generateIcon(config.size);
    }

    fs.writeFileSync(outputPath, buffer);
    console.log(`Generated: ${config.name} (${config.size}x${config.size})`);
  }

  console.log('\nAll icons generated successfully!');
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

// Run the script
main().catch((error) => {
  console.error('Error generating icons:', error);
  process.exit(1);
});
