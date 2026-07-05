# Changelog

All notable changes to the Tarot MiniProgram will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.11.0] - 2026-07-05

### Added

- 新增 traceId 操作链路追踪：同一用户操作的所有事件通过 `traceId` 归组
  - `client-logger.ts` 新增 `startTrace()`/`endTrace()`/`getTraceId()` API
  - `log()` 自动附加 `currentTraceId` 到每个事件
  - 16 个用户操作入口注入 `startTrace/endTrace`：
    - Store：`drawCards`/`fetchInterpretation`/`viewRecord`/`cancelRecordTask`/`deleteRecord`/`upgradeToOnlineReading`
    - 页面：签到/任务领取/反馈提交/邀请绑定/个人资料编辑（昵称/头像/性别/生日/邮箱）/海报保存

## [2.10.0] - 2026-07-05

### Added

- 补全全量客户端埋点（20+ 新增事件），覆盖审计发现的 44 个缺口：
  - 海报类：`poster_save_click`/`poster_save_success`/`poster_save_fail`（海报保存全链路）、`poster_generate_step_fail`（MP-WeChat 三步生成各环节）
  - 解读类：`cancel_reading`（取消解读）、`delete_record`（删除记录）、`view_record`/`view_record_not_found`（查看历史）
  - 认证类：`email_login_fail`/`email_register_fail`/`profile_update_fail`（失败路径补全）、`bind_email`（邮箱绑定）、`refresh_user_info`（用户信息刷新）
  - 同步类：`update_cloud_interpretation`（云端解读更新）、`upload_unsynced_batch`（批量上传）
  - 个人中心：`nickname_save`/`avatar_upload`/`gender_save`/`birthday_save`/`bind_email_submit`
  - 用户行为：`checkin_status_load`/`task_list_load`/`feedback_image_upload`/`invite_records_load`
  - 基础设施：`api_client_error`（4xx 请求）、`image_load_fail`（牌面图片加载）、`poster_modal_open`（海报弹窗）
  - 修正 `pullAndMerge`/`deleteCloudRecord`/`updateCloudRecordInterpretation` 中 `console.warn` → logger

## [2.9.2] - 2026-07-05

### Fixed

- 修复新抽牌时 pipeline 执行期间前端无等待动画的问题：`fetchInterpretation()` 在调用 pipeline 前设置 `isLoadingInterpretation = true`，确保 HTTP 请求期间 UI 显示 loading 动画

## [2.9.0] - 2026-07-05

### Added

- 新增客户端日志埋点系统（`src/services/client-logger.ts`）
  - 缓冲区批量上报：20 条或 30 秒定时 flush，64KB body size 限制
  - 数据脱敏：`log()` 入口自动 strip 密码/手机号/身份证/邮箱等敏感字段
  - 异常事件去重采样：同 url 5 秒去重，首条必报，后续 1/5 采样
  - 设备指纹：首次启动生成 UUID 缓存，用于未登录事件关联
  - 登录前暂存：`app_launch` 事件暂存上限 50 条，登录后补发
- 新增 45 个埋点事件覆盖全链路：
  - 认证类（A1-A9）：微信登录/邮箱登录/登出/资料更新
  - 解读类（B1-B6、H7）：抽牌/解读/降级/升级
  - 同步类（C1-C3）：上传/拉取/删除
  - 海报类（D1-D4b）：生成/分享
  - 页面生命周期（E1-E4、H1-H2）：启动/切后台/回前台
  - 用户行为（F1-F4）：签到/任务/邀请/反馈
  - 异常类（G1-G6）：请求失败/超时/storage 失败/图片加载/网络不可用
- `App.vue` 初始化日志服务，区分冷/热启动，切后台触发 flush

### Fixed

- 修复客户端事件日志上报失败时静默丢失问题
  - `flush()` catch 块添加错误输出，不再吞掉异常
  - `destroyClientLogger()` 改用动态 import 替代 require()，避免 ESM 环境崩溃
  - 新增失败事件持久化到 uni.storage，下次启动自动补发

## [2.8.6] - 2026-07-05

### Fixed

- 修复升级 AI 解读成功后横幅仍显示"点击下方按钮升级为个性化卡牌解读"：`FetchOnlineStage` 成功路径显式清空 `ctx.fallbackReason`，避免 `PersistStage` 将旧值 `'local'` 写回 record

## [2.8.5] - 2026-07-05

### Fixed

- 修复管线完成后重复翻牌的 bug：`setCurrentReading` 在 cards 引用未变时原地修改字段，避免 reading computed 变化触发 watch 重新翻牌

## [2.7.0] - 2026-07-03

### Changed

- **解读接口改为异步轮询模式**：`fetchReading` 调用 `POST /api/reading/start` 提交任务后立即返回 taskId，前端每 2 秒轮询 `GET /api/reading/result/:taskId`，最多 90 秒
- **taskId 持久化**：通过 `uni.setStorageSync` 缓存 taskId，用户重进页面后可继续轮询，解读完成后自动清理
- **轮询状态可视化**：Store 新增 `isPolling` 状态，供 UI 展示"AI 正在解读"加载动画

## [2.6.2] - 2026-07-02

### Fixed

- 修复所有可控制 section 在页面配置加载前闪烁的问题（所有 section 初始化显式默认值，API 返回后覆盖对应项，未返回的保留默认值；模板条件简化为直接取值）

## [2.6.1] - 2026-07-02

### Fixed

- 修复自定义 TabBar 点击切换页面报错 `switchTab:fail page "[object Object]" is not found` 的问题（将 TabBar 自定义事件名从 `change` 改为 `tab-change`，避免与微信原生 `change` 事件冲突）

## [2.5.3] - 2026-07-01

### Fixed

- 修复小程序正式版海报生成失败的问题（`uni.request` 的 `responseType: 'arraybuffer'` 模式下正式版不返回自定义响应头，导致 `X-Cache-Key` 取不到）

## [2.5.2] - 2026-06-30

### Fixed

- 修复真机环境下 `atob is not defined` 导致登录态检测永远失败的问题（用纯 JS Base64 解码替代 `atob`）
- 修复微信一键登录后切换 Tab 再返回即丢失登录状态的问题
- 退出登录时同步清除 stats，避免等级/积分/额度卡片残留显示
- 401 时同步清除 `user_info`，避免 token 丢失但用户信息残留导致 UI 不一致
- 新增重登录锁防止多个 401 并发触发多次 `wx.login`
- `initAuth` 提前到 `loadRecords` 之前注册，确保启动阶段 401 也能触发自动重登录
- 登录成功后不再立即调用 `loadStats()`，由 `onShow` 统一触发，避免登录后立即触发 401

## [2.5.1] - 2026-06-29

### Fixed

- 修复反馈记录页面 `ref` 从 `@dcloudio/uni-app` 导入导致 H5 构建失败的问题（应导入自 `vue`）

## [2.5.0] - 2026-06-29

### Added

- 新增意见反馈功能：用户可提交反馈（分类 + 文本 + 最多 3 张图片）
- 新增反馈记录列表页面，支持分页加载
- 新增反馈详情页面，展示反馈内容和管理员回复
- 在「我的」页面添加意见反馈和反馈记录入口
- 后端新增反馈 CRUD 和管理员回复 API

## [2.4.0] - 2026-06-29

### Added

- 新增 `isViewingHistory` 状态，用于跟踪是否正在查看历史记录
- 新增 `upgradeToOnlineReading()` action，支持手动升级为深度解读
- result.vue 添加「升级为深度解读」按钮，登录用户可将本地解读升级为 AI 深度解读
- 解读完成后自动同步更新后端数据库
- request.ts 新增 `apiPatch` 方法

### Changed

- 查看历史记录时自动生成本地解读，不再自动调用深度解读 API
- `viewRecord()` 加载历史记录时，如果没有解读文本则自动生成本地解读

## [2.3.1] - 2026-06-29

### Fixed

- 修复占卜记录页面点击任意记录都显示第一条结果的问题（result.vue 未读取 URL 中的 id 参数）
- 新增 `viewRecord(id)` action，根据 id 从历史记录加载数据到 currentReading

### Added

- `ReadingRecord` 类型新增 `interpretation` 字段，支持保存解读文本
- `fetchInterpretation` 完成后自动将解读保存到对应的 record 中
- 同步服务支持 `interpretation` 字段的上传和下载

## [2.3.0] - 2026-06-28

### Added

- 额度用尽时自动降级本地解读并弹出 Toast 提醒"今日解读额度已用完，已切换为本地解读"
- 区分额度用尽与其他错误（网络/服务器）的降级原因，其他错误提示"深度解读暂时不可用，已切换为本地解读"

## [2.2.1] - 2026-06-28

### Fixed

- 分享海报保存到相册前用 `uni.saveFile` 将 `tempFilePath` 转为 `wx.env.USER_DATA_PATH` 下的永久文件路径，解决 iOS 上临时文件无法直接保存到相册的问题

## [2.2.0] - 2026-06-27

### Added

- 新增个人资料编辑页 `profile-detail.vue`，支持编辑昵称、性别、生日、邮箱绑定

### Changed

- 重构 `profile.vue` 个人中心页头部：头像 | 昵称+ID | › 箭头，点击进入详情页
- 移除个人中心页的邮箱绑定、行内昵称编辑、退出登录，统一迁移至详情页

## [2.1.8] - 2026-06-26

### Fixed

- 小程序海报改用 POST + `uni.downloadFile` 双步策略：POST 生成海报获取缓存 key → `uni.downloadFile` 下载得到真实文件系统路径，绕过微信开发者工具 `__usr__` HTTP 虚拟文件服务器 500 问题

## [2.1.7] - 2026-06-26

### Fixed

- 修复海报生成中 `writeFileSync` 用错误编码写入 ArrayBuffer 导致 PNG 文件损坏返回 500 的问题
- 修复 CardDetail 组件 wxss 中违规使用 tag 选择器 `text {}` 的问题
- 替换废弃的 `uni.getSystemInfoSync()` 为 `uni.getWindowInfo()`

## [2.1.6] - 2026-06-26

### Fixed

- 修复微信小程序 Runtime 中 `FormData` 未定义导致所有 API 请求静默失败的问题（`ReferenceError: FormData is not defined`），在 `request.ts` 中添加 `typeof FormData === 'undefined'` 保护判断

## [2.1.5] - 2026-06-26

### Fixed

- 将健康检查从首页 `onMounted` 提升到 `App.vue onLaunch` 全局执行，确保所有页面启动时都能正确检测后端服务状态，避免"服务不可用"误报

## [2.1.4] - 2026-06-25

### Fixed

- 海报生成请求超时时间从 15s 提升至 60s，避免长耗时渲染被客户端 abort
- 海报生成失败时区分超时/取消错误与普通错误，给出"生成超时，请重试"精准提示

## [2.1.3] - 2026-06-25

### Fixed

- 简化未登录用户生成海报的引导：不再弹窗引导登录，仅给 Toast/错误提示"请先登录后再生成海报"

## [2.1.2] - 2026-06-25

### Fixed

- 未登录用户生成海报返回 401 时无提示，现已增加登录引导：点击「生成分享海报」先检查登录态，未登录弹窗引导微信一键登录
- 海报弹窗内增加登录态双重防护，区分 401/未授权错误与普通错误，给出精准提示

## [2.1.0] - 2026-06-24

### Added

- 未登录用户开启深度解读时，增加 Toast 提示"未登录，已为你生成本地解读"
- 结果页本地解读标签下方增加登录引导文案"登录后可获得更专业的深度解读"

### Changed

- 深度解读开关默认值由登录状态决定：已登录默认开启，未登录默认关闭

## [2.0.0] - 2026-06-24

### Changed

- **BREAKING**: 所有 API 调用同步更新为 `/api` 前缀：
  - `auth.ts`: `/auth/*` → `/api/auth/*`, `/user/profile` → `/api/user/profile`
  - `reading.ts`: `/reading` → `/api/reading`, `/health` → `/api/health`
  - `poster.ts`: `/poster` → `/api/poster`
  - `record-sync.ts`: `/user/records` → `/api/user/records`

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
[2.5.2]: https://github.com/your-org/tarot-miniprogram/releases/tag/v2.5.2
