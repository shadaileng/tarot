# 方案 B：微信登录 + 用户系统 — 详细实施计划

> 基于微信小程序 `wx.login()` → 后端换取 `openid` → JWT 认证的标准流程。
> 涉及子项目：`tarot-miniprogram`（小程序） + `tarot-backend`（后端） + H5 端（邮箱登录）。

> **多端联合**：小程序使用微信登录，H5 使用邮箱登录。通过 `unionid` + 邮箱绑定实现跨端数据共享。

---

## 一、架构总览

```
┌─────────────────────────────┐       ┌──────────────────────┐       ┌──────────────┐
│  小程序 (UniApp)             │       │    tarot-backend      │       │   微信服务器    │
│  tarot-miniprogram          │       │    (Express API)       │       │  api.weixin.qq │
└──────────────┬──────────────┘       └───────────┬───────────┘       └───────┬───────┘
               │                                   │                           │
               │  ① wx.login() 获取临时 code        │                           │
               │  ② POST /auth/wechat-login {code}  │  ③ GET /sns/jscode2session│
               │  ────────────────────────────────> │  ───────────────────────> │
               │                                   │  ④ { openid, unionid,     │
               │                                   │      session_key }        │
               │                                   │ <─────────────────────────│
               │                                   │  ⑤ upsert users 表         │
               │  ⑥ { token, user, isNewUser }     │     生成 JWT               │
               │ <──────────────────────────────── │                           │
               │                                   │                           │
               │  ⑦ 小程序端获取手机号（用户授权）    │                           │
               │  POST /auth/bind-phone             │                           │
               │  { code }（getPhoneNumber 返回）    │  → 解密手机号并绑定         │
               │  ────────────────────────────────> │                           │
               │                                   │                           │
               │  ⑧ 小程序端绑定邮箱（手动输入）      │                           │
               │  POST /auth/bind-email             │                           │
               │  { email, password }               │  → 同一 unionid 关联邮箱   │
               │  ────────────────────────────────> │    实现跨端数据共享         │

┌─────────────────────────────┐       ┌──────────────────────┐
│  H5 端（非微信环境）          │       │    tarot-backend      │
│  浏览器 / 移动端网页          │       │    (Express API)       │
└──────────────┬──────────────┘       └───────────┬───────────┘
               │                                   │
               │  ① 邮箱注册                        │
               │  POST /auth/email-register         │
               │  { email, password }               │  → bcrypt 哈希密码
               │  ────────────────────────────────> │  → 返回 JWT
               │                                   │
               │  ② 邮箱登录                        │
               │  POST /auth/email-login            │
               │  { email, password }               │  → 验证密码 → 返回 JWT
               │  ────────────────────────────────> │
               │                                   │
               │  ③ 后续请求携带                     │
               │  Authorization: Bearer <JWT>        │
               │  ────────────────────────────────> │  → JWT 中间件解析 userId

跨端数据共享：
  小程序微信登录 → 绑定邮箱 a@b.c → 同一邮箱可在 H5 端登录 → 数据互通
  后端通过 unionid 优先匹配 → 邮箱次级匹配 → 实现账号关联
```

---

## 二、后端改动 (`tarot-backend`)

### 2.1 新增依赖

```bash
cd tarot-backend && pnpm add jsonwebtoken uuid bcrypt
pnpm add -D @types/jsonwebtoken @types/uuid @types/bcrypt
```

| 包 | 用途 |
|---|------|
| `jsonwebtoken` | 签发/验证 JWT token |
| `uuid` | 生成唯一用户 ID（防止 openid 直接暴露） |
| `bcrypt` | 邮箱登录密码的哈希存储与验证（cost factor ≥ 10） |

### 2.2 新增配置项 (config.ts)

在 `configMeta` 数组中新增三项：

| envKey | 说明 | 默认值 |
|--------|------|--------|
| `WECHAT_APPID` | 小程序 AppID | `''` |
| `WECHAT_SECRET` | 小程序 AppSecret | `''` |
| `JWT_SECRET` | JWT 签名密钥 | `''`（生产环境必须设置） |

同时需要在 `config` 对象中新增对应字段，在 `updateConfig` 的 switch 中新增对应 case。

**`configMeta` 新增：**

```ts
{ key: 'WECHAT_APPID',  envKey: 'WECHAT_APPID',  group: '微信配置', editable: false, sensitive: false, type: 'string', defaultValue: '' },
{ key: 'WECHAT_SECRET', envKey: 'WECHAT_SECRET', group: '微信配置', editable: false, sensitive: true,  type: 'string', defaultValue: '' },
{ key: 'JWT_SECRET',    envKey: 'JWT_SECRET',    group: '安全配置', editable: false, sensitive: true,  type: 'string', defaultValue: '' },
```

**`config` 对象新增字段：**

```ts
wechatAppId:  string
wechatSecret: string
jwtSecret:    string
```

### 2.3 数据库新增表 (`src/db/index.ts`)

在 `initSchema()` 中新增两张表：

**（1）`users` 表 — 用户基础信息**

