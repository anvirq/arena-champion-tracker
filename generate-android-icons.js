// Скрипт для генерации иконок Android различных размеров
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const SOURCE_ICON = path.join(__dirname, 'assets', 'icon.png');
const ANDROID_RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Размеры иконок для Android
const ICON_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

// Функция для создания квадратной иконки с заданным размером
async function createIcon(sourceIcon, targetPath, size) {
  // Создаем директорию назначения, если не существует
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Загружаем исходное изображение
  const image = await loadImage(sourceIcon);
  
  // Создаем canvas с нужным размером
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Рисуем изображение на canvas с масштабированием
  ctx.drawImage(image, 0, 0, size, size);
  
  // Сохраняем результат в PNG файл
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(targetPath, buffer);
  
  console.log(`✅ Создана иконка ${size}x${size} -> ${targetPath}`);
}

// Основная функция для генерации всех иконок
async function generateIcons() {
  console.log('🚀 Генерация иконок для Android...');
  
  // Проверяем наличие исходной иконки
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`❌ Исходная иконка не найдена: ${SOURCE_ICON}`);
    return;
  }
  
  // Проверяем наличие директории ресурсов Android
  if (!fs.existsSync(ANDROID_RES_DIR)) {
    console.error(`❌ Директория ресурсов Android не найдена: ${ANDROID_RES_DIR}`);
    console.error('Сначала выполните "npm run cap:add" для создания проекта Android');
    return;
  }
  
  // Создаем иконки всех размеров
  try {
    const promises = [];
    
    for (const [folder, size] of Object.entries(ICON_SIZES)) {
      const targetPath = path.join(ANDROID_RES_DIR, folder, 'ic_launcher.png');
      promises.push(createIcon(SOURCE_ICON, targetPath, size));
      
      // Также создаем круглую иконку (в реальном проекте нужно модифицировать изображение)
      const roundIconPath = path.join(ANDROID_RES_DIR, folder, 'ic_launcher_round.png');
      promises.push(createIcon(SOURCE_ICON, roundIconPath, size));
    }
    
    // Создаем адаптивную иконку (foreground и background)
    for (const [folder, size] of Object.entries(ICON_SIZES)) {
      const foregroundPath = path.join(ANDROID_RES_DIR, folder, 'ic_launcher_foreground.png');
      promises.push(createIcon(SOURCE_ICON, foregroundPath, size));
    }
    
    // Ждем завершения всех задач
    await Promise.all(promises);
    
    console.log('🎉 Генерация иконок завершена успешно');
  } catch (error) {
    console.error('❌ Ошибка при генерации иконок:', error);
  }
}

// Запускаем генерацию
generateIcons().catch(err => {
  console.error('❌ Критическая ошибка:', err);
}); 