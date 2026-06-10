# 塔罗牌占卜小程序 - 需求文档

## 1. 项目概述

| 项目 | 说明 |
|------|------|
| 项目名称 | 塔罗牌占卜小程序（tarot-miniprogram） |
| 技术栈 | UniApp + Vue 3 + TypeScript + Pinia + Vite |
| 目标平台 | 微信小程序（优先），H5 兜底 |
| 视觉风格 | 深色神秘风格，星空/紫蓝色调，金色点缀 |
| 包管理 | pnpm |

---

## 2. 功能需求

### 2.1 首页（`pages/index`）

- **开始占卜入口**：醒目的 CTA 按钮，引导用户进入抽牌流程
- **牌库浏览快捷入口**：展示 78 张塔罗牌的缩略网格，点击进入牌库页
- **占卜记录入口**：最近一次占卜记录的摘要卡片
- **今日运势**：随机展示一张牌作为每日指引（可分享）
- **视觉元素**：星空背景动画、金色粒子效果

### 2.2 抽牌页（`pages/draw`）

- **牌阵选择**：
  - 单张牌（Single）：快速指引
  - 三张牌（Three）：过去-现在-未来
  - 凯尔特十字（Celtic Cross）：10张完整牌阵
- **洗牌动画**：Fisher-Yates 随机洗牌算法 + 牌面滑动动画
- **翻牌交互**：用户点击牌背触发 3D 翻转动画（`rotateY(180deg)`）
- **问题输入**（可选）：用户在抽牌前可输入想占卜的问题
- **动画时序**：洗牌 → 发牌 → 等待点击 → 翻牌 → 渐显解读

### 2.3 结果页（`pages/result`）

- **牌面展示**：完整展示抽到的牌（正位/逆位标识）
- **解读内容**：
  - 每张牌的通用解读（正位/逆位）
  - 对应牌阵位置的含义
  - 爱情/事业/健康方向解读
- **牌面详情弹窗**：点击单张牌查看完整描述、关键词
- **分享海报生成**：Canvas 绘制精美分享图，包含牌面 + 一句话总结 + 小程序码
- **重新占卜**：一键返回抽牌页

### 2.4 牌库页（`pages/cards`）

- **分类浏览**：
  - 大阿卡纳（Major Arcana）：22 张
  - 小阿卡纳（Minor Arcana）：权杖/圣杯/宝剑/星币 各 14 张 = 56 张
- **搜索/筛选**：按名称、关键词搜索
- **牌面详情**：大图展示 + 正逆位完整解读 + 关键词标签
- **列表/网格切换**

### 2.5 历史记录页（`pages/history`）

- **记录列表**：按时间倒序展示历史占卜记录
- **记录详情**：点击展开查看完整牌阵 + 解读
- **删除操作**：单条删除 / 全部清空
- **存储限制**：最多保留 50 条记录（超出自动清除最早记录）
- **数据来源**：本地 Storage（`uni.setStorageSync`）

---

## 3. 非功能需求

| 需求类型 | 描述 |
|----------|------|
| 性能 | 首屏加载 < 2s，翻牌动画 ≥ 60fps |
| 兼容性 | 微信小程序基础库 ≥ 2.20.0 |
| 离线 | 全部牌数据本地化，无需网络请求 |
| 可维护性 | TypeScript 严格模式，模块化组件 |
| UI/UX | 统一深色主题，触觉反馈（`wx.vibrateShort`） |

---

## 4. 数据模型

### 4.1 TarotCard

```typescript
interface TarotCard {
  id: number;                    // 唯一标识
  name: string;                  // 中文名
  nameEn: string;                // 英文名
  arcana: 'major' | 'minor';     // 大/小阿卡纳
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'; // 小阿卡纳牌组
  number: number;                // 牌序编号
  image: string;                 // 牌面图片路径
  keywords: string[];            // 关键词
  upright: Interpretation;       // 正位解读
  reversed: Interpretation;      // 逆位解读
  description: string;           // 牌面描述
}

interface Interpretation {
  meaning: string;               // 通用含义
  love?: string;                 // 爱情
  career?: string;               // 事业
  health?: string;               // 健康
}
```

### 4.2 ReadingRecord

```typescript
interface ReadingRecord {
  id: string;                    // UUID
  timestamp: number;             // 占卜时间戳
  question: string;              // 用户问题
  spreadType: 'single' | 'three' | 'celtic'; // 牌阵类型
  cards: DrawnCard[];            // 抽到的牌
}

interface DrawnCard {
  card: TarotCard;               // 牌数据
  orientation: 'upright' | 'reversed'; // 正位/逆位
  position: string;              // 牌阵位置名（如 "过去"、"现在"、"未来"）
}
```

---

## 5. 目录结构

```
tarot-miniprogram/
├── docs/
│   └── REQUIREMENTS.md          # 本文档
├── src/
│   ├── pages/
│   │   ├── index/index.vue      # 首页
│   │   ├── draw/draw.vue        # 抽牌页
│   │   ├── result/result.vue    # 结果页
│   │   ├── cards/cards.vue      # 牌库页
│   │   └── history/history.vue  # 历史记录页
│   ├── components/
│   │   ├── TarotCard/index.vue  # 单张牌组件（含翻转动画）
│   │   ├── CardSpread/          # 牌阵布局组件
│   │   ├── SpreadSelector/      # 牌阵选择器
│   │   └── SharePoster/         # 分享海报组件
│   ├── store/
│   │   ├── index.ts             # Store 入口
│   │   └── tarot.ts             # 塔罗牌全局状态（Pinia）
│   ├── data/
│   │   ├── index.ts
│   │   ├── tarot-cards.ts       # 78张牌完整数据
│   │   └── spreads.ts           # 牌阵配置
│   ├── utils/
│   │   └── index.ts             # 工具函数（洗牌、解读、海报）
│   ├── types/
│   │   └── index.ts             # TypeScript 类型定义
│   ├── styles/
│   │   ├── variables.scss       # SCSS 变量
│   │   └── global.scss          # 全局样式
│   ├── static/
│   │   ├── cards/               # 78张牌面图片
│   │   └── icons/               # TabBar 图标
│   ├── App.vue
│   ├── main.ts
│   ├── pages.json
│   ├── manifest.json
│   └── env.d.ts
├── .npmrc                       # pnpm 配置
├── package.json
├── tsconfig.json
└── vite.config.ts
```