```sql
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,          -- UUID，不暴露 openid
  openid        TEXT NOT NULL UNIQUE,      -- 微信 openid（唯一索引，可为空字符串）
  unionid       TEXT,                      -- 微信 unionid（用于多端联合）
  email         TEXT,                      -- 绑定的邮箱（唯一索引，可为空）
  password_hash TEXT,                      -- 邮箱登录密码的 bcrypt 哈希
  phone         TEXT,                      -- 绑定的手机号（可为空）
  nickname      TEXT DEFAULT '匿名用户',    -- 用户昵称
  avatar_url    TEXT,                      -- 头像 URL
  created_at    TEXT NOT NULL,             -- 首次注册时间 ISO 8601
  last_login_at TEXT NOT NULL              -- 最后登录时间 ISO 8601
)
CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid)
CREATE INDEX IF NOT EXISTS idx_users_unionid ON users(unionid)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL AND email != ''
```

> **unionid 查询策略**：查用户时依次按 `openid` → `unionid` → `email` 匹配，实现多端账号关联。

**（2）`reading_records` 表 — 用户占卜记录**

> 替代原 `reading_logs` 作为用户级数据存储，`reading_logs` 保留为系统级请求日志。

```sql
CREATE TABLE IF NOT EXISTS reading_records (
  id          TEXT PRIMARY KEY,          -- UUID
  user_id     TEXT NOT NULL,             -- 关联 users.id
  created_at  TEXT NOT NULL,
  spread_type TEXT NOT NULL,             -- 牌阵类型
  question    TEXT,                      -- 用户问题
  cards_json  TEXT NOT NULL,             -- JSON: [{id, name, reversed, position}]
  reading     TEXT NOT NULL,             -- AI 解读结果（如有）
  model       TEXT,                      -- 使用的 AI 模型
  is_local    INTEGER DEFAULT 0,         -- 是否为本地同步上来的记录
  FOREIGN KEY (user_id) REFERENCES users(id)
)
CREATE INDEX IF NOT EXISTS idx_records_user_id ON reading_records(user_id)
CREATE INDEX IF NOT EXISTS idx_records_created_at ON reading_records(created_at DESC)
```

**改造 `reading_logs` 表**：新增 `openid` 字段（可为 NULL），用于关联到具体用户。

### 2.4 新增文件清单

```
tarot-backend/src/
├── auth/
│   ├── wechat-login.ts     # POST /auth/wechat-login 处理器（微信登录）
│   ├── email-register.ts   # POST /auth/email-register 处理器（邮箱注册）
│   ├── email-login.ts      # POST /auth/email-login 处理器（邮箱登录）
│   ├── bind-email.ts       # POST /auth/bind-email 处理器（小程序绑定邮箱）
│   ├── bind-phone.ts       # POST /auth/bind-phone 处理器（绑定手机号）
│   └── update-profile.ts   # PUT /user/profile 处理器（更新昵称/头像）
├── middleware/
│   └── jwt-auth.ts         # JWT 鉴权中间件（替换部分 authMiddleware 场景）
├── db/
│   ├── user.ts             # 用户 CRUD
│   └── reading-record.ts   # 占卜记录 CRUD（用户级）
└── types/
    └── auth.ts             # 认证相关类型定义
```

### 2.5 登录与绑定接口设计

#### 2.5.1 `POST /auth/wechat-login` — 小程序微信登录

**文件**：`src/auth/wechat-login.ts`

```
POST /auth/wechat-login
Content-Type: application/json

Request:
{
  "code": "081xxxx"         // wx.login() 返回的临时登录凭证
}

Response (200):
{
  "token": "eyJhbGciOi...", // JWT
  "isNewUser": true,        // 是否新注册
  "user": {
    "id": "uuid",
    "nickname": "匿名用户",
    "avatarUrl": "https://..."
  }
}

Response (400/401):
{
  "error": "INVALID_CODE" | "WECHAT_ERROR" | "WECHAT_NOT_CONFIGURED"
}
```

**处理流程**：

1. 调用 `https://api.weixin.qq.com/sns/jscode2session?appid={APPID}&secret={SECRET}&js_code={code}&grant_type=authorization_code`
2. 取到 `openid`、`unionid` 和 `session_key`（session_key 不返回给前端，也不存数据库）
3. 按优先级查 `users` 表：
   - 先按 `openid` 查 → 找到则更新 `unionid` + `last_login_at`，`isNewUser: false`
   - 未找到则按 `unionid` 查 → 找到则关联 `openid`，`isNewUser: false`（已有邮箱注册账号）
   - 都没找到 → 新建记录，`isNewUser: true`
4. 用 `uuid` 作为用户唯一 ID
5. 签发 JWT：
   - payload：`{ sub: userId, openid }`
   - 过期时间：30 天（`expiresIn: '30d'`）
6. 返回 token + user 信息

#### 2.5.2 `POST /auth/email-register` — H5 邮箱注册

**文件**：`src/auth/email-register.ts`

```
POST /auth/email-register
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"     // 明文密码，后端 bcrypt 哈希存储
}

Response (200):
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid",
    "nickname": "匿名用户",
    "avatarUrl": null,
    "email": "user@example.com"
  }
}

Response (409):
{
  "error": "EMAIL_ALREADY_EXISTS"
}
```

**处理流程**：
1. 校验 email 格式
2. 检查 email 是否已被绑定（`idx_users_email` 唯一约束）
3. `bcrypt.hash(password, 10)` 生成哈希
4. 新建 `users` 记录（`openid` 为空，`unionid` 为空）
5. 签发 JWT → 返回

#### 2.5.3 `POST /auth/email-login` — H5 邮箱登录

**文件**：`src/auth/email-login.ts`

```
POST /auth/email-login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "eyJhbGciOi...",
  "user": { ... }
}

Response (401):
{
  "error": "INVALID_CREDENTIALS"
}
```

**处理流程**：
1. 按 email 查 `users` 表
2. `bcrypt.compare(password, password_hash)` 验证密码
3. 匹配成功 → 签发 JWT 返回
4. 匹配失败 → 401

#### 2.5.4 `POST /auth/bind-email` — 小程序端绑定邮箱

**文件**：`src/auth/bind-email.ts` | **鉴权**：JWT（需要已登录）

```
POST /auth/bind-email
Authorization: Bearer <JWT>
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "message": "邮箱绑定成功",
  "email": "user@example.com"
}

Response (409):
{
  "error": "EMAIL_ALREADY_BOUND"
}

Response (400):
{
  "error": "EMAIL_ALREADY_BOUND_TO_THIS_ACCOUNT"
}
```

**处理流程**：
1. 验证 JWT → 获取 `userId`
2. 检查该用户是否已绑定邮箱 → 已绑定则返回 400（**邮箱不可修改**）
3. 检查 email 是否已被其他用户绑定 → 是则返回 409
4. `bcrypt.hash(password, 10)` 生成哈希
5. `UPDATE users SET email=?, password_hash=? WHERE id=?`
6. 此后该用户可通过 email+password 在 H5 端登录，实现跨端数据共享

> **重要**：邮箱绑定后**不可修改**。一个邮箱只能绑定一个账号。

#### 2.5.5 `POST /auth/bind-phone` — 小程序端绑定手机号

**文件**：`src/auth/bind-phone.ts` | **鉴权**：JWT（需要已登录）

```
POST /auth/bind-phone
Authorization: Bearer <JWT>
Content-Type: application/json

Request:
{
  "code": "xxx"               // <button open-type="getPhoneNumber"> 返回的 code
}

Response (200):
{
  "message": "手机号绑定成功",
  "phone": "138****1234"      // 脱敏展示
}

Response (400):
{
  "error": "INVALID_PHONE_CODE" | "PHONE_ALREADY_BOUND"
}
```

**处理流程**：
1. 验证 JWT → 获取 `userId`
2. 调用微信 `getPhoneNumber` API，用 code 换取手机号
3. `UPDATE users SET phone=? WHERE id=?`
4. 返回脱敏后的手机号

> **获取方式**：小程序端通过 `<button open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">` 触发微信原生授权弹窗，用户从微信绑定号码中选择一个授权。登录时引导用户授权（可跳过）。

#### 2.5.6 `PUT /user/profile` — 更新昵称/头像

**文件**：`src/auth/update-profile.ts` | **鉴权**：JWT（需要已登录）

```
PUT /user/profile
Authorization: Bearer <JWT>
Content-Type: application/json

Request:
{
  "nickname": "新昵称",       // 可选，至少提供一个字段
  "avatarUrl": "https://..."  // 可选
}

Response (200):
{
  "user": {
    "id": "uuid",
    "nickname": "新昵称",
    "avatarUrl": "https://..."
  }
}
```

### 2.6 JWT 鉴权中间件 (`src/middleware/jwt-auth.ts`)

**行为**：

1. 从 `Authorization: Bearer <token>` 中提取 token
2. 验证 JWT 签名和过期时间
3. 解析出 `openid` 和 `userId`
4. 注入 `req.openid` 和 `req.userId` 供后续 handler 使用
5. 验证失败返回 `401 { error: 'UNAUTHORIZED', message: '...' }`

**与现有 `authMiddleware` 的关系**：

| 接口 | 旧鉴权 | 新鉴权 |
|------|--------|--------|
| `POST /poster` | `authMiddleware`（API Key） | `jwtAuthMiddleware`（JWT） |
| `POST /reading` | 无 | `jwtAuthMiddleware`（JWT） |
| `GET /api/config` | 无 → 维持无鉴权 | 不变 |
| `PUT /api/config/:key` | `authMiddleware`（API Key） | 维持 `authMiddleware` |

> **重要**：`authMiddleware`（API Key）**仅**用于后台管理操作（`PUT /api/config/:key`），不对用户端 API 调用做任何限制。所有用户端接口统一使用 `jwtAuthMiddleware`（JWT）。
>
> `/reading` 目前无鉴权，任何人可直接调用消耗 Gemini API 额度。加上 JWT 鉴权后可配合频率限制。

