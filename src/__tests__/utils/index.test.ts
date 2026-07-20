import { describe, it, expect, vi } from 'vitest'
import { getFullUrl, formatDate, formatDateTime, generateId, shuffle, truncate, navTo, navBack, switchTab, showToast } from '@/utils/index'

describe('getFullUrl', () => {
  it('null/undefined 返回空字符串', () => {
    expect(getFullUrl(null)).toBe('')
    expect(getFullUrl(undefined)).toBe('')
  })

  it('完整 URL 直接返回', () => {
    expect(getFullUrl('http://example.com/path')).toBe('http://example.com/path')
    expect(getFullUrl('https://example.com/path')).toBe('https://example.com/path')
  })

  it('相对路径拼接 BACKEND_API', () => {
    const result = getFullUrl('/api/test')
    expect(result).toContain('/api/test')
  })
})

describe('formatDate', () => {
  it('格式化时间戳为 YYYY-MM-DD', () => {
    const ts = new Date('2026-07-20').getTime()
    expect(formatDate(ts)).toBe('2026-07-20')
  })
})

describe('formatDateTime', () => {
  it('格式化时间戳为完整时间', () => {
    const d = new Date('2026-07-20T14:30:00')
    const result = formatDateTime(d.getTime())
    expect(result).toContain('2026-07-20')
    expect(result).toContain('14:30')
  })
})

describe('generateId', () => {
  it('生成非空字符串', () => {
    const id = generateId()
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('两次生成结果不同', () => {
    expect(generateId()).not.toBe(generateId())
  })
})

describe('shuffle', () => {
  it('返回新数组', () => {
    const arr = [1, 2, 3]
    const result = shuffle(arr)
    expect(result).not.toBe(arr)
  })

  it('包含所有原数组元素', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffle(arr)
    expect(result.sort()).toEqual(arr.sort())
  })
})

describe('truncate', () => {
  it('短文本不截断', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('长文本截断加省略号', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })
})

describe('导航函数', () => {
  it('navTo 调用 uni.navigateTo', () => {
    navTo('/pages/test')
    expect(globalThis.uni.navigateTo).toHaveBeenCalledWith({ url: '/pages/test' })
  })

  it('navBack 调用 uni.navigateBack', () => {
    navBack()
    expect(globalThis.uni.navigateBack).toHaveBeenCalled()
  })

  it('switchTab 调用 uni.switchTab', () => {
    switchTab('/pages/index')
    expect(globalThis.uni.switchTab).toHaveBeenCalledWith({ url: '/pages/index' })
  })
})

describe('showToast', () => {
  it('调用 uni.showToast', () => {
    showToast('测试消息')
    expect(globalThis.uni.showToast).toHaveBeenCalledWith({
      title: '测试消息',
      icon: 'none',
      duration: expect.any(Number),
    })
  })
})
