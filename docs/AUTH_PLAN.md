# Admin 端调用日志显示小程序用户信息 — 详细修改方案

> 最后更新：2026-06-24

## §0 两套身份体系澄清

本项目存在 **两个完全分离的身份体系**，互不干扰：

| | 小程序用户 | Admin 后台管理员 |
|:---|:---|:---|
| **谁** | 终端用户（占卜的客户） | 运营/客服人员 |
| **存在哪** | `users` 表 | 不存表，仅比对环境变量 |
| **认证方式** | `jwtAuthMiddleware` — 解析 `Authorization: Bearer <jwt>` | `authMiddleware` — 比对 `Authorization: Bearer <apiKey>` 与 `config.apiKey` |
| **token 来源** | 微信 `wx.login` → 后端 `/auth/wx-login` 换 JWT | 启动时从环境变量 `API_KEY` 读取，永远不变 |
| **中间件文件** | `src/middleware/jwt-auth.ts` | `src/middleware/auth.ts` |
| **注入 req 字段** | `req.userId`、`req.openid` | 无（仅通过/拒绝） |

> **本方案中「日志页面看到的用户」指小程序用户（左列），Admin 只需用 API_KEY 鉴权访问管理接口即可。**

---

## 现状

| 层 | 问题 |
|:---|:---|
| **DB** | `reading_logs` 表已有 `user_id` 字段，`users` 表有 `nickname`/`email`/`avatar_url`/`openid` |
| **后端 `/logs` 接口** | `queryLogs` 仅 `SELECT * FROM reading_logs`，未 JOIN `users`，返回的是原始 `user_id` UUID |
| **Admin 类型** | `LogEntry` 没有 `user_id` 也没有用户昵称等字段 |
| **Admin 表格** | 不渲染"用户"列 |
| **Admin 详情** | 不显示用户信息 |
| **权限** | `/logs` 和 `/logs/:id` **无任何鉴权**，任何人可查 |

---

## Part 1: 日志接口返回用户信息

### 1.1 后端 — `reading-log.ts`

**文件**：`tarot-backend/src/db/reading-log.ts`

#### 1.1.1 扩展 `LogEntry` 类型

在 `LogEntry` interface 中 `user_id` 之后新增 4 个用户字段：

```typescript
export interface LogEntry {
  // ... 原有字段不变（含已有的 user_id: string | null）...
  // 新增：来自 users 表的 JOIN 字段
  user_nickname: string | null
  user_email: string | null
  user_avatar: string | null
  login_type: string | null   // 'wechat' | 'email' | 'wechat+email' | 'anonymous'
}
```

#### 1.1.2 修改 `queryLogs` 函数

将 `querySql` 从 `SELECT * FROM reading_logs` 改为 JOIN 查询：

```sql
SELECT
  l.*,
  u.nickname   AS user_nickname,
  u.email      AS user_email,
  u.avatar_url AS user_avatar,
  CASE
    WHEN u.openid != '' AND u.email IS NOT NULL THEN 'wechat+email'
    WHEN u.openid != '' THEN 'wechat'
    WHEN u.email IS NOT NULL THEN 'email'
    ELSE 'anonymous'
  END AS login_type
FROM reading_logs l
LEFT JOIN users u ON l.user_id = u.id
```

注意事项：
- `countSql` 保持 `SELECT COUNT(*) FROM reading_logs` 不变（LEFT JOIN 不影响行数，WHERE 条件不变）
- email 在返回前做脱敏处理（见 1.1.3）

#### 1.1.3 email 脱敏函数

新增工具函数（可直接放在 `reading-log.ts` 或抽至 `src/utils/mask.ts`）：

```typescript
function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.length > 1 ? local[0] + '***' : '***'
  return visible + '@' + domain
}
```

在 `queryLogs` 和 `getLogById` 返回结果前对 `user_email` 调用 `maskEmail`。

#### 1.1.4 修改 `getLogById` 函数

同样改为 JOIN 查询：

```sql
SELECT
  l.*,
  u.nickname   AS user_nickname,
  u.email      AS user_email,
  u.avatar_url AS user_avatar,
  CASE
    WHEN u.openid != '' AND u.email IS NOT NULL THEN 'wechat+email'
    WHEN u.openid != '' THEN 'wechat'
    WHEN u.email IS NOT NULL THEN 'email'
    ELSE 'anonymous'
  END AS login_type
FROM reading_logs l
LEFT JOIN users u ON l.user_id = u.id
WHERE l.id = ?
```

#### 1.1.5 查询索引

`reading_logs` 表现在有索引：
- `idx_logs_created_at ON reading_logs(created_at DESC)`
- `idx_logs_target ON reading_logs(target)`

无需新增索引。LEFT JOIN `users ON l.user_id = u.id` 走 `users` 的主键 `id`（自动有索引）。

---