### 2.7 频率限制（`POST /reading`）

在 `jwtAuthMiddleware` 通过后，增加内存级别的频率限制中间件：

```ts
// src/middleware/rate-limit.ts
// 策略：每用户每分钟最多 3 次，每天最多 30 次
// 存储：内存 Map，key = userId，value = { count, windowStart }
// 未来可迁移到 Redis
```

### 2.8 用户级占卜记录 CRUD (`src/db/reading-record.ts`)

```
saveRecord(userId, record)   → 保存一条占卜记录（含 AI 解读结果）
getUserRecords(userId, {page, limit}) → 分页查询用户记录
getRecordById(userId, recordId) → 查询单条记录
deleteRecord(userId, recordId) → 删除单条记录
```

### 2.9 index.ts 路由注册

在 `start()` 前的路由注册区域新增：

```ts
import { wechatLoginHandler } from './auth/wechat-login.js'
import { emailRegisterHandler } from './auth/email-register.js'
import { emailLoginHandler } from './auth/email-login.js'
import { bindEmailHandler } from './auth/bind-email.js'
import { bindPhoneHandler } from './auth/bind-phone.js'
import { updateProfileHandler } from './auth/update-profile.js'
import { jwtAuthMiddleware } from './middleware/jwt-auth.js'

// 登录与注册（无需鉴权）
app.post('/auth/wechat-login', wechatLoginHandler)
app.post('/auth/email-register', emailRegisterHandler)
app.post('/auth/email-login', emailLoginHandler)

// 账号绑定（需要 JWT 鉴权）
app.post('/auth/bind-email', jwtAuthMiddleware, bindEmailHandler)
app.post('/auth/bind-phone', jwtAuthMiddleware, bindPhoneHandler)

// 用户资料（需要 JWT 鉴权）
app.put('/user/profile', jwtAuthMiddleware, updateProfileHandler)

// 需要用户认证的业务接口
app.post('/reading', jwtAuthMiddleware, readingHandler)
app.post('/poster',  jwtAuthMiddleware, async (req, res) => { ... })  // 替换 authMiddleware

// 用户级记录接口
app.get('/user/records', jwtAuthMiddleware, getUserRecordsHandler)
app.get('/user/records/:id', jwtAuthMiddleware, getRecordByIdHandler)
app.delete('/user/records/:id', jwtAuthMiddleware, deleteRecordHandler)

// 管理接口保持 API Key 鉴权
app.put('/api/config/:key', authMiddleware, ...)
```

---

## 三、小程序前端改动 (`tarot-miniprogram`)

### 3.1 新增文件清单

```
tarot-miniprogram/src/
├── services/
│   └── auth.ts            # 登录/认证服务
├── pages/
│   └── profile/
│       └── profile.vue    # "我的"个人中心页面（独立于 history.vue）
├── utils/
│   └── request.ts         # 封装 uni.request，自动注入 JWT token
└── store/
    └── user.ts            # Pinia 用户状态 store（可选，或合并到 tarot.ts）
```

### 3.2 `services/auth.ts` — 认证服务

```ts
// 核心函数

login(): Promise<LoginResult>
// → 调用 wx.login() 获取 code
// → 调用 POST /auth/login 换取 token
// → 存 uni.setStorageSync('auth_token', token)
// → 存 uni.setStorageSync('user_info', user)
// → 返回 token + user

getToken(): string | null
// → 读 uni.getStorageSync('auth_token')

getUserInfo(): UserInfo | null
// → 读 uni.getStorageSync('user_info')

isLoggedIn(): boolean
// → 检查 token 是否存在且未过期（简单 JWT decode 判断 exp）

logout(): void
// → 清除本地 token + user_info
// → 保留历史记录在本地（后续可选同步到后端）

refreshToken(): Promise<void>
// → 可选：token 快过期时重新 login
```

### 3.3 `utils/request.ts` — 统一请求封装

基于 `uni.request` 封装：

```ts
// 特性：
// 1. 自动注入 Authorization: Bearer <token>（来自 auth service）
// 2. 401 响应时自动触发重新登录
// 3. 统一错误处理和 toast 提示
// 4. 请求/响应拦截器支持

export function apiGet<T>(url: string, params?: Record<string, any>): Promise<T>
export function apiPost<T>(url: string, data?: any): Promise<T>
export function apiDelete<T>(url: string): Promise<T>
```

#### 跨平台兼容性说明

`apiPost` / `apiGet` / `apiDelete` 底层封装 `uni.request`，是 UniApp 官方跨平台 API，**同时兼容 H5 和小程序**，无需任何条件编译。

| 操作 | H5 | 小程序 |
|------|:--:|:-----:|
| `uni.request` 发 JSON 请求 | ✅ | ✅ |
| `uni.getStorageSync('auth_token')` 读 token | ✅ | ✅ |
| `uni.setStorageSync` 写 token | ✅ | ✅ |
| JWT 注入 `Authorization` 头 | ✅ | ✅ |
| 401 拦截重登录 | ✅ | ✅ |

