const fs = require('fs');
const { createCanvas } = require('canvas');
const path = require('path');

// Создаем канвас для иконки
const canvas = createCanvas(256, 256);
const ctx = canvas.getContext('2d');

// Фон
ctx.fillStyle = '#0a1428';
ctx.fillRect(0, 0, 256, 256);

// Внешний круг
ctx.beginPath();
ctx.arc(128, 128, 100, 0, Math.PI * 2);
ctx.fillStyle = '#1e2328';
ctx.fill();
ctx.strokeStyle = '#c8aa6e';
ctx.lineWidth = 5;
ctx.stroke();

// Галочка "играл"
ctx.beginPath();
ctx.moveTo(90, 128);
ctx.lineTo(115, 160);
ctx.lineTo(170, 90);
ctx.lineWidth = 12;
ctx.strokeStyle = '#0a7e8c';
ctx.stroke();

// Звезда "первое место"
ctx.fillStyle = '#c8aa6e';
const spikes = 5;
const outerRadius = 25;
const innerRadius = 12;
const centerX = 180;
const centerY = 60;

let rot = Math.PI / 2 * 3;
const step = Math.PI / spikes;

ctx.beginPath();
ctx.moveTo(centerX, centerY - outerRadius);

for (let i = 0; i < spikes; i++) {
  ctx.lineTo(
    centerX + Math.cos(rot) * outerRadius,
    centerY + Math.sin(rot) * outerRadius
  );
  rot += step;
  
  ctx.lineTo(
    centerX + Math.cos(rot) * innerRadius,
    centerY + Math.sin(rot) * innerRadius
  );
  rot += step;
}

ctx.lineTo(centerX, centerY - outerRadius);
ctx.closePath();
ctx.fill();

// Сохраняем PNG иконку
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, 'assets', 'icon.png'), buffer);

console.log('Иконка успешно создана и сохранена в assets/icon.png'); 