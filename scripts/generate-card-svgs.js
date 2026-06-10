const fs = require('fs')
const path = require('path')

const CARDS_DIR = path.resolve(__dirname, '../src/static/cards')

// ===== 花色配色 =====
const suitColors = {
  major: { bg: ['#2d1b69', '#1a0a3e'], accent: '#c9a96e', symbol: '✦' },
  wands: { bg: ['#5c2a0e', '#3b1a06'], accent: '#e8a84c', symbol: '🪵' },
  cups: { bg: ['#0d3b5c', '#061e33'], accent: '#5b9bd5', symbol: '🏆' },
  swords: { bg: ['#2c3e50', '#1a252f'], accent: '#a0b4c8', symbol: '⚔' },
  pentacles: { bg: ['#1a4a2e', '#0d2a18'], accent: '#7bc67e', symbol: '🪙' },
}

// ===== 大阿卡纳（22张）=====
const majorArcana = [
  { id: 'major-00', num: '0', name: '愚者', en: 'The Fool' },
  { id: 'major-01', num: 'I', name: '魔术师', en: 'The Magician' },
  { id: 'major-02', num: 'II', name: '女祭司', en: 'The High Priestess' },
  { id: 'major-03', num: 'III', name: '女皇', en: 'The Empress' },
  { id: 'major-04', num: 'IV', name: '皇帝', en: 'The Emperor' },
  { id: 'major-05', num: 'V', name: '教皇', en: 'The Hierophant' },
  { id: 'major-06', num: 'VI', name: '恋人', en: 'The Lovers' },
  { id: 'major-07', num: 'VII', name: '战车', en: 'The Chariot' },
  { id: 'major-08', num: 'VIII', name: '力量', en: 'Strength' },
  { id: 'major-09', num: 'IX', name: '隐士', en: 'The Hermit' },
  { id: 'major-10', num: 'X', name: '命运之轮', en: 'Wheel of Fortune' },
  { id: 'major-11', num: 'XI', name: '正义', en: 'Justice' },
  { id: 'major-12', num: 'XII', name: '倒吊人', en: 'The Hanged Man' },
  { id: 'major-13', num: 'XIII', name: '死神', en: 'Death' },
  { id: 'major-14', num: 'XIV', name: '节制', en: 'Temperance' },
  { id: 'major-15', num: 'XV', name: '恶魔', en: 'The Devil' },
  { id: 'major-16', num: 'XVI', name: '高塔', en: 'The Tower' },
  { id: 'major-17', num: 'XVII', name: '星星', en: 'The Star' },
  { id: 'major-18', num: 'XVIII', name: '月亮', en: 'The Moon' },
  { id: 'major-19', num: 'XIX', name: '太阳', en: 'The Sun' },
  { id: 'major-20', num: 'XX', name: '审判', en: 'Judgement' },
  { id: 'major-21', num: 'XXI', name: '世界', en: 'The World' },
]

// ===== 小阿卡纳（56张）=====
const suitMeta = {
  wands: { cn: '权杖', en: 'Wands' },
  cups: { cn: '圣杯', en: 'Cups' },
  swords: { cn: '宝剑', en: 'Swords' },
  pentacles: { cn: '星币', en: 'Pentacles' },
}

const minorRankNames = {
  wands: ['王牌', '二', '三', '四', '五', '六', '七', '八', '九', '十', '侍从', '骑士', '王后', '国王'],
  cups: ['王牌', '二', '三', '四', '五', '六', '七', '八', '九', '十', '侍从', '骑士', '王后', '国王'],
  swords: ['王牌', '二', '三', '四', '五', '六', '七', '八', '九', '十', '侍从', '骑士', '王后', '国王'],
  pentacles: ['王牌', '二', '三', '四', '五', '六', '七', '八', '九', '十', '侍从', '骑士', '王后', '国王'],
}

// ===== 生成单张 SVG =====
function generateSVG({ id, suit, num, name, en }) {
  const colors = suitColors[suit]
  const [bg1, bg2] = colors.bg

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 660" width="400" height="660">
  <defs>
    <linearGradient id="bg-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg1}"/>
      <stop offset="100%" style="stop-color:${bg2}"/>
    </linearGradient>
    <linearGradient id="border-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.accent}"/>
      <stop offset="100%" style="stop-color:${colors.accent}88"/>
    </linearGradient>
  </defs>

  <!-- 牌面背景 -->
  <rect x="8" y="8" width="384" height="644" rx="20" ry="20" fill="url(#bg-${id})" stroke="url(#border-${id})" stroke-width="3"/>

  <!-- 内边框 -->
  <rect x="28" y="28" width="344" height="604" rx="14" ry="14" fill="none" stroke="${colors.accent}" stroke-width="1" opacity="0.3"/>

  <!-- 牌号/罗马数字 -->
  <text x="200" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="bold"
        fill="${colors.accent}" opacity="0.9">${num}</text>

  <!-- 花色符号 -->
  <text x="200" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="40"
        fill="${colors.accent}" opacity="0.5">${colors.symbol}</text>

  <!-- 牌名（中文） -->
  <text x="200" y="430" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="32" font-weight="bold" fill="${colors.accent}">${name}</text>

  <!-- 英文名 -->
  <text x="200" y="478" text-anchor="middle" font-family="Georgia,serif" font-size="16"
        fill="${colors.accent}" opacity="0.5">${en}</text>

  <!-- 底部装饰线 -->
  <line x1="80" y1="540" x2="320" y2="540" stroke="${colors.accent}" stroke-width="0.5" opacity="0.2"/>
</svg>`
}

// ===== 主逻辑 =====
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true })
}

let count = 0

// 生成大阿卡纳
majorArcana.forEach((card) => {
  const svg = generateSVG({ ...card, suit: 'major' })
  fs.writeFileSync(path.join(CARDS_DIR, `${card.id}.svg`), svg, 'utf-8')
  console.log(`✅ ${card.id}.svg`)
  count++
})

// 生成小阿卡纳
Object.entries(suitMeta).forEach(([suit, meta]) => {
  minorRankNames[suit].forEach((rankName, i) => {
    const num = String(i + 1).padStart(2, '0')
    const id = `minor-${suit}-${num}`
    const enRank = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King']
    const displayNum = i === 0 ? 'A' : (i < 10 ? String(i + 1) : ['P', 'K', 'Q', 'K'][i - 10])
    const svg = generateSVG({
      id,
      suit,
      num: displayNum,
      name: `${meta.cn}${rankName}`,
      en: `${enRank[i]} of ${meta.en}`,
    })
    fs.writeFileSync(path.join(CARDS_DIR, `${id}.svg`), svg, 'utf-8')
    console.log(`✅ ${id}.svg`)
    count++
  })
})

console.log(`\n🎉 完成！共生成了 ${count} 张 SVG 牌面。`)
