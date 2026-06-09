import path from 'node:path'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { WeappTailwindcss } from 'weapp-tailwindcss/vite'

export default defineConfig({
  plugins: [
    uni(),
    WeappTailwindcss({
      rem2rpx: true,
      cssEntries: [path.resolve(__dirname, 'src/app.css')],
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/variables.scss";',
        silenceDeprecations: ['legacy-js-api', 'import'],
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // CloudStudio 需要监听所有网络接口
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
