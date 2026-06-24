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

---

## 环境变量

项目使用 `.env` 文件管理环境配置。`.env` 包含敏感数据（API 地址、AppID），**不会提交到仓库**。克隆项目后需复制模板并填入实际值：

```bash
cp .env.example .env
```

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_API_URL` | AI 解读后台 API 地址（Vite 注入到 `import.meta.env`） | `https://tarot-reading-api.xxx.workers.dev` |
| `VITE_POSTER_API` | 海报微服务地址（Vite 注入到 `import.meta.env`） | `http://localhost:3000` |
| `TAROT_APPID` | 微信小程序 AppID（构建时自动写入 `project.config.json`） | `wxxxxxxxxxxxxxxx` |
| `TAROT_URL_CHECK` | 是否校验域名白名单（构建时写入 `project.config.json`） | `false`（开发） / `true`（生产） |

如需为不同环境设置不同值，可创建 `.env.development` 或 `.env.production` 覆盖。所有 `.env*` 文件均被 `.gitignore` 忽略，不会提交到仓库。

> `TAROT_APPID` 由 Vite 插件在构建时自动注入 `dist/*/mp-weixin/project.config.json`，无需手动修改 `src/manifest.json`。

---

## 部署

### H5 本地预览

构建后在本地启动预览：

```bash
pnpm build:h5
npx wrangler dev                          # 使用 wrangler（推荐，支持 SPA 路由）
```

### 部署 H5 到 Cloudflare Workers

H5 构建产物 (`dist/build/h5/`) 部署到 Cloudflare Workers，支持两种方式：

**方式一：Wrangler CLI（推荐，已配置脚本）**

```bash
# 一键构建 + 部署
pnpm deploy:cf

# 或分步执行
pnpm build:h5
npx wrangler deploy
```

首次运行需登录：`npx wrangler login`。

**方式二：GitHub Actions 自动部署（推荐 CI/CD）**

项目已配置 `.github/workflows/deploy.yml`，push 到 `master` 分支自动触发构建部署。

前置配置（在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加）：

| 类型 | 名称 | 说明 |
|------|------|------|
| Secrets | `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| Secrets | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| Variables | `CLOUDFLARE_WORKER_NAME` | Worker 名称（如 `tarot`） |
| Variables | `VITE_BACKEND_API` | 后台 API 地址 |

配置完成后，push 代码到 `master` 分支即可自动部署。

> SPA 路由回退通过 `wrangler.toml` 中 `not_found_handling = "single-page-application"` 配置。

### 微信小程序上传

1. 运行 `pnpm build:mp-weixin` 构建生产版本
2. 打开微信开发者工具，导入项目目录 `dist/build/mp-weixin`
3. 在开发者工具中点击 **上传** 按钮，填写版本号和项目备注
4. 登录 [微信公众平台](https://mp.weixin.qq.com)，在「版本管理」中提交审核

> AppID 通过 `TAROT_APPID` 环境变量配置（详见「环境变量」），构建时自动注入 `project.config.json`，无需手动修改 `src/manifest.json`。

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
├── .env.example             # 环境变量模板
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

## 实现顺序

> 本节汇总 docs/ 目录下开发计划的落地时序。状态：✅ 已完成  🟡 进行中  ⬜ 待实施

### 阶段 0：MVP 收尾

| 顺序 | 计划文档 | 范围 | 状态 |
|:---:|---------|------|:---:|
| 0.1 | `docs/PLAN.md` §阶段 1-2 | 5 页面骨架 + 78 张牌数据 | ✅ |
| 0.2 | `docs/PLAN.md` §阶段 3 | 抽牌核心逻辑（洗牌/翻牌/正逆位） | ✅ |
| 0.3 | `docs/PLAN.md` §阶段 4 | 历史记录 + 分享海报（前端版） | ✅ |

### 阶段 1：海报后端化（前后端拆分）

| 顺序 | 计划文档 | 范围 | 状态 |
|:---:|---------|------|:---:|
| 1.1 | `docs/POSTER_BACKEND_PLAN.md` | 后端 Puppeteer 截图 + 前端 fetch 化 | ✅ |
| 1.2 | `docs/POSTER_SPLIT_PLAN.md` | SharePosterMP.vue / SharePosterH5.vue 拆分 | ⬜ |

### 阶段 2：用户系统（多端联合）

| 顺序 | 计划文档 | 范围 | 状态 |
|:---:|---------|------|:---:|
| 2.1 | `docs/AUTH_PLAN.md` §小程序 | wx.login + /auth/wx-login + token 存储 | 🟡 |
| 2.2 | `docs/AUTH_PLAN.md` §H5 | 邮箱注册/登录 + unionid 跨端绑定 | ⬜ |

### 阶段 3：MVP 提审上线

| 顺序 | 计划文档 | 范围 | 状态 |
|:---:|---------|------|:---:|
| 3.1 | `docs/ROADMAP.md` §L1 A1 | 发牌飞入动画 | ⬜ |
| 3.2 | `docs/ROADMAP.md` §L1 A2 | 微信分享 API | ⬜ |
| 3.3 | `docs/ROADMAP.md` §L1 A5 | 真机测试 & 提审 | ⬜ |

### 阶段 4：远期规划

- L2 每日运势 / 收藏 / 社交分享 → `docs/ROADMAP.md` §L2
- L3 ComfyUI AI 牌面 / 自定义牌阵 → `docs/ROADMAP.md` §L3

### 跨项目依赖

- 📦 前置依赖：需 tarot-backend 启动 /reading /poster 接口
- 📦 协作依赖：需 tarot-backend 阶段 3.1（users 表就绪）才能联调阶段 2.x
- 📦 被依赖：tarot-admin 阶段 3.1 需有真实 users 数据才能展示

## 相关文档

- [需求文档](./docs/REQUIREMENTS.md)
- [执行规划](./docs/PLAN.md)
- [UniApp 文档](https://uniapp.dcloud.net.cn/)
- [微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/)
