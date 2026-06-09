# AGENTS.md — AI 协作指南

本文档为 AI 编程助手在 `tarot-miniprogram` 项目中协作时提供上下文与规范。

## 项目概述

塔罗牌占卜微信小程序，基于 UniApp (Vue 3 + TypeScript + Pinia + Vite) 构建，使用 pnpm 管理依赖。

## 技术约束

1. **UniApp 兼容性**：`.npmrc` 中 `shamefully-hoist=true` 是必需的，确保 UniApp 能正确解析依赖。
2. **微信小程序限制**：
   - 不支持部分 CSS 属性（如 `position: fixed` 在 `scroll-view` 内表现异常）
   - 包体积限制：单个分包 ≤ 2MB，总包 ≤ 20MB
   - 所有图片资源应放在 `src/static/` 下
3. **SCSS 变量**：所有颜色、尺寸等设计 Token 定义在 `src/styles/variables.scss`，通过 `vite.config.ts` 的 `additionalData` 全局注入。
4. **TypeScript 严格模式**：`tsconfig.json` 中 `strict: true`。

## 关键文件约定

| 文件 | 作用 |
|------|------|
| `src/pages.json` | 路由、TabBar、全局样式配置 |
| `src/manifest.json` | 微信小程序 AppID 等平台配置 |
| `src/types/index.ts` | 所有 TypeScript 接口定义 |
| `src/data/tarot-cards.ts` | 78 张牌完整数据 |
| `src/data/spreads.ts` | 牌阵配置 |
| `src/store/tarot.ts` | Pinia Store（全局状态） |
| `src/utils/index.ts` | 工具函数（洗牌、解读、存储） |
| `.npmrc` | pnpm 配置（不可删除） |

## 组件约定

- TarotCard 组件通过 `pages.json` 中的 `easycom` 配置，以 `T-` 前缀自动注册（如 `<T-TarotCard />`）。
- 所有新组件放在 `src/components/` 下，以目录 + `index.vue` 方式组织。

## 编码规范

- 使用 Composition API（`<script setup lang="ts">`）
- 页面级组件使用 PascalCase 命名
- CSS 类名使用 kebab-case
- 优先使用 SCSS 变量而非硬编码颜色/尺寸
- 所有用户可见的文本应直接写在模板中（本阶段不做 i18n）

## 当前进度

项目基础架构约 50% 完成。详见 `docs/PLAN.md`。

### 待开发功能（按优先级）

1. 翻牌动画（CSS 3D `rotateY`）
2. 发牌动画（牌堆飞入牌阵）
3. 牌阵选择器组件
4. 牌面详情弹窗
5. Canvas 分享海报
6. 星空背景粒子效果
7. 触觉反馈
8. 空状态/错误边界处理

## 命令

```bash
pnpm install              # 安装依赖
pnpm dev:mp-weixin        # 开发（微信小程序）
pnpm build:mp-weixin      # 构建（微信小程序）
pnpm dev:h5               # 开发（H5）
pnpm build:h5             # 构建（H5）
```