### 1.2 后端 — 权限加固（API Key 鉴权）

**文件**：`tarot-backend/src/index.ts`

当前 `/logs` 路由无任何鉴权：

```typescript
app.get('/logs', async (req, res) => { ... })
app.get('/logs/:id', async (req, res) => { ... })
```

改为挂载现有的 `authMiddleware`：

```typescript
app.get('/logs', authMiddleware, async (req, res) => { ... })
app.get('/logs/:id', authMiddleware, async (req, res) => { ... })
```

说明：
- `authMiddleware` 已存在于 `src/middleware/auth.ts`，也被 `PUT /api/config/:key` 使用
- 该中间件从 `Authorization: Bearer <token>` 提取 token，与 `config.apiKey` 比对
- 若服务端未配置 `API_KEY` 环境变量，中间件自动跳过（`next()` 放行）
- `/health` 和 `/metrics` 保持公开，不加鉴权

---

### 1.3 Admin 端 — 类型定义

**文件**：`tarot-admin/src/types/index.ts`

在 `LogEntry` interface 末尾新增用户字段：

```typescript
export interface LogEntry {
  // ... 原有字段不变 ...
  // 新增：用户信息（来自后端 JOIN 查询）
  user_id: string | null
  user_nickname: string | null
  user_email: string | null
  user_avatar: string | null
  login_type: string | null
}
```

---

### 1.4 Admin 端 — API 层（携带 API Key）

**文件**：`tarot-admin/src/api/index.ts`

#### 1.4.1 修改 `request()` 函数

在请求头中携带 API Key：

```typescript
const BASE = import.meta.env.VITE_API_BASE_URL

function getApiKey(): string | null {
  return import.meta.env.VITE_API_KEY || null
}

async function request<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {}
  const apiKey = getApiKey()
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  const res = await fetch(`${BASE}${path}`, { headers })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}
```

**注意**：`updateConfigItem` 函数也需同步修改，在 `fetch` 的 `headers` 中加入 `Authorization` 头。

---

### 1.5 Admin 端 — 环境变量

**文件**：`tarot-admin/.env.development`

新增：

```bash
# 管理员 API Key（与后端 API_KEY 环境变量一致）
VITE_API_KEY=<your-api-key>
```

**文件**：`tarot-admin/.env.example` 同步更新，新增 `VITE_API_KEY` 说明。

> ⚠️ `VITE_` 前缀是 Vite 的强制要求：只有以 `VITE_` 开头才能在客户端代码中通过 `import.meta.env.VITE_*` 访问。

---

### 1.6 Admin 端 — LogTable.vue（表格列）

**文件**：`tarot-admin/src/components/logs/LogTable.vue`

#### 1.6.1 表头新增"用户"列

在 `<thead>` 的 `<tr>` 中，`<th>模型</th>` 之后新增：

```html
<th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">用户</th>
```

#### 1.6.2 表格体新增用户列渲染

在每行的 `<td>{{ log.model ?? '-' }}</td>` 之后新增：

```html
<td class="py-3 px-4 text-gray-600 dark:text-gray-400 max-w-[140px] truncate">
  {{ log.user_nickname ?? log.user_email ?? (log.user_id ? '匿名' : '-') }}
</td>
```

显示优先级：`user_nickname` > `user_email` 脱敏 > `user_id` 存在则显示"匿名" > `-`

#### 1.6.3 空状态 colspan 更新

将 `colspan="7"` 改为 `colspan="8"`（新增了一列）。

---

### 1.7 Admin 端 — LogDetail.vue（详情弹窗）

**文件**：`tarot-admin/src/components/logs/LogDetail.vue`

在 `.grid.grid-cols-2` 的详情网格中，`<div>IP</div>` 之后新增用户信息块：

```html
<div>
  <span class="text-gray-500 dark:text-gray-400">用户</span>
  <p class="text-gray-900 dark:text-gray-100">
    {{ log.user_nickname ?? '匿名用户' }}
  </p>
</div>
<div>
  <span class="text-gray-500 dark:text-gray-400">邮箱</span>
  <p class="text-gray-900 dark:text-gray-100">
    {{ log.user_email ?? '-' }}
  </p>
</div>
<div>
  <span class="text-gray-500 dark:text-gray-400">登录方式</span>
  <p class="text-gray-900 dark:text-gray-100">
    {{ loginTypeLabel(log.login_type) }}
  </p>
</div>
<div>
  <span class="text-gray-500 dark:text-gray-400">用户ID</span>
  <p class="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
    {{ log.user_id ?? '-' }}
  </p>
</div>
```

需在 `<script setup>` 中新增辅助函数：

```typescript
function loginTypeLabel(type: string | null): string {
  switch (type) {
    case 'wechat': return '微信'
    case 'email': return '邮箱'
    case 'wechat+email': return '微信 + 邮箱'
    case 'anonymous': return '匿名'
    default: return type ?? '-'
  }
}
```