**请求层零条件编译**：所有平台差异仅存在于 `services/auth.ts`（H5 用邮箱登录，小程序用 `wx.login()`），请求封装层完全通用。

### 3.4 `App.vue` 启动流程改造

> **原则**：不在 `onLaunch` 时强制自动登录，改为**使用时提醒**。用户未登录时仍可浏览首页、抽牌等基础功能，仅在需要鉴权的操作（如保存记录到云端、生成海报）时弹出登录引导。

```ts
// onLaunch 改为：
onLaunch(() => {
  // 仅静默检查本地 token 是否有效，不阻塞应用启动
  const token = getToken()
  if (token && !isTokenExpired(token)) {
    console.log('✅ 已有有效登录态')
  } else if (token && isTokenExpired(token)) {
    console.log('⚠️ token 已过期，下次使用鉴权功能时重新登录')
    // 不清除过期 token，后续请求 401 时再触发重新登录
  } else {
    console.log('👤 游客模式：未登录')
  }

  const store = useTarotStore()
  store.loadRecords()
})
```

**登录触发时机**：

| 场景 | 行为 |
|------|------|
| 用户点击"我的" Tab | 页面展示登录入口（未登录时） |
| 调用需要鉴权的 API（如 `/reading`） | `utils/request.ts` 收到 401 → 弹出登录引导 |
| 生成海报 | 同上，通过 `apiPost` 的统一拦截处理 |
| 首页 / 抽牌 / 牌库 | 无需登录，正常使用 |

### 3.5 现有 service 改造

**`services/reading.ts`** — 从直连 URL 改为经过 `apiPost`：

```ts
// 改造前
const res = await uni.request({
  url: 'https://xxx/reading',
  method: 'POST',
  data: { ... }
})

// 改造后
const res = await apiPost('/reading', { ... })
```

**`services/poster.ts`** — 同理改为 `apiPost`：

```ts
// 改造前
const res = await uni.request({
  url: 'https://xxx/poster',
  method: 'POST',
  data: { ... },
  responseType: 'arraybuffer'
})

// 改造后
const res = await apiPost('/poster', { ... })  // 或使用 apiPostBuffer()
```

### 3.6 占卜记录云端同步（可选，阶段 2）

当用户完成一次占卜后：

```
本地存储（现有逻辑）
    └── 同时调用 POST /reading-records 同步到后端
         └── 失败时静默忽略（不阻塞用户流程）
         └── 记录 isSynced = false，后续重试
```

切换设备 / 重新登录时：
```
onLaunch → login 成功 → 调用 GET /user/records
    → 合并到本地存储（以服务器为准，暂不设上限）
```

### 3.7 环境变量配置

**`.env.development` / `.env.production`** 复用已有环境变量：

```
VITE_BACKEND_API=http://localhost:3000   # 开发环境
VITE_BACKEND_API=https://xxx.com         # 生产环境
```

> 小程序端不直接写死后端 URL，通过环境变量注入。该变量已存在，无需新增。

### 3.8 "我的" Tab 改造（新建独立 profile 页面）

> TabBar 第 4 个 tab 从"记录"改为"**我的**"，新建独立页面 `pages/profile/profile` 承载个人中心。原 `pages/history/history` 退化为纯占卜记录列表，与 profile 完全解耦。两个页面分别对应独立的 tabBar 入口（其中"我的"作为 tabBar 入口，"记录"可通过"我的"页面导航进入或其它入口访问）。

#### 3.8.1 `pages.json` 变更

两处改动：
1. 新增 `pages/profile/profile` 页面入口
2. tabBar 第 4 项 `pagePath` 改为 `pages/profile/profile`，`text` 改为"我的"

```json
// pages 数组新增：
{
  "path": "pages/profile/profile",
  "style": {
    "navigationBarTitleText": "我的",
    "navigationBarBackgroundColor": "#1a1a2e",
    "navigationBarTextStyle": "white"
  }
}

// tabBar list 第 4 项变更：
{
  "pagePath": "pages/profile/profile",  // 原为 pages/history/history
  "text": "我的"                         // 原为 "记录"
}
```

> `pages/history/history` 保留在 pages 数组中（不会被移除），但不再作为 tabBar 入口。用户可通过"我的"页面导航或其它入口访问。

#### 3.8.2 两个独立页面布局

**`pages/profile/profile.vue`** — 个人中心（仅含用户资料与登录引导）：

```
┌──────────────────────────┐
│  📱 用户信息区域           │
│  ┌──────────────────────┐ │
│  │ 未登录：              │ │
│  │  [LoginGuide 登录引导] │ │  ← 引导用户微信一键登录
│  │  登录后可同步云端记录   │ │
│  │                      │ │
│  │ 已登录：              │ │
│  │  🧑 [头像] (可点击更换) │ │  ← 点击触发 wx.chooseMedia → 上传 → PUT /user/profile
│  │  昵称: [______] ✏️    │ │  ← 点击可编辑（弹出输入框）
│  │  📱 手机号: 138****1234│ │  ← 自动获取，不可编辑
│  │     (未授权) [授权手机号]│ │  ← 未绑定手机号时显示
│  │  📧 邮箱: user@xx.com │ │  ← 手动绑定，绑定后不可修改
│  │     (未绑定) [绑定邮箱] │ │  ← 未绑定邮箱时显示
│  │  ID: xxx***xxx       │ │
│  │  [退出登录]           │ │
│  └──────────────────────┘ │
└──────────────────────────┘
```

