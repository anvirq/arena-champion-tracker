const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const SOURCE_ICON = path.join(__dirname, 'assets', 'icon.png');
const ANDROID_RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const ICON_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

async function createIcon(sourceIcon, targetPath, size) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const image = await loadImage(sourceIcon);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, size, size);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(targetPath, buffer);
  
  console.log(`✅ Created ${size}x${size} icon -> ${targetPath}`);
}

async function generateIcons() {
  console.log('🚀 Generating Android icons...');
  
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`❌ Source icon not found: ${SOURCE_ICON}`);
    return;
  }
  
  if (!fs.existsSync(ANDROID_RES_DIR)) {
    console.error(`❌ Android res directory not found: ${ANDROID_RES_DIR}`);
    console.error('Run "npm run cap:add" first to create the Android project');
    return;
  }
  
  try {
    const promises = [];
    
    for (const [folder, size] of Object.entries(ICON_SIZES)) {
      const targetPath = path.join(ANDROID_RES_DIR, folder, 'ic_launcher.png');
      promises.push(createIcon(SOURCE_ICON, targetPath, size));
      
      const roundIconPath = path.join(ANDROID_RES_DIR, folder, 'ic_launcher_round.png');
      promises.push(createIcon(SOURCE_ICON, roundIconPath, size));
    }
    
    for (const [folder, size] of Object.entries(ICON_SIZES)) {
      const foregroundPath = path.join(ANDROID_RES_DIR, folder, 'ic_launcher_foreground.png');
      promises.push(createIcon(SOURCE_ICON, foregroundPath, size));
    }
    
    await Promise.all(promises);
    
    console.log('🎉 Icon generation completed successfully');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateIcons().catch(err => {
  console.error('❌ Critical error:', err);
});
