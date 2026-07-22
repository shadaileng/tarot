# AGENTS.md — AI 协作指南

> 本文档帮助 AI 编程助手快速理解 `tarot-miniprogram` 项目。
> 修改代码前请先阅读本文档。

## 项目概述

塔罗牌占卜多端应用（微信小程序 + H5），基于 **UniApp Vue3 + TypeScript + Pinia + Vite** 构建，使用 **pnpm** 管理依赖。

```
tarot-miniprogram/
├── src/
│   ├── pages/        # 页面（index / draw / result / cards / history）
│   ├── components/   # 组件（TarotCard / CardDetail / TabBar）
│   ├── store/        # Pinia 状态管理
│   ├── data/         # 静态数据（牌组数据 / 牌阵配置）
│   ├── types/        # TypeScript 类型定义
│   ├── utils/        # 工具函数（token / request / poster）
│   ├── styles/       # 全局样式 & 设计 Token
│   ├── static/       # 静态资源（图片）
│   ├── pages.json    # 路由 & TabBar 配置
│   └── manifest.json # 平台配置（AppID 由 env 注入，不硬编码）
├── .env.example      # 环境变量模板
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | UniApp Vue3（`@dcloudio/uni-app`） |
| 语言 | TypeScript（strict: true） |
| 状态管理 | Pinia |
| 构建工具 | Vite 5 + `@dcloudio/vite-plugin-uni` |
| CSS | SCSS（设计 Token 在 `variables.scss`）+ TailwindCSS（通过 `weapp-tailwindcss`） |
| 包管理 | pnpm（`.npmrc` 中 `shamefully-hoist=true` 不可删除） |

## 规范与约束

### 编码规范
- 使用 Composition API（`<script setup lang="ts">`）
- 页面组件 PascalCase 命名，CSS 类名 kebab-case
- 优先使用 `src/styles/variables.scss` 中的 SCSS 变量，禁止硬编码颜色/尺寸
- 用户可见文本直接写在模板中（不做 i18n）

### UniApp / 微信小程序约束
- `shamefully-hoist=true` 是 UniApp 正确解析依赖的必要条件，不得删除
- 微信小程序不支持某些 CSS（如 `position: fixed` 在 `scroll-view` 内异常）
- 分包限制：单包 ≤ 2MB，总包 ≤ 20MB；图片资源放在 `src/static/`
- 网络请求统一使用 `uni.request()`，**禁止使用** `fetch` 或 `wx.request`，确保跨平台兼容（`fetch` 在微信小程序运行时不可用）
- API 端点统一通过 `src/constants/api.ts` 中的 `API_ENDPOINTS` 常量引用，禁止硬编码
- `vite.config.ts` 通过 `additionalData` 全局注入 `variables.scss`，组件中直接使用变量无需 import

### easycom 组件自动注册
`pages.json` 中配置了 `^T-(.*)` → `@/components/TarotCard/$1.vue`，
目前只有 `TarotCard` 组件使用此规则，新组件放在 `src/components/<Name>/index.vue`。

## 核心数据结构

```
TarotCard { id, name, nameEn, type('major'|Suit), number, image, keywords, uprightMeaning, reversedMeaning, description }
  ↓ drawCards(spreadType, question)
DrawnCard { card: TarotCard, orientation: 'upright'|'reversed', position: string }
  ↓ 组成
