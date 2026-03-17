import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = [192, 512];
const inputSvg = path.join(process.cwd(), 'public', 'icon.svg');
const outputDir = path.join(process.cwd(), 'public');

async function generateIcons() {
  console.log('🚀 Generating icons...');
  
  if (!fs.existsSync(inputSvg)) {
    console.error('❌ Error: public/icon.svg not found');
    process.exit(1);
  }

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${size}x${size} icon`);
  }

  // Apple touch icon
  await sharp(inputSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('✅ Generated apple-touch-icon.png');

  // Favicon
  await sharp(inputSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(outputDir, 'favicon.png'));
  console.log('✅ Generated favicon.png');

  console.log('✨ Icon generation complete!');
}

generateIcons().catch(console.error);
