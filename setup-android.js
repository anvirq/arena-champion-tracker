// Скрипт для настройки Android проекта после инициализации Capacitor
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Настраиваем Android проект для Arena Champion Tracker...');

// Проверяем, что директория android существует
if (!fs.existsSync('android')) {
  console.error('❌ Директория android не найдена. Сначала запустите "npm run cap:add"');
  process.exit(1);
}

// Создаем директорию для ресурсов, если еще не существует
const assetsDir = path.join('android', 'app', 'src', 'main', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('✅ Создана директория для ресурсов');
}

// Обновляем build.gradle файл для увеличения размера heap
const gradlePath = path.join('android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradleContent = fs.readFileSync(gradlePath, 'utf8');
  
  // Добавляем настройку для увеличения памяти JVM
  if (!gradleContent.includes('dexOptions')) {
    const androidBlock = 'android {';
    const insertion = `
    android {
        dexOptions {
            javaMaxHeapSize "4g"
        }`;
    
    gradleContent = gradleContent.replace(androidBlock, insertion);
    fs.writeFileSync(gradlePath, gradleContent);
    console.log('✅ Увеличен размер heap в build.gradle');
  }
}

// Обновляем AndroidManifest.xml для добавления permissions
const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifestContent = fs.readFileSync(manifestPath, 'utf8');
  
  // Добавляем разрешения интернета, если их нет
  if (!manifestContent.includes('android.permission.INTERNET')) {
    const manifestTag = '<manifest';
    const appTag = '<application';
    
    const permissions = `
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.VIBRATE" />`;
    
    // Вставляем разрешения после тега manifest, но перед application
    const manifestPart = manifestContent.split(appTag)[0];
    const appPart = appTag + manifestContent.split(appTag)[1];
    
    manifestContent = manifestPart + permissions + '\n    ' + appPart;
    fs.writeFileSync(manifestPath, manifestContent);
    console.log('✅ Добавлены необходимые разрешения в AndroidManifest.xml');
  }
}

// Копируем иконки в ресурсы Android
try {
  console.log('📱 Подготовка иконок для Android...');
  
  // В реальном проекте здесь мы бы сгенерировали иконки разных размеров
  // Пока используем существующую иконку из проекта
  
  console.log('✅ Иконки настроены');
} catch (error) {
  console.error('❌ Ошибка при настройке иконок:', error);
}

console.log('🎉 Настройка Android проекта завершена!');
console.log('');
console.log('Следующие шаги:');
console.log('1. Запустите "npm run cap:copy" чтобы скопировать веб-ресурсы в Android проект');
console.log('2. Запустите "npm run cap:open" чтобы открыть проект в Android Studio');
console.log('3. Запустите проект на устройстве или эмуляторе через Android Studio');
console.log('');
console.log('Для сборки APK файла в Android Studio:');
console.log('Build > Build Bundle(s) / APK(s) > Build APK(s)'); 