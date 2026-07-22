import type { DrawnCard } from '@/types'

export interface SummaryOptions {
  question: string
  cards: DrawnCard[]
  category: string
  includePrefix?: boolean
  includeBody?: boolean
}

export function generateSummary(options: SummaryOptions): string {
  const { question, cards, category, includePrefix = true, includeBody = true } = options
  const uprightCount = cards.filter((c) => c.orientation === 'upright').length
  const reversedCount = cards.length - uprightCount
  const dominant = uprightCount >= reversedCount ? '积极' : '挑战'

  const mainCard = cards[cards.length - 1]
  const mainKeyword = mainCard.card.keywords[0]

  let body = ''

  if (includeBody) {
    if (category === 'love') {
      body = `关于你的感情问题「${question}」，从牌面整体来看，${dominant}的能量占主导。${
        uprightCount >= reversedCount
          ? '整体趋势向好，建议你保持开放和真诚的态度。'
          : '虽然面临一些挑战，但逆位牌也暗示着成长的机会，勇敢面对问题才能突破。'
      }${mainCard.card.name}作为关键牌，提醒你关注「${mainKeyword}」的力量。`
    } else if (category === 'career') {
      body = `关于你的事业问题「${question}」，牌面呈现${dominant}的态势。${
        uprightCount >= reversedCount
          ? '发展方向是积极的，抓住机遇，脚踏实地前行。'
          : '前路有阻碍，但这也是审视自身策略的好时机，调整方向后更能走稳。'
      }关键在于「${mainKeyword}」——${mainCard.card.name}给你的启示。`
    } else if (category === 'study') {
      body = `关于你的学业问题「${question}」，整体牌面${dominant}。${
        uprightCount >= reversedCount
          ? '学习状态良好，持续努力会有回报。'
          : '可能遇到瓶颈，不妨换个方法或寻求帮助，逆位牌暗示突破需要新的视角。'
      }记住「${mainKeyword}」的力量——这是${mainCard.card.name}给你的指引。`
    } else {
      body = `关于「${question}」，牌面整体呈现${dominant}的能量。${
        uprightCount >= reversedCount
          ? '积极的力量引导你前行，保持信心和行动力。'
          : '挑战虽然存在，但每张逆位牌都在提醒你需要调整的方面，勇敢面对才能转逆为顺。'
      }让「${mainKeyword}」成为你的指引——这是${mainCard.card.name}给你的启示。`
    }
  }

  if (includePrefix) {
    return `\n\n✨ 综合解读（本地补充）\n${body}`
  }

  return body
}