**`pages/history/history.vue`** — 占卜记录（纯记录列表，已退化为独立页面）：

```
┌──────────────────────────┐
│  📋 占卜记录              │
│  ┌──────────────────────┐ │
│  │  2024-06-20 三牌阵    │ │
│  │  2024-06-19 单牌     │ │
│  │  ...                 │ │
│  │  (复用现有记录列表组件) │ │
│  └──────────────────────┘ │
└──────────────────────────┘
```

**交互细节**：

| 元素 | 交互方式 | API |
|------|---------|-----|
| **头像** | 点击 → `wx.chooseMedia({ count: 1, mediaType: ['image'] })` → 上传到 CDN/后端 → 调用 `PUT /user/profile` | `PUT /user/profile` |
| **昵称** | 点击 → 弹出输入框（预填当前值）→ 确认 → 调用 `PUT /user/profile` | `PUT /user/profile` |
| **手机号** | 登录成功后引导授权，通过 `<button open-type="getPhoneNumber" @getphonenumber="...">` 触发微信原生弹窗，用户选择号码 → `POST /auth/bind-phone`。可跳过，后续到"我的"页面点击"[授权手机号]"补绑 | `POST /auth/bind-phone` |
| **邮箱** | 点击"[绑定邮箱]" → 弹窗输入 email + password → `POST /auth/bind-email`。绑定后不可修改 | `POST /auth/bind-email` |

#### 3.8.3 登录/注册流程（前端视角）

**小程序端**：
- **微信一键登录**：点击按钮 → 调用 `wx.login()` 获取 code → `POST /auth/wechat-login` → 保存 token
- **手机号自动获取**：首次登录成功后，引导用户授权手机号（提供"跳过"选项），通过 `<button open-type="getPhoneNumber">` 触发微信原生弹窗让用户选择号码，成功后静默绑定。用户跳过后续可到"我的"页面补绑
- **邮箱手动绑定**：登录后用户可到"我的"页面点击"[绑定邮箱]"，输入 email + password → `POST /auth/bind-email`，绑定后不可修改
- **退出登录**：清除本地 token + user_info，历史记录保留在本地（不清除），下次登录后可从云端恢复
- **登录后行为**：若 `isNewUser: false`，自动拉取云端历史记录并合并到本地

**H5 端**：
- **邮箱注册**：输入 email + password → `POST /auth/email-register` → 返回 JWT
- **邮箱登录**：输入 email + password → `POST /auth/email-login` → 返回 JWT
- 后续请求与小程序一致，携带 `Authorization: Bearer <JWT>`

**跨端数据共享**：
- 小程序微信登录 → 绑定邮箱 → 同一邮箱可在 H5 端登录 → 数据互通
- 后端通过 `openid` → `unionid` → `email` 优先级匹配实现账号关联

#### 3.8.4 历史记录处理

- 现有 `store/tarot.ts` 中的 `loadRecords()` / `saveRecord()` 逻辑保持不变
- 历史记录由 `pages/history/history.vue` 独立承载，与 profile 页面完全解耦
- 云端同步为可选增强（阶段 3），初期以本地存储为主

### 3.9 `services/auth.ts` — 认证服务扩展

在 §3.2 基础上新增以下函数：

```ts
// 邮箱绑定
bindEmail(email: string, password: string): Promise<void>
// → 调用 POST /auth/bind-email

// 手机号绑定
bindPhone(code: string): Promise<{ phone: string }>
// → 调用 POST /auth/bind-phone

// 更新用户资料
updateProfile(data: { nickname?: string; avatarUrl?: string }): Promise<UserInfo>
// → 调用 PUT /user/profile
```

---

## 四、后端环境变量（`.env`）新增

```bash
# 微信小程序配置
WECHAT_APPID=wx1234567890abcdef
WECHAT_SECRET=abc123def456...

# JWT 签名密钥（生产环境必须设置强随机字符串）
# 生成方式：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-random-64-char-hex-string
```

---

## 五、实施步骤（按阶段）

### 阶段 1：后端 JWT + 微信登录接口（约 2-3 小时）

