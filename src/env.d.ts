/// <reference types="@dcloudio/types" />
/// <reference types="vite/client" />

declare const __APP_VERSION__: string

// wx 全局变量在 #ifdef MP-WEIXIN 条件编译块中使用
declare const wx: any

declare global {
  var uni: any
  var wx: any
  var __APP_VERSION__: string
}

export {}
