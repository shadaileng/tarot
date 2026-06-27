# 个人中心重构方案

> 简化 profile.vue 头部，新增 profile-detail.vue 个人资料编辑页

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/profile/profile.vue` | 修改 | 重构头部，移除绑定/编辑/退出 |
| `src/pages/profile-detail/profile-detail.vue` | 新建 | 个人资料编辑页 |
| `src/pages.json` | 修改 | 添加新路由 |
| `src/services/auth.ts` | 修改 | 扩展类型和 API 参数 |

---

## 1. `src/pages/profile/profile.vue` — 简化头部

### 模板结构

```
┌──────────────────────────────────────┐
│   🟢 头像   昵称                ›    │
│             ID                       │
└──────────────────────────────────────┘

（未登录时展示 LoginGuide）
```

### 具体变更

| 操作 | 内容 |
|------|------|
| 移除 import | `login`, `updateProfile`, `bindEmail as bindEmailApi`, `useTarotStore` |
| 移除 ref | 所有与编辑/邮箱/退出相关的状态 |
| 移除函数 | `handleLoginSuccess`, `handleLogout`, `handleChangeAvatar`, `startEditNickname`, `saveNickname`, `maskMiddle`, `handleBindEmail` |
| 移除模板 | 行内昵称编辑、头像更换、绑定信息区域、邮箱绑定弹窗、退出按钮 |
| 新增 | 整个头部卡片可点击，跳转到详情页 |
| 新增 CSS | `.profile-header` 横向等分布局，`.arrow` 箭头样式 |
| 移除 CSS | 昵称编辑、头像 overlay、绑定信息、邮箱弹窗 等 |

---

## 2. `src/pages/profile-detail/profile-detail.vue` — 新建

### 页面布局

```
┌─ 导航栏: 个人资料 ──────────────────┐
│                                     │
│          🟢 头像（点击更换）          │
│         [点击更换头像]               │
│                                     │
│   昵称    [输入框 失焦自动保存]       │
│   性别    [保密 / 男 / 女]           │
│   生日    [YYYY-MM-DD 日期选择]      │
│                                     │
│   邮箱    [绑定按钮] 或 [已绑定邮箱]   │
│                                     │
│   ─────────────────────────────     │
│         退出登录                      │
└─────────────────────────────────────┘
```

### 交互逻辑

- **头像**：点击调用 `uni.chooseImage` → 上传 base64 → `updateProfile({ avatarUrl })`
- **昵称**：`<input>` 失焦 `@blur` 时自动保存
- **性别**：`<picker mode="selector">` 选项 `['保密', '男', '女']`，`@change` 时自动保存
- **生日**：`<picker mode="date">`，`@change` 时自动保存
- **邮箱**：未绑定显示按钮 → 弹窗绑定（复用原有模态框逻辑）；已绑定只读展示
- **退出登录**：页面底部按钮，点击弹窗确认后 logout 并返回上一页

### 无保存按钮

所有字段修改即保存（`updateProfile`），无需手动提交。

---

## 3. `src/pages.json` — 添加路由

```json
{
  "path": "pages/profile-detail/profile-detail",
  "style": {
    "navigationBarTitleText": "个人资料",
    "navigationBarBackgroundColor": "#1a1a2e",
    "navigationBarTextStyle": "white"
  }
}
```

---

## 4. `src/services/auth.ts` — 类型扩展

### UserInfo 新增字段

```typescript
export interface UserInfo {
  id: string
  nickname: string
  avatarUrl: string | null
  email?: string | null
  gender?: number | null   // 0=保密, 1=男, 2=女
  birthday?: string | null // YYYY-MM-DD
  createdAt: string
}
```

### updateProfile 参数扩展

```typescript
export async function updateProfile(data: {
  nickname?: string
  avatarUrl?: string
  gender?: number
  birthday?: string
}): Promise<{ user: UserInfo }>
```

---

## 数据流

```
profile.vue（我的页面）
    │
    │  点击头像/昵称/箭头
    ▼
profile-detail.vue（个人资料页）
    │
    │  编辑字段 → 失焦/change
    ▼
updateProfile()  →  PUT /api/user/profile
    │
    ▼
setUserInfo(result.user)  →  同步更新本地缓存
```
