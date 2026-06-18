/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 统一后端 tarot-backend 地址 */
  readonly VITE_BACKEND_API: string
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
