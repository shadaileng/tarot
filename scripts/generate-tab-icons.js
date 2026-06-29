/**
 * 生成 Tab 图标脚本
 * 为"我的" Tab 生成 SVG 并转换为 44×44 PNG
 * 图标风格：卡牌主题 线描风格
 *
 * 颜色：
 *   normal: #6b5e53 (棕色，未选中状态)
 *   active: #c9a96e (金色，选中状态)
 *
 * 用法：node scripts/generate-tab-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.resolve(__dirname, '../src/static/icons');
const SIZE = 44;

const normalColor = '#6b5e53';
const activeColor = '#c9a96e';

/**
 * 生成"我的/个人中心"图标的 SVG
 * 设计：圆顶头部 + 弧形肩身线，经典的 user/profile 面性图标
 */
function generateProfileSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">
    <circle cx="22" cy="15" r="6" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M10 34c0-6.5 5.4-11.5 12-11.5s12 5 12 11.5" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true });

  const items = [
    { name: 'profile', color: normalColor },
    { name: 'profile-active', color: activeColor },
  ];

  for (const { name, color } of items) {
    const svg = generateProfileSvg(color);
    const outputPath = path.join(iconsDir, `${name}.png`);
    await sharp(Buffer.from(svg))
      .resize(SIZE, SIZE)
      .png()
      .toFile(outputPath);
    console.log(`✓ ${name}.png (${SIZE}×${SIZE}, ${color})`);
  }

  console.log('\n🎉 图标生成完成！');
}

main().catch(err => {
  console.error('❌ 生成失败:', err);
  process.exit(1);
});