ReadingRecord { id, spreadType, spreadName, cards: DrawnCard[], question, timestamp, date }
```

- 牌组数据：`src/data/tarot-cards.ts`（78 张，大阿卡纳 0-21 + 小阿卡纳 4 花色）
- 牌阵配置：`src/data/spreads.ts`（single / three / celtic-cross）
- 状态管理：`src/store/tarot.ts`（Pinia Store，管理当前占卜 + 历史记录，持久化到 `uni.storage`，最多 100 条）

## 页面结构

| 路径 | 说明 | TabBar |
|------|------|--------|
| `pages/index/index` | 首页（入口） | ✅ |
| `pages/draw/draw` | 抽牌页（选择牌阵、执行抽牌） | ✅ |
| `pages/result/result` | 占卜结果页（展示牌面、正逆位解读） | - |
| `pages/cards/cards` | 牌库浏览（78 张牌列表） | ✅ |
| `pages/history/history` | 占卜记录（历史列表、删除） | ✅ |
| `pages/profile/profile` | 我的（用户卡片 + 登录引导） | ✅ |
| `pages/profile-detail/profile-detail` | 个人资料详情（编辑/邮箱绑定/退出） | - |
| `pages/profile-setup/profile-setup` | 首次登录引导（设置头像+昵称） | - |

> TabBar 为自定义组件（`src/components/TabBar/TabBar.vue`），`pages.json` 中 `"custom": true`。

## 用户个人资料

### 页面说明

| 页面 | 路径 | 说明 |
|------|------|------|
| 我的 | `pages/profile/profile.vue` | TabBar「我的」，展示用户卡片（头像、昵称、脱敏 ID）或登录引导 |
| 个人资料 | `pages/profile-detail/profile-detail.vue` | 资料编辑 + 邮箱绑定 + 退出登录 |
| 首次引导 | `pages/profile-setup/profile-setup.vue` | 新用户首次登录引导设置头像和昵称（`chooseAvatar` + `type=nickname`） |

### 资料详情功能（`profile-detail.vue`）

| 字段 | 交互方式 | 说明 |
|------|----------|------|
| 头像 | 点击 → 选择/拍摄 → `uni.uploadFile` → 文件路径 | 通过 `POST /api/upload/avatar` 上传；H5 暂不支持 |
| 昵称 | 内联编辑 → 失焦/确认保存 | 最长 30 字符 |
| 性别 | Picker 选择器（保密/男/女） | 保存成功后同步显示 |
| 生日 | Picker 日期选择器 | 范围 1900-01-01 至今天 |
| 邮箱 | 未绑定时显示「绑定邮箱」按钮 → 弹窗输入邮箱+密码 | 绑定成功自动 `refreshUserInfo()` |
| 退出 | 确认弹窗 → 清除 token 和用户信息 | 返回上一页 |

### 认证服务（`src/services/auth.ts`）

| 函数 | 端点 | 说明 |
|------|------|------|
| `login()` | 自动选择 | 微信小程序 → `wechatLogin()`；H5 → 抛出异常要求使用 `emailLogin` |
| `wechatLogin()` | `POST /api/auth/wechat-login` | 微信 code → JWT |
| `emailLogin(email, password)` | `POST /api/auth/email-login` | H5 邮箱登录 |
| `emailRegister(email, password)` | `POST /api/auth/email-register` | H5 邮箱注册 |
| `bindEmail(email, password)` | `POST /api/auth/bind-email` | 绑定邮箱（触发账号合并） |
| `updateProfile(data)` | `PUT /api/user/profile` | 更新昵称/头像/性别/生日，自动同步本地缓存 |
| `refreshUserInfo()` | `GET /api/user/profile` | 从服务端拉取最新资料并更新缓存 |
| `logout()` | — | 清除 token 和用户信息 |
| `isLoggedIn()` | — | 检查本地 token 是否存在且未过期 |
| `getUserInfo()` | — | 读取本地缓存的用户信息 |
| `getToken()` | — | 获取本地 JWT token |
| `initAuth(handler)` | — | 注册 401 全局回调 |

### Token 管理（`src/utils/token.ts`）

- JWT token 存储 / 读取 / 过期检测
- `getStoredToken()` / `setStoredToken()` / `removeStoredToken()` — token 持久化
- `isLoggedIn()` — 检查 token 存在且未过期（解析 JWT exp 字段）
- `getToken()` — 获取本地 token（`getStoredToken` 别名）
- 独立模块，打破 `request ↔ auth ↔ client-logger` 循环依赖

### 网络请求（`src/utils/request.ts`）

- 基于 `uni.request()`（**禁止**使用 `fetch` 或 `wx.request`）
- 自动注入 `Authorization: Bearer <token>` 请求头
- 401 响应 → 清除 token → 触发 `onUnauthorized` 回调（自动尝试重新登录）
- 400+ 错误 → 抛出 `Error(message)`，`message` 来自 `/api/user/profile` 的 `message` 字段

### 客户端日志服务（`src/services/client-logger.ts`）

- 缓冲区 + 批量上报（每 20 条或 30 秒 flush 一次），不依赖 `request.ts`，直接用 `uni.request`
- 内置脱敏（`SENSITIVE_KEYS`）、去重（G1/G2 异常 5 秒去重 + 1/5 采样）、设备指纹
- **操作链路追踪**：`startTrace()` 生成 traceId，`log()` 自动附加，`endTrace()` 清除
- 16 个用户操作入口已注入 `startTrace/endTrace`，覆盖 pipeline/store/page 三层

### LoginGuide 组件

| 组件 | 平台 | UI |
|------|------|------|
| `LoginGuideWechat.vue` | 微信小程序 | 「微信一键登录」按钮，绿色渐变 |
| `LoginGuideEmail.vue` | H5 | 登录/注册切换表单，邮箱+密码输入，蓝色渐变 |

## 命令

```bash
pnpm install               # 安装依赖（必须用 pnpm，不可用 npm/yarn）
pnpm dev:mp-weixin         # 开发：微信小程序（HBuilderX 或微信开发者工具）
pnpm build:mp-weixin       # 构建：微信小程序生产包 → dist/build/mp-weixin
pnpm dev:h5                # 开发：H5（浏览器访问）
pnpm build:h5              # 构建：H5 生产包 → dist/build/h5
pnpm deploy:cf             # 构建 + 部署 H5 到 Cloudflare Workers（需先 npx wrangler login）

