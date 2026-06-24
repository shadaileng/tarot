# Changelog

All notable changes to the Tarot MiniProgram will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.1] - 2026-06-22

### Fixed

- 用户信息页布局与 AUTH_PLAN 文档对齐：新增页面标题、ID 展示行、重构垂直布局、手机号脱敏

## [1.7.0] - 2026-06-22

### Added

- H5 端新增邮箱登录/注册表单，支持登录和注册模式切换

### Changed

- 登录组件 `LoginGuide.vue` 重构为薄包装，仅做平台分发
- 新增 `LoginGuideWechat.vue`，提取小程序端微信登录全量代码（零条件编译）
- 新增 `LoginGuideEmail.vue`，实现 H5 端邮箱登录/注册表单

### Fixed

- 修复 H5 端"我的"页面未登录时空白的问题（之前无邮箱登录 UI）

## [1.6.0] - 2026-06-22

### Added

- 新增 `pages/profile/profile.vue` 个人中心页面，承载账户管理功能（登录/头像/昵称/手机号绑定/邮箱绑定/退出登录）

### Changed

- TabBar 第四个 Tab 由 history（记录）替换为 profile（我的）
- `pages.json` 新增 profile 页面入口，TabBar 列表同步更新
- `TabBar` 组件新增 `pages/profile/profile` 图标映射
- `index`/`draw`/`cards` 页面的 `tabList` 同步更新

### Fixed

- `history.vue` 去除所有账户管理功能，恢复为纯粹的占卜记录列表页

## [1.5.1] - 2026-06-22

### Fixed

- 修复自定义 TabBar 最后一个标签仍显示"记录"而非"我的"的问题（`pages.json` 已改，但四个页面的本地 `tabList` 未同步更新）

## [1.5.0] - 2026-06-22

### Added

- 第四个 Tab「记录」改名为「我的」，新增 profile 人物图标（44×44 PNG，线描风格）
- 新增 `scripts/generate-tab-icons.js`：Tab 图标生成脚本，使用 sharp 将 SVG 转 PNG

## [1.1.4] - 2026-06-18

### Changed

- H5 部署从 Cloudflare Pages 迁移到 Cloudflare Workers（Assets 模式）
- SPA 路由回退改用 `not_found_handling = "single-page-application"`，移除 `_redirects`
- GitHub Actions 部署命令改为 `wrangler deploy`，Worker 名通过 `CLOUDFLARE_WORKER_NAME` 环境变量配置
- 统一后端 API 地址：`VITE_API_URL` + `VITE_POSTER_API` 合并为 `VITE_BACKEND_API`
- TabBar 图标组件优化：改用 `<image>` 标签替代 CSS `background-image`，修复微信小程序兼容性
- 更新环境变量文档和 TypeScript 类型定义
- 移除所有 AI 相关字眼（AI → 深度/在线），符合个人开发者小程序审核要求

## [1.1.3] - 2026-06-18

### Fixed

- 修复分享海报弹窗按钮在部分机型被裁切不可见的问题（移除 JS 固定高度计算，改用 CSS flex 自适应 + overflow-y: auto）
- 修复分享海报弹窗触摸穿透导致背景滚动的问题（overlay 添加 catchtouchmove）

## [1.1.2] - 2026-06-18

### Fixed

- 修复微信小程序底部 Tab 图标仍不显示的问题（PNG 图片替换 SVG data URI，微信不支持 data:image/svg+xml 作为 CSS background-image）

## [1.1.1] - 2026-06-17

### Fixed

- 修复底部 Tab 栏图标在微信小程序中不显示的问题（内联 SVG 标签替换为 data URI background-image，部分环境仍不生效）
- 修复分享海报弹窗点击内容区时误关闭的问题（.self 修饰符替换为手动 e.target 判断 + @click.stop）

## [1.1.0] - 2026-06-17

### Added

- 塔罗牌小程序初始版本（首页、抽牌、结果展示、牌库浏览、历史记录五大页面）
- 78 张 SVG 矢量塔罗牌占位牌面
- 接入 Cloudflare Workers AI 实现塔罗牌个性化解读
- 接入 Cloudflare Worker AI 解读 API + 本地降级策略
- 首页添加后台服务可用性分层健康检测
- 分享海报中添加综合解读区块，优化海报卡片样式和综合解读布局
- 前端分平台海报生成方案（微信小程序用 Canvas 2x API，H5 用 html2canvas）
- AI 解读格式不完整时的混合降级方案（结构化萃取 + 兜底文案）
- 问题输入标题行添加 AI 调用开关，允许用户关闭 AI 解读
- 前端海报生成迁移到后端微服务方案（tarot-poster-service），统一海报渲染管线
- 添加海报服务 API 环境变量（`VITE_POSTER_API`）
- 重构发牌动画：弧线飞行 + 拖尾粒子 + 落地光晕效果
- 飞行动画从 CSS Keyframe 改为 JS 帧驱动，提升动画流畅度
- 海报支持 dark / light 主题切换
- 按平台区分海报模板：H5 使用 `default` 模板，微信小程序使用 `wechat` 模板

### Changed

- Worker 目录迁移到独立项目 `tarot-reading-api`，解耦解读服务
- 全项目统一替换 `fetch` 为 `uni.request`，确保微信小程序运行时兼容性，新增网络请求编码规范

### Fixed

- 修复海报牌阵卡片布局溢出和文字超界问题
- 修复分享海报综合解读区块不显示的问题
- 修复分享海报文字被压缩、行高异常的问题
- 修复 H5 海报因全 absolute 定位导致的布局错乱，改用 flex 文档流布局
- 修复海报弹窗高度超出屏幕、无法滚动到底部的问题
- 修复海报图片区域无法滚动的问题
- 弹窗高度改为自适应内容 + `max-height: 90vh`，整体可滚动
- 海报图片限制在弹窗内容区内展示，恢复底部操作按钮
- 修正 `bodyAvailableH` 计算逻辑，移除 overlay padding 扣减，添加 300px 兜底高度
- 弹窗高度在初始化时固定，加载中与完成态保持统一高度，避免高度跳动
- 修复 GitHub Actions `deploy.yml` CI/CD 配置错误
- CI 环境升级 Node.js 到 v22，锁定 pnpm 版本为 v10
- 海报默认主题固定为 dark，移除系统主题自动检测导致的闪烁
- 修复凯尔特十字牌阵的牌位归一化坐标偏差
- 修复抽牌动画结束后界面无法滚动的问题
- 修复三牌阵在移动端只能看到中间牌、左右牌被遮挡的问题

### Docs

- 优化 `AGENTS.md` 结构，新增项目目录树、数据流图和页面结构说明
- 补充 `VITE_API_URL` 在 GitHub Actions 部署中的配置说明
- 添加后台海报生成方案文档（本地 / Docker / HuggingFace Spaces 三种部署方式），统一使用 pnpm 管理依赖
- 添加项目后继开发规划书 `ROADMAP.md`
- 在 `AGENTS.md` 中新增 Git 提交规范章节

[1.1.3]: https://github.com/your-org/tarot-miniprogram/releases/tag/v1.1.3
[1.1.2]: https://github.com/your-org/tarot-miniprogram/releases/tag/v1.1.2
[1.1.0]: https://github.com/your-org/tarot-miniprogram/releases/tag/v1.1.0
