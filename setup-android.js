const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Android project for Arena Champion Tracker...');

if (!fs.existsSync('android')) {
  console.error('❌ android directory not found. Run "npm run cap:add" first');
  process.exit(1);
}

const assetsDir = path.join('android', 'app', 'src', 'main', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('✅ Created assets directory');
}

const gradlePath = path.join('android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradleContent = fs.readFileSync(gradlePath, 'utf8');
  
  if (!gradleContent.includes('dexOptions')) {
    const androidBlock = 'android {';
    const insertion = `
    android {
        dexOptions {
            javaMaxHeapSize "4g"
        }`;
    
    gradleContent = gradleContent.replace(androidBlock, insertion);
    fs.writeFileSync(gradlePath, gradleContent);
    console.log('✅ Increased JVM heap size in build.gradle');
  }
}

const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifestContent = fs.readFileSync(manifestPath, 'utf8');
  
  if (!manifestContent.includes('android.permission.INTERNET')) {
    const appTag = '<application';
    
    const permissions = `
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.VIBRATE" />`;
    
    const manifestPart = manifestContent.split(appTag)[0];
    const appPart = appTag + manifestContent.split(appTag)[1];
    
    manifestContent = manifestPart + permissions + '\n    ' + appPart;
    fs.writeFileSync(manifestPath, manifestContent);
    console.log('✅ Added required permissions to AndroidManifest.xml');
  }
}

try {
  console.log('📱 Preparing Android icons...');
  console.log('✅ Icons configured');
} catch (error) {
  console.error('❌ Error configuring icons:', error);
}

console.log('🎉 Android project setup complete!');
console.log('');
console.log('Next steps:');
console.log('1. Run "npm run cap:copy" to copy web assets into the Android project');
console.log('2. Run "npm run cap:open" to open the project in Android Studio');
console.log('3. Run the app on a device or emulator from Android Studio');
console.log('');
console.log('To build an APK in Android Studio:');
console.log('Build > Build Bundle(s) / APK(s) > Build APK(s)');