---

## 实施顺序

| 序号 | 变更 | 依赖 | 提交 scope |
|:---:|------|------|:---:|
| 1 | 后端 `reading-log.ts` 扩展 LogEntry + 修改 queryLogs/getLogById + maskEmail | 无 | `reading-api` |
| 2 | 后端 `index.ts` `/logs` 和 `/logs/:id` 加 `authMiddleware` | 无 | `reading-api` |
| 3 | Admin `.env.development` 加 `VITE_API_KEY` | 无 | `miniprogram` |
| 4 | Admin `types/index.ts` LogEntry 加用户字段 | 1 | `miniprogram` |
| 5 | Admin `api/index.ts` request 加 Authorization 头 + updateConfigItem 同步 | 2,3 | `miniprogram` |
| 6 | Admin `LogTable.vue` 加用户列 + colspan | 1,4 | `miniprogram` |
| 7 | Admin `LogDetail.vue` 加用户详情 + loginTypeLabel | 1,4 | `miniprogram` |

> **建议**：先完成后端 1–2，验证 `curl` 能正常返回用户信息后，再做前端 3–7。

---

## 影响范围

### 会影响到的文件

| 文件 | 改动类型 | 行数估计 |
|:---|:---|:---:|
| `tarot-backend/src/db/reading-log.ts` | 修改 | ~50 行 |
| `tarot-backend/src/index.ts` | 修改 | ~2 行 |
| `tarot-admin/.env.development` | 修改 | ~1 行 |
| `tarot-admin/src/types/index.ts` | 修改 | ~6 行 |
| `tarot-admin/src/api/index.ts` | 修改 | ~10 行 |
| `tarot-admin/src/components/logs/LogTable.vue` | 修改 | ~5 行 |
| `tarot-admin/src/components/logs/LogDetail.vue` | 修改 | ~25 行 |

### 不会影响到的部分

- 数据库 schema（无需 ALTER TABLE，`user_id` 和 JOIN 字段均已存在）
- 小程序端（前端无感知）
- `reading-api` / `comfyui` 子项目
- 已有的认证流程（微信登录 / 邮箱注册 / JWT 签发）
- Admin 登录体系（由 `tarot-admin/docs/ADMIN_LOGIN_PLAN.md` 独立规划）

---

## 后端的 endpoints 总览（变更后）

```
GET  /                          # 服务信息（公开）
GET  /health                    # 健康检查（公开）
GET  /metrics                   # Prometheus 指标（公开）
POST /auth/wechat-login         # 微信登录（公开）
POST /auth/email-register       # 邮箱注册（公开）
POST /auth/email-login          # 邮箱登录（公开）
POST /auth/bind-email           # 绑定邮箱（JWT）
POST /auth/bind-phone           # 绑定手机（JWT）
PUT  /user/profile              # 更新资料（JWT）
POST /reading                   # 占卜解读（JWT + 限流）
POST /poster                    # 海报生成（JWT）
POST /user/records              # 保存记录（JWT）
GET  /user/records              # 记录列表（JWT）
GET  /user/records/:id          # 记录详情（JWT）
DELETE /user/records/:id        # 删除记录（JWT）
GET  /logs                      # 日志列表（API Key ⬅ 新增鉴权）
GET  /logs/:id                  # 日志详情（API Key ⬅ 新增鉴权）
GET  /api/config                # 配置列表（公开）
PUT  /api/config/:key           # 修改配置（API Key）
```

---

## 附录：关键技术细节

### A. 登录方式推断逻辑

```sql
CASE
  WHEN u.openid != '' AND u.email IS NOT NULL THEN 'wechat+email'
  WHEN u.openid != '' THEN 'wechat'
  WHEN u.email IS NOT NULL THEN 'email'
  ELSE 'anonymous'
END AS login_type
```

> 说明：SQLite 的 `openid` 字段 DEFAULT 为 `''`（空字符串），因此用 `!= ''` 判断是否为微信登录用户。

### B. email 脱敏规则

| 原始 email | 脱敏后 |
|:---|:---|
| `alice@gmail.com` | `a***@gmail.com` |
| `bob@example.com` | `b***@example.com` |
| `a@b.com` | `a***@b.com` |
| `null` | `null` |

### C. Admin 端 API Key 注入方案

Admin 通过 Vite 的 `VITE_API_KEY` 环境变量读取 API Key：

```
.tarot-admin/.env.development:
  VITE_API_KEY=<与后端 API_KEY 相同的值>
```

前端 `request()` 函数读取 `import.meta.env.VITE_API_KEY`，作为 `Authorization: Bearer <apiKey>` 头发送。

> **安全注意**：`VITE_*` 变量会在构建时内联到 JS bundle 中，仅用于内部管理后台。生产部署时通过 CI/CD 注入。