## 环境变量

`.env` 文件包含敏感数据（API 地址、AppID），**不会提交到仓库**。克隆项目后需复制 `.env.example` 为 `.env` 并填入实际值：

```bash
cp .env.example .env
```

| 变量 | 来源 | 用途 | 说明 | 必填 |
|------|------|------|------|:--:|
| `VITE_BACKEND_API` | 后端通信 | 统一后端 tarot-backend 地址 | 构建时注入 `import.meta.env.VITE_BACKEND_API`，值在 `.env` 中配置 | ✅ |
| `TAROT_APPID` | 微信平台 | 微信小程序 AppID | 构建时由 `injectAppidPlugin` 自动写入 `project.config.json`，值在 `.env` 中配置 | ⚠️ ¹ |
| `TAROT_URL_CHECK` | 微信平台 | 域名白名单校验开关 | 构建时由 `injectAppidPlugin` 写入 `project.config.json`，开发环境 `false`，生产环境 `true` | |

> ¹ 部署微信小程序时必填，仅 H5 部署可跳过。

如需为不同环境设置不同值，可创建 `.env.development` 或 `.env.production` 覆盖。所有 `.env*` 文件均被 `.gitignore` 忽略，不会提交到仓库。
GitHub Actions 部署时，`VITE_BACKEND_API` 需在仓库 **Settings → Secrets and variables → Actions → Variables** 中配置，workflow 中通过 `env:` 注入构建过程。

## 部署

### H5 本地预览
```bash
pnpm build:h5
npx wrangler dev            # 本地预览（支持 SPA 路由回退）
```

### Cloudflare Workers 部署

| 方式 | 说明 |
|------|------|
| `pnpm deploy:cf` | Wrangler CLI（构建 + 部署一键完成） |
| 手动分步 | `pnpm build:h5` → `npx wrangler deploy` |
| GitHub Actions | `.github/workflows/deploy.yml`，push `master` 自动部署，Worker 名通过 `vars.CLOUDFLARE_WORKER_NAME` 配置 |

> **注意**：部署前必须配置 `VITE_BACKEND_API` 环境变量，指向 tarot-backend 服务地址（如 `https://api.example.com`），否则 H5 和小程序无法调用后端 API。

> SPA 路由回退通过 `wrangler.toml` 中 `not_found_handling = "single-page-application"` 配置。

### 微信小程序上传
1. `pnpm build:mp-weixin` 构建生产版本
2. 微信开发者工具导入 `dist/build/mp-weixin`
3. 点击「上传」→ 填写版本号 → 在微信公众平台提交审核

> AppID 通过 `TAROT_APPID` 环境变量配置（详见「环境变量」），构建时由 `injectAppidPlugin` 自动注入 `project.config.json`，无需手动修改 `src/manifest.json`。


