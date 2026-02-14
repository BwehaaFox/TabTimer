const sharp = require('sharp');
const fs = require('fs');

// Создаем изображение с таймером
const createTimerIcon = async () => {
  // Создаем пустое изображение
  const width = 64;
  const height = 64;
  
  // Создаем SVG с таймером
  const svgString = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Фон -->
      <rect width="${width}" height="${height}" fill="white"/>
      
      <!-- Основной круг таймера -->
      <circle cx="32" cy="32" r="25" stroke="black" stroke-width="3" fill="none"/>
      
      <!-- Часовая стрелка -->
      <line x1="32" y1="32" x2="32" y2="20" stroke="black" stroke-width="2"/>
      
      <!-- Минутная стрелка -->
      <line x1="32" y1="32" x2="40" y2="32" stroke="black" stroke-width="2"/>
      
      <!-- Маркеры часов -->
      ${Array.from({length: 12}, (_, i) => {
        const angle = (i * 30) * Math.PI / 180;
        const x = 32 + 20 * Math.sin(angle);
        const y = 32 - 20 * Math.cos(angle);
        return `<circle cx="${x}" cy="${y}" r="1.5" fill="black"/>`;
      }).join('')}
    </svg>
  `;
  
  // Конвертируем SVG в PNG
  const pngBuffer = await sharp(Buffer.from(svgString)).png().toBuffer();
  
  // Сохраняем изображение
  fs.writeFileSync('./electron/assets/icon.png', pngBuffer);
  
  console.log('Иконка успешно создана!');
};

createTimerIcon().catch(console.error);