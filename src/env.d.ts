/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 统一后端 tarot-backend 地址 */
  readonly VITE_BACKEND_API: string
  /** 微信小程序 AppID（构建时由 Vite 插件注入 project.config.json，非运行时 import.meta.env 变量） */
  // readonly TAROT_APPID: string
  /** 是否校验域名白名单（构建时由 Vite 插件注入 project.config.json，非运行时 import.meta.env 变量） */
  // readonly TAROT_URL_CHECK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@dcloudio/uni-app' {
  // 扩展 uni-app 声明
}
