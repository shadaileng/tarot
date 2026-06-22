# 方案 B：微信登录 + 用户系统 — 详细实施计划

> 基于微信小程序 `wx.login()` → 后端换取 `openid` → JWT 认证的标准流程。
> 涉及子项目：`tarot-miniprogram`（小程序） + `tarot-backend`（后端）。

---

## 一、架构总览

```
┌──────────────────┐       ┌──────────────────────┐       ┌──────────────┐
│  tarot-miniprogram │       │    tarot-backend      │       │   微信服务器    │
│  (UniApp 前端)     │       │    (Express API)       │       │  api.weixin.qq │
└────────┬─────────┘       └───────────┬───────────┘       └───────┬───────┘
         │                             │                           │
         │  ① wx.login()               │                           │
         │  获取临时 code               │                           │
         │                             │                           │
         │  ② POST /auth/login         │                           │
         │  { code }                   │  ③ GET /sns/jscode2session│
         │ ──────────────────────────> │  ?appid=&secret=&js_code= │
         │                             │ ─────────────────────────>│
         │                             │                           │
         │                             │  ④ { openid, session_key }│
         │                             │ <─────────────────────────│
         │                             │                           │
         │                             │  ⑤ upsert users 表         │
         │                             │  生成 JWT（含 openid）      │
         │                             │                           │
         │  ⑥ { token, openid,         │                           │
         │      isNewUser }             │                           │
         │ <──────────────────────────│                           │
         │                             │                           │
         │  ⑦ 后续所有请求携带           │                           │
         │  Authorization: Bearer <JWT> │                           │
         │ ──────────────────────────> │  ⑧ JWT 中间件解析 openid   │
         │                             │     注入 req.openid        │
```

---

## 二、后端改动 (`tarot-backend`)

### 2.1 新增依赖

```bash
cd tarot-backend && pnpm add jsonwebtoken uuid
pnpm add -D @types/jsonwebtoken @types/uuid
```

| 包 | 用途 |
|---|------|
| `jsonwebtoken` | 签发/验证 JWT token |
| `uuid` | 生成唯一用户 ID（防止 openid 直接暴露） |

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
  id          TEXT PRIMARY KEY,          -- UUID，不暴露 openid
  openid      TEXT NOT NULL UNIQUE,      -- 微信 openid（唯一索引）
  unionid     TEXT,                      -- 微信 unionid（如有）
  nickname    TEXT DEFAULT '匿名用户',    -- 用户昵称
  avatar_url  TEXT,                      -- 头像 URL
  created_at  TEXT NOT NULL,             -- 首次注册时间 ISO 8601
  last_login_at TEXT NOT NULL            -- 最后登录时间 ISO 8601
)
CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid)
```

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
│   └── login.ts          # POST /auth/login 处理器
├── middleware/
│   └── jwt-auth.ts       # JWT 鉴权中间件（替换部分 authMiddleware 场景）
├── db/
│   ├── user.ts           # 用户 CRUD
│   └── reading-record.ts # 占卜记录 CRUD（用户级）
└── types/
    └── auth.ts           # 认证相关类型定义
```

### 2.5 `POST /auth/login` 接口设计

**文件**：`src/auth/login.ts`

```
POST /auth/login
Content-Type: application/json

Request:
{
  "code": "081xxxx"         // wx.login() 返回的临时登录凭证
}

Response (200):
{
  "token": "eyJhbGciOi...", // JWT
  "openid": "oXXXX",        // 脱敏后展示用
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
2. 取到 `openid` 和 `session_key`（session_key 不返回给前端，也不存数据库）
3. 查 `users` 表：
   - 已有 → 更新 `last_login_at`，`isNewUser: false`
   - 没有 → 新建记录，`isNewUser: true`
4. 用 `uuid` 作为用户唯一 ID
5. 签发 JWT：
   - payload：`{ sub: userId, openid }`
   - 过期时间：30 天（`expiresIn: '30d'`）
6. 返回 token + user 信息

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
import { loginHandler } from './auth/login.js'
import { jwtAuthMiddleware } from './middleware/jwt-auth.js'

app.post('/auth/login', loginHandler)

// 需要用户认证的接口
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

### 3.4 `App.vue` 启动流程改造

```ts
// onLaunch 改为：
onLaunch(async () => {
  const token = getToken()
  if (token && !isTokenExpired(token)) {
    // 已有有效 token，恢复用户信息
    console.log('✅ 已登录')
  } else {
    // 首次启动或 token 过期，执行登录
    console.log('🔐 首次登录...')
    try {
      const result = await login()
      console.log('✅ 登录成功', result.isNewUser ? '(新用户)' : '')
      
      // 如果是老用户，从后端拉取历史记录
      if (!result.isNewUser) {
        await syncRecordsFromServer()
      }
    } catch (e) {
      console.error('❌ 登录失败', e)
      // 降级：允许游客模式使用（但不调用后端接口）
      uni.showToast({ title: '联网功能暂不可用', icon: 'none' })
    }
  }
  
  const store = useTarotStore()
  store.loadRecords()
})
```

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
    → 合并到本地存储（以服务器为准，允许超过 50 条）
```

### 3.7 环境变量配置

**`.env.development` / `.env.production`** 新增：

```
VITE_API_BASE_URL=http://localhost:3000   # 开发环境
VITE_API_BASE_URL=https://xxx.com         # 生产环境
```

