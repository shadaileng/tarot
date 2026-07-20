import { vi } from 'vitest'

// Mock uni-app global API
const uniMock = {
  getStorageSync: vi.fn(() => null),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  request: vi.fn(),
  showToast: vi.fn(),
  navigateTo: vi.fn(),
  navigateBack: vi.fn(),
  switchTab: vi.fn(),
  getSystemInfoSync: vi.fn(),
  createSelectorQuery: vi.fn(() => ({
    select: vi.fn(() => ({
      boundingClientRect: vi.fn(() => ({
        exec: vi.fn(),
      })),
    })),
  })),
  uploadFile: vi.fn(),
  downloadFile: vi.fn(),
  canIUse: vi.fn(() => false),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
}

// @ts-expect-error: mock uni global
globalThis.uni = uniMock
globalThis.wx = undefined
globalThis.__APP_VERSION__ = '2.15.4'
