const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  const svgPath = path.join(iconsDir, 'icon.svg');
  
  // Проверяем, что SVG файл существует
  if (!fs.existsSync(svgPath)) {
    console.error('SVG файл не найден:', svgPath);
    return;
  }

  // Читаем SVG файл
  const svgBuffer = fs.readFileSync(svgPath);
  
  // Размеры иконок для PWA
  const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];
  
  console.log('Генерация PNG иконок из SVG...');
  
  for (const size of sizes) {
    try {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({
          quality: 100,
          compressionLevel: 9
        })
        .toFile(outputPath);
      
      console.log(`✓ Создана иконка ${size}x${size}: ${outputPath}`);
    } catch (error) {
      console.error(`✗ Ошибка при создании иконки ${size}x${size}:`, error.message);
    }
  }
  
  // Создаем также source файл для будущего использования
  try {
    const sourcePath = path.join(iconsDir, 'icon-source-512.png');
    await sharp(svgBuffer)
      .resize(512, 512, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({
        quality: 100,
        compressionLevel: 9
      })
      .toFile(sourcePath);
    
    console.log(`✓ Создан source файл: ${sourcePath}`);
  } catch (error) {
    console.error('✗ Ошибка при создании source файла:', error.message);
  }
  
  console.log('\n🎉 Генерация иконок завершена!');
}

// Запускаем генерацию
generateIcons().catch(console.error);
