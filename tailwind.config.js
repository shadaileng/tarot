/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{html,js,ts,jsx,tsx,vue}',
    '!./src/uni_modules/**/*',
    '!./node_modules/**/*',
    '!./dist/**/*',
    '!./unpackage/**/*',
  ],
  theme: {
    extend: {
      colors: {
        // 背景色
        'bg-primary': '#0f0f23',
        'bg-secondary': '#1a1a2e',
        'bg-card': '#16213e',
        'bg-card-hover': '#1f3460',

        // 文字色
        'text-primary': '#e8d5b7',
        'text-secondary': '#a89b8c',
        'text-muted': '#6b5e53',
        'text-white': '#f5f0e8',

        // 强调色
        'accent-gold': '#c9a96e',
        'accent-gold-light': '#e0c88a',
        'accent-purple': '#7b2d8e',
        'accent-blue': '#4a6fa5',
        'accent-red': '#c0392b',

        // 牌背
        'card-back': '#2c1b4d',
        'card-border': '#c9a96e',

        // 正位/逆位
        upright: '#c9a96e',
        reversed: '#7b2d8e',

        // 功能色
        success: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        sm: '8rpx',
        md: '16rpx',
        lg: '24rpx',
        round: '50%',
      },
      boxShadow: {
        sm: '0 2rpx 8rpx rgba(0, 0, 0, 0.3)',
        md: '0 4rpx 16rpx rgba(0, 0, 0, 0.4)',
        lg: '0 8rpx 32rpx rgba(0, 0, 0, 0.5)',
      },
      transitionDuration: {
        fast: '0.2s',
        normal: '0.3s',
        slow: '0.5s',
      },
    },
  },
  corePlugins: {
    // 小程序不支持，关闭
    preflight: false,
  },
  plugins: [],
}
