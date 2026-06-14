/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cloudflare Worker API 地址 */
  readonly VITE_API_URL: string
  /** 海报微服务地址 */
  readonly VITE_POSTER_API: string
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
