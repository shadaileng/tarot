# 🃏 塔罗牌占卜小程序

基于 **UniApp + Vue 3 + TypeScript + Pinia + Vite** 构建的塔罗牌占卜微信小程序。

## 功能特性

- **占卜抽牌** — 支持单张牌、三张牌（过去·现在·未来）、凯尔特十字（10张）三种牌阵
- **翻牌动画** — 3D CSS 翻转动画，Fisher-Yates 洗牌算法，正逆位随机
- **完整牌库** — 78 张塔罗牌（22 张大阿卡纳 + 56 张小阿卡纳），支持分类浏览与搜索
- **解读引擎** — 正逆位完整解读，涵盖爱情、事业、健康方向
- **占卜记录** — 本地存储历史记录，支持查看详情与删除
- **分享海报** — Canvas 绘制精美分享图
- **深色主题** — 星空紫蓝色调，金色点缀，神秘氛围

## 快速开始

### 环境要求

- Node.js ≥ 18
- pnpm ≥ 8
- 微信开发者工具

### 安装依赖

```bash
pnpm install
```

### 开发

```bash
# 微信小程序
pnpm dev:mp-weixin

# H5
pnpm dev:h5
```

### 构建

```bash
# 微信小程序
pnpm build:mp-weixin

# H5
pnpm build:h5
```

构建产物在 `dist/dev/mp-weixin`（开发）或 `dist/build/mp-weixin`（生产），使用微信开发者工具打开该目录即可预览。

## 项目结构

```
tarot-miniprogram/
├── docs/
│   ├── REQUIREMENTS.md      # 需求文档
│   └── PLAN.md              # 执行规划
├── src/
│   ├── pages/               # 页面
│   │   ├── index/           # 首页
│   │   ├── draw/            # 抽牌页
│   │   ├── result/          # 结果页
│   │   ├── cards/           # 牌库页
│   │   └── history/         # 历史记录页
│   ├── components/          # 组件
│   │   ├── TarotCard/       # 单张牌组件
│   │   └── CardSpread/      # 牌阵布局组件
│   ├── store/               # Pinia 状态管理
│   ├── data/                # 78张牌数据 + 牌阵配置
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript 类型
│   ├── styles/              # SCSS 变量与全局样式
│   └── static/              # 静态资源
├── .npmrc                   # pnpm 配置
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | UniApp (Vue 3) |
| 语言 | TypeScript |
| 状态管理 | Pinia |
| 构建 | Vite |
| 样式 | SCSS |
| 包管理 | pnpm |
| 目标平台 | 微信小程序 / H5 |

## 相关文档

- [需求文档](./docs/REQUIREMENTS.md)
- [执行规划](./docs/PLAN.md)
- [UniApp 文档](https://uniapp.dcloud.net.cn/)
- [微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/)