> 小程序端不直接写死后端 URL，通过环境变量注入。

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
| 1 | 安装 `jsonwebtoken`、`uuid` 及类型定义 | `package.json` |
| 2 | 在 `config.ts` 新增 `WECHAT_APPID` / `WECHAT_SECRET` / `JWT_SECRET` 配置项 | `src/config.ts` |
| 3 | 在 `db/index.ts` 的 `initSchema` 中新增 `users` 和 `reading_records` 表 | `src/db/index.ts` |
| 4 | 创建 `src/db/user.ts`：`findByOpenid` / `createUser` / `updateLastLogin` | 新文件 |
| 5 | 创建 `src/auth/login.ts`：实现 `POST /auth/login` | 新文件 |
| 6 | 创建 `src/middleware/jwt-auth.ts`：JWT 验证中间件 | 新文件 |
| 7 | 创建 `src/middleware/rate-limit.ts`：内存频率限制 | 新文件 |
| 8 | 在 `index.ts` 注册新路由，`/reading` 和 `/poster` 改用 JWT 鉴权 | `src/index.ts` |
| 9 | 更新 `reading_logs` 表结构，增加 `openid` 字段 | `src/db/index.ts` |

### 阶段 2：小程序前端登录流程（约 2-3 小时）

| # | 任务 | 文件 |
|---|------|------|
| 1 | 创建 `services/auth.ts`：登录 / token 管理 / 用户信息存储 | 新文件 |
| 2 | 创建 `utils/request.ts`：统一请求封装（自动带 token + 401 处理） | 新文件 |
| 3 | 改造 `App.vue` `onLaunch`：增加登录流程 | `src/App.vue` |
| 4 | 改造 `services/reading.ts`：使用 `apiPost` 替代裸 `uni.request` | `src/services/reading.ts` |
| 5 | 改造 `services/poster.ts`：使用 `apiPost` 替代裸 `uni.request` | `src/services/poster.ts` |
| 6 | 新增环境变量 `VITE_API_BASE_URL` | `.env.development` / `.env.production` |

### 阶段 3：用户记录云端同步（约 2-3 小时，可选）

| # | 任务 | 文件 |
|---|------|------|
| 1 | 创建 `db/reading-record.ts`：后端 CRUD | 新文件 |
| 2 | 注册 `GET/POST/DELETE /user/records` 路由 | `src/index.ts` |
| 3 | 改造 `store/tarot.ts`：`saveRecord` 同时调用后端同步 | `src/store/tarot.ts` |
| 4 | 实现启动时从后端拉取 + 合并记录 | `src/store/tarot.ts` |

---

## 六、API 路由变更对照表

| 旧路由 | 鉴权 | 新路由 | 鉴权 |
|--------|------|--------|------|
| — | — | `POST /auth/login` | 无 |
| `POST /reading` | 无 | `POST /reading` | **JWT** |
| `POST /poster` | API Key | `POST /poster` | **JWT** |
| `GET /logs` | 无 | `GET /logs` | JWT（仅自己的） |
| `GET /api/config` | 无 | `GET /api/config` | API Key |
| `PUT /api/config/:key` | API Key | `PUT /api/config/:key` | API Key（不变） |
| — | — | `GET /user/records` | **JWT** |
| — | — | `POST /user/records` | **JWT** |
| — | — | `DELETE /user/records/:id` | **JWT** |

---

## 七、安全性注意事项

| 点 | 说明 |
|----|------|
| `session_key` | **绝不**返回给前端，也**不存数据库**。仅用于换取 openid 后丢弃 |
| JWT 密钥 | 生产环境使用 64 字符随机 hex，通过环境变量注入，**不写死在代码中** |
| WeChat Secret | 仅服务端使用，通过环境变量注入 |
| openid 暴露 | API 响应中不返回完整 openid，前端只用 `userId`（UUID）；`reading_logs` 中的 openid 仅管理员可见 |
| 频率限制 | `/reading` 接口必须加频率限制，防止恶意消耗 Gemini API 额度 |
| CORS | 保持 `CORS_ORIGIN` 配置，生产环境不要设为 `*` |

---

## 八、测试清单

- [ ] `POST /auth/login` — 传有效 code → 返回 token + isNewUser
- [ ] `POST /auth/login` — 同一 openid 再次登录 → `isNewUser: false`，`last_login_at` 更新
- [ ] `POST /auth/login` — 传无效 code → 400 INVALID_CODE
- [ ] `POST /auth/login` — 未配置 WECHAT_APPID → 500 WECHAT_NOT_CONFIGURED
- [ ] `POST /reading` — 无 token → 401 UNAUTHORIZED
- [ ] `POST /reading` — 有效 token → 正常返回解读结果
- [ ] `POST /reading` — 频率超限 → 429 TOO_MANY_REQUESTS
- [ ] `POST /reading` — 过期 token → 401 TOKEN_EXPIRED
- [ ] `GET /user/records` — 分页查询自己的记录
- [ ] 小程序端：首次启动自动登录
- [ ] 小程序端：token 有效期内不重复登录
- [ ] 小程序端：无网络时降级为本地模式（不阻塞使用）

---

## 九、开放问题 / 待决策

| 问题 | 选项 | 建议 |
|------|------|------|
| 是否同时保留 API Key 鉴权作为后门？ | 是 / 否 | 建议保留，`/poster` 同时支持 JWT 和 API Key |
| 用户信息获取时机 | 登录时 / 使用时 | 建议登录时静默获取 openid 即可，昵称/头像由用户主动授权 |
| 历史记录云端存储上限 | 无限 / 有上限 | 建议暂不设上限，后续根据成本评估 |
| 是否需要 `unionid` 支持 | 是 / 否 | 如果后续有公众号或 PC 端联动则需要，当前可暂不实现 |