| # | 任务 | 文件 |
|---|------|------|
| 1 | 安装 `jsonwebtoken`、`uuid`、`bcrypt` 及类型定义 | `package.json` |
| 2 | 在 `config.ts` 新增 `WECHAT_APPID` / `WECHAT_SECRET` / `JWT_SECRET` 配置项 | `src/config.ts` |
| 3 | 在 `db/index.ts` 的 `initSchema` 中新增 `users`（含 `email`/`password_hash`/`phone`/`unionid` 字段）和 `reading_records` 表 | `src/db/index.ts` |
| 4 | 创建 `src/db/user.ts`：`findByOpenid` / `findByUnionid` / `findByEmail` / `createUser` / `updateLastLogin` / `bindEmail` / `bindPhone` / `updateProfile` | 新文件 |
| 5 | 创建 `src/auth/wechat-login.ts`：实现 `POST /auth/wechat-login` | 新文件 |
| 6 | 创建 `src/auth/email-register.ts`：实现 `POST /auth/email-register` | 新文件 |
| 7 | 创建 `src/auth/email-login.ts`：实现 `POST /auth/email-login` | 新文件 |
| 8 | 创建 `src/auth/bind-email.ts`：实现 `POST /auth/bind-email` | 新文件 |
| 9 | 创建 `src/auth/bind-phone.ts`：实现 `POST /auth/bind-phone` | 新文件 |
| 10 | 创建 `src/auth/update-profile.ts`：实现 `PUT /user/profile` | 新文件 |
| 11 | 创建 `src/middleware/jwt-auth.ts`：JWT 验证中间件 | 新文件 |
| 12 | 创建 `src/middleware/rate-limit.ts`：内存频率限制 | 新文件 |
| 13 | 在 `index.ts` 注册新路由，`/reading` 和 `/poster` 改用 JWT 鉴权 | `src/index.ts` |
| 14 | 更新 `reading_logs` 表结构，增加 `openid` 字段 | `src/db/index.ts` |

### 阶段 2：小程序前端登录流程（约 2-3 小时）

| # | 任务 | 文件 |
|---|------|------|
| 1 | 创建 `services/auth.ts`：登录 / token 管理 / 用户信息存储 / 邮箱绑定 / 手机号绑定 / 资料更新 | 新文件 |
| 2 | 创建 `utils/request.ts`：统一请求封装（自动带 token + 401 处理） | 新文件 |
| 3 | 改造 `App.vue` `onLaunch`：增加登录流程 | `src/App.vue` |
| 4 | 改造 `services/reading.ts`：使用 `apiPost` 替代裸 `uni.request` | `src/services/reading.ts` |
| 5 | 改造 `services/poster.ts`：使用 `apiPost` 替代裸 `uni.request` | `src/services/poster.ts` |
| 6 | 复用已有环境变量 `VITE_BACKEND_API`（无需新增） | `.env.development` / `.env.production` |

### 阶段 3：用户记录云端同步（约 2-3 小时，可选）

| # | 任务 | 文件 |
|---|------|------|
| 1 | 创建 `db/reading-record.ts`：后端 CRUD | 新文件 |
| 2 | 注册 `GET/POST/DELETE /user/records` 路由 | `src/index.ts` |
| 3 | 改造 `store/tarot.ts`：`saveRecord` 同时调用后端同步 | `src/store/tarot.ts` |
| 4 | 实现启动时从后端拉取 + 合并记录 | `src/store/tarot.ts` |

### 阶段 4：多端联合 + 用户资料编辑（约 2-3 小时）

| # | 任务 | 文件 |
|---|------|------|
| 1 | 小程序"我的"页面：头像点击更换（`wx.chooseMedia` + 上传 + `PUT /user/profile`）| `pages/profile/profile.vue` |
| 2 | 小程序"我的"页面：昵称点击编辑（输入框 + `PUT /user/profile`）| `pages/profile/profile.vue` |
| 3 | 小程序"我的"页面：手机号展示 + 授权按钮（`<button open-type="getPhoneNumber">`）| `pages/profile/profile.vue` |
| 4 | 小程序"我的"页面：邮箱绑定入口（弹窗输入 + `POST /auth/bind-email`）| `pages/profile/profile.vue` |
| 5 | 小程序登录流程：首次登录后引导授权手机号（可跳过）| `services/auth.ts` |
| 6 | H5 端：邮箱注册页面 | H5 项目 |
| 7 | H5 端：邮箱登录页面 | H5 项目 |
| 8 | 端到端测试：小程序微信登录 + 绑定邮箱 → H5 邮箱登录 → 数据互通 | — |

---

## 六、API 路由变更对照表

| 旧路由 | 鉴权 | 新路由 | 鉴权 |
|--------|------|--------|------|
| — | — | `POST /auth/wechat-login` | 无 |
| — | — | `POST /auth/email-register` | 无 |
| — | — | `POST /auth/email-login` | 无 |
| — | — | `POST /auth/bind-email` | **JWT** |
| — | — | `POST /auth/bind-phone` | **JWT** |
| — | — | `PUT /user/profile` | **JWT** |
| `POST /reading` | 无 | `POST /reading` | **JWT** |
| `POST /poster` | API Key | `POST /poster` | **JWT** |
| `GET /logs` | 无 | `GET /logs` | JWT（仅自己的） |
| `GET /api/config` | 无 | `GET /api/config` | 无 |
| `PUT /api/config/:key` | API Key | `PUT /api/config/:key` | API Key（不变） |
| — | — | `GET /user/records` | **JWT** |
| — | — | `POST /user/records` | **JWT** |
| — | — | `DELETE /user/records/:id` | **JWT** |

---

## 七、安全性注意事项

| 点 | 说明 |
|----|------|
| `session_key` | **绝不**返回给前端，也**不存数据库**。仅用于换取 openid 后丢弃 |
| 邮箱密码 | bcrypt 哈希存储，cost factor ≥ 10。绝不存明文或可逆加密 |
| 手机号 | 解密后**不存明文到日志**，仅存加密后的值 |
| unionid | 与 openid 同级敏感，仅服务端使用，不返回给前端 |
| JWT 密钥 | 生产环境使用 64 字符随机 hex，通过环境变量注入，**不写死在代码中** |
| WeChat Secret | 仅服务端使用，通过环境变量注入 |
| openid 暴露 | API 响应中不返回完整 openid，前端只用 `userId`（UUID）；`reading_logs` 中的 openid 仅管理员可见 |
| 频率限制 | `/reading` 接口必须加频率限制，防止恶意消耗 Gemini API 额度 |
| CORS | 保持 `CORS_ORIGIN` 配置，生产环境不要设为 `*` |

---

## 八、测试清单

- [ ] `POST /auth/wechat-login` — 传有效 code → 返回 token + isNewUser
- [ ] `POST /auth/wechat-login` — 同一 openid 再次登录 → `isNewUser: false`，`last_login_at` 更新
- [ ] `POST /auth/wechat-login` — 传无效 code → 400 INVALID_CODE
- [ ] `POST /auth/wechat-login` — 未配置 WECHAT_APPID → 500 WECHAT_NOT_CONFIGURED
- [ ] `POST /auth/wechat-login` — 同一 unionid 下新 openid 登录 → 关联已有账号，`isNewUser: false`
- [ ] `POST /auth/email-register` — 新邮箱注册成功返回 JWT
- [ ] `POST /auth/email-register` — 邮箱已存在 → 409 EMAIL_ALREADY_EXISTS
- [ ] `POST /auth/email-login` — 正确邮箱密码登录成功
- [ ] `POST /auth/email-login` — 错误密码 → 401 INVALID_CREDENTIALS
- [ ] `POST /auth/bind-email` — 小程序端绑定邮箱成功
- [ ] `POST /auth/bind-email` — 邮箱已被其他用户绑定 → 409 EMAIL_ALREADY_BOUND
- [ ] `POST /auth/bind-email` — 当前账号已绑定邮箱 → 400 EMAIL_ALREADY_BOUND_TO_THIS_ACCOUNT
- [ ] `POST /auth/bind-phone` — 手机号绑定成功
- [ ] `PUT /user/profile` — 更新昵称成功
- [ ] `PUT /user/profile` — 更新头像成功
- [ ] `PUT /user/profile` — 同时更新昵称和头像
- [ ] `POST /reading` — 无 token → 401 UNAUTHORIZED
- [ ] `POST /reading` — 有效 token → 正常返回解读结果
- [ ] `POST /reading` — 频率超限 → 429 TOO_MANY_REQUESTS
- [ ] `POST /reading` — 过期 token → 401 TOKEN_EXPIRED
- [ ] `GET /user/records` — 分页查询自己的记录
- [ ] 跨端数据共享：小程序微信登录 → 绑定邮箱 → H5 邮箱登录 → 返回同一 userId
- [ ] 小程序端：首次启动不强制登录，静默检查 token 有效性
- [ ] 小程序端：点击"我的" Tab 时展示登录入口（未登录）
- [ ] 小程序端："我的"页面点击头像可更换
- [ ] 小程序端："我的"页面点击昵称可编辑
- [ ] 小程序端：首次登录后引导授权手机号（可跳过）
- [ ] 小程序端：调用鉴权 API 收到 401 时弹出登录引导

---

## 九、开放问题 / 待决策

| 问题 | 状态 | 决策 |
|------|:--:|------|
| API Key 使用范围 | ✅ 已决策 | **仅用于后台管理**（`PUT /api/config/:key`），不对用户端 API 做限制 |
| 登录触发时机 | ✅ 已决策 | **使用时提醒登录**，不在 `onLaunch` 时强制自动登录 |
| 历史记录云端存储上限 | ✅ 已决策 | **暂不设上限**，后续根据成本评估 |
| ~~是否需要 `unionid` 支持~~ | ✅ 已决策 | **需要 unionid**：实现多端联合，小程序微信登录 + H5 邮箱登录，通过 unionid + email 实现账号关联 |
| ~~用户昵称/头像编辑功能~~ | ✅ 已决策 | **允许编辑**："我的"页面支持点击头像更换（`wx.chooseMedia` + 上传）、点击昵称编辑（输入框），均通过 `PUT /user/profile` 接口 |
| ~~是否需要手动注册页面~~ | ✅ 已决策 | **需要**：小程序端微信一键登录 + 引导授权手机号（可跳过）+ 手动绑定邮箱；H5 端邮箱注册/登录。邮箱绑定后不可修改 |
| 邮箱绑定后能否修改 | ✅ 已决策 | **不可修改**：一个邮箱绑定一个账号，绑定后永久关联，如需更换须联系管理员 |
