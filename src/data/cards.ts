import type { Card, Suit } from '@/types'

// ========== 大阿卡纳（22张） ==========
export const majorArcana: Card[] = [
  {
    id: 'major-00', name: '愚者', nameEn: 'The Fool', type: 'major', number: 0,
    image: '/static/cards/major-00.svg', keywords: ['开始', '冒险', '天真'],
    uprightMeaning: '新的开始，冒险精神，天真烂漫，无限可能',
    reversedMeaning: '鲁莽，犹豫不决，错失良机',
    description: '愚者象征着新的旅程开始，代表着纯真和无限的可能性。',
  },
  {
    id: 'major-01', name: '魔术师', nameEn: 'The Magician', type: 'major', number: 1,
    image: '/static/cards/major-01.svg', keywords: ['创造', '能力', '意志'],
    uprightMeaning: '创造力，技能娴熟，意志坚定，新的开始',
    reversedMeaning: '能力不足，计划受阻，被欺骗',
    description: '魔术师代表着将想法转化为现实的能力，象征着创造力和意志力。',
  },
  {
    id: 'major-02', name: '女祭司', nameEn: 'The High Priestess', type: 'major', number: 2,
    image: '/static/cards/major-02.svg', keywords: ['直觉', '神秘', '潜意识'],
    uprightMeaning: '直觉敏锐，内在智慧，神秘力量',
    reversedMeaning: '忽略直觉，秘密暴露，情感封闭',
    description: '女祭司象征着内在的智慧和直觉，代表着潜意识的深层力量。',
  },
  {
    id: 'major-03', name: '女皇', nameEn: 'The Empress', type: 'major', number: 3,
    image: '/static/cards/major-03.svg', keywords: ['丰收', '母性', '自然'],
    uprightMeaning: '丰收繁荣，母性关怀，创造力，与自然和谐',
    reversedMeaning: '依赖他人，创造力枯竭，情感贫瘠',
    description: '女皇象征着丰收、母性和自然的丰饶力量。',
  },
  {
    id: 'major-04', name: '皇帝', nameEn: 'The Emperor', type: 'major', number: 4,
    image: '/static/cards/major-04.svg', keywords: ['权威', '稳定', '领导'],
    uprightMeaning: '权威稳固，领导力强，秩序井然',
    reversedMeaning: '专制，缺乏纪律，权威动摇',
    description: '皇帝象征着权威和稳定的力量，代表着秩序和领导力。',
  },
  {
    id: 'major-05', name: '教皇', nameEn: 'The Hierophant', type: 'major', number: 5,
    image: '/static/cards/major-05.svg', keywords: ['传统', '信仰', '指导'],
    uprightMeaning: '遵循传统，精神指引，获得真知',
    reversedMeaning: '挑战传统，思想僵化，误导',
    description: '教皇象征着传统价值观和精神指引的力量。',
  },
  {
    id: 'major-06', name: '恋人', nameEn: 'The Lovers', type: 'major', number: 6,
    image: '/static/cards/major-06.svg', keywords: ['爱情', '选择', '和谐'],
    uprightMeaning: '真挚的爱情，和谐的关系，重要的选择',
    reversedMeaning: '感情不和，错误选择，分离',
    description: '恋人象征着爱情、和谐与人生中的重要选择。',
  },
  {
    id: 'major-07', name: '战车', nameEn: 'The Chariot', type: 'major', number: 7,
    image: '/static/cards/major-07.svg', keywords: ['胜利', '意志', '前进'],
    uprightMeaning: '克服困难，胜利在望，意志力强大',
    reversedMeaning: '失控，失败，方向迷失',
    description: '战车象征着通过意志力克服困难，取得胜利。',
  },
  {
    id: 'major-08', name: '力量', nameEn: 'Strength', type: 'major', number: 8,
    image: '/static/cards/major-08.svg', keywords: ['勇气', '耐心', '内在力量'],
    uprightMeaning: '内在力量，勇气十足，耐心克制',
    reversedMeaning: '软弱无力，缺乏自信，冲动',
    description: '力量象征着以柔克刚的内在力量，代表着勇气和耐心。',
  },
  {
    id: 'major-09', name: '隐士', nameEn: 'The Hermit', type: 'major', number: 9,
    image: '/static/cards/major-09.svg', keywords: ['内省', '智慧', '孤独'],
    uprightMeaning: '内省深思，寻求真理，精神指引',
    reversedMeaning: '孤僻，逃避现实，拒绝建议',
    description: '隐士象征着向内探索，在孤独中寻找智慧和真理。',
  },
  {
    id: 'major-10', name: '命运之轮', nameEn: 'Wheel of Fortune', type: 'major', number: 10,
    image: '/static/cards/major-10.svg', keywords: ['命运', '转变', '机遇'],
    uprightMeaning: '命运转折，好运降临，循环往复',
    reversedMeaning: '厄运，抗拒变化，错失良机',
    description: '命运之轮象征着生命的循环和命运的转变。',
  },
  {
    id: 'major-11', name: '正义', nameEn: 'Justice', type: 'major', number: 11,
    image: '/static/cards/major-11.svg', keywords: ['公正', '平衡', '真理'],
    uprightMeaning: '公正裁决，真相大白，平衡和谐',
    reversedMeaning: '不公，偏见，失衡',
    description: '正义象征着公平和真理，代表着因果报应。',
  },
  {
    id: 'major-12', name: '倒吊人', nameEn: 'The Hanged Man', type: 'major', number: 12,
    image: '/static/cards/major-12.svg', keywords: ['牺牲', '换个角度', '等待'],
    uprightMeaning: '自我牺牲，换个角度看问题，耐心等待',
    reversedMeaning: '徒劳牺牲，固执己见，停滞不前',
    description: '倒吊人象征着以不同的视角看待世界，代表着牺牲和等待。',
  },
  {
    id: 'major-13', name: '死神', nameEn: 'Death', type: 'major', number: 13,
    image: '/static/cards/major-13.svg', keywords: ['结束', '转变', '重生'],
    uprightMeaning: '结束与新生，彻底转变，放下过去',
    reversedMeaning: '抗拒改变，停滞腐烂，恐惧',
    description: '死神并非代表肉体的死亡，而是象征旧事物的结束和新生命的开始。',
  },
  {
    id: 'major-14', name: '节制', nameEn: 'Temperance', type: 'major', number: 14,
    image: '/static/cards/major-14.svg', keywords: ['调和', '平衡', '中庸'],
    uprightMeaning: '调和平衡，中庸之道，自我控制',
    reversedMeaning: '失衡，过度放纵，冲突',
    description: '节制象征着调和与平衡，代表着适度和自我控制。',
  },
  {
    id: 'major-15', name: '恶魔', nameEn: 'The Devil', type: 'major', number: 15,
    image: '/static/cards/major-15.svg', keywords: ['欲望', '束缚', '物质'],
    uprightMeaning: '物质束缚，欲望诱惑，但可挣脱',
    reversedMeaning: '摆脱束缚，觉醒，拒绝诱惑',
    description: '恶魔象征着物质世界的束缚和欲望，提醒我们审视自己的执念。',
  },
  {
    id: 'major-16', name: '高塔', nameEn: 'The Tower', type: 'major', number: 16,
    image: '/static/cards/major-16.svg', keywords: ['剧变', '崩塌', '启示'],
    uprightMeaning: '突如其来的剧变，旧结构崩塌，觉醒',
    reversedMeaning: '避免灾难，压抑改变，恐惧',
    description: '高塔象征着突然的剧变和旧有结构的崩塌，预示着重大转折。',
  },
  {
    id: 'major-17', name: '星星', nameEn: 'The Star', type: 'major', number: 17,
    image: '/static/cards/major-17.svg', keywords: ['希望', '治愈', '灵感'],
    uprightMeaning: '希望之光，内心治愈，灵感涌现',
    reversedMeaning: '失去希望，沮丧，怀疑',
    description: '星星象征着希望和治愈，在黑暗中指引方向。',
  },
  {
    id: 'major-18', name: '月亮', nameEn: 'The Moon', type: 'major', number: 18,
    image: '/static/cards/major-18.svg', keywords: ['潜意识', '恐惧', '幻觉'],
    uprightMeaning: '探索潜意识，面对恐惧，直觉指引',
    reversedMeaning: '恐惧消散，真相浮现，混乱',
    description: '月亮象征着潜意识的深层世界，代表着恐惧和幻觉。',
  },
  {
    id: 'major-19', name: '太阳', nameEn: 'The Sun', type: 'major', number: 19,
    image: '/static/cards/major-19.svg', keywords: ['快乐', '成功', '活力'],
    uprightMeaning: '幸福快乐，成功辉煌，充满活力',
    reversedMeaning: '短暂的不快，延迟的成功，缺乏活力',
    description: '太阳是卡牌中最积极的牌之一，象征着快乐、成功和生命力。',
  },
  {
    id: 'major-20', name: '审判', nameEn: 'Judgement', type: 'major', number: 20,
    image: '/static/cards/major-20.svg', keywords: ['重生', '觉醒', '召唤'],
    uprightMeaning: '重获新生，内心觉醒，回应召唤',
    reversedMeaning: '拒绝改变，自我怀疑，错失使命',
    description: '审判象征着觉醒和重生，代表着回应内心召唤的时刻。',
  },
  {
    id: 'major-21', name: '世界', nameEn: 'The World', type: 'major', number: 21,
    image: '/static/cards/major-21.svg', keywords: ['完成', '圆满', '成就'],
    uprightMeaning: '圆满成功，目标达成，新的境界',
    reversedMeaning: '未完成，延迟成功，不满足',
    description: '世界象征着旅程的圆满结束，代表着成功和完满。',
  },
]

// ========== 小阿卡纳（56张） ==========
const suitNames: Record<Suit, { cn: string; en: string }> = {
  wands: { cn: '权杖', en: 'Wands' },
  cups: { cn: '圣杯', en: 'Cups' },
  swords: { cn: '宝剑', en: 'Swords' },
  pentacles: { cn: '星币', en: 'Pentacles' },
}

const minorNames: Record<Suit, string[]> = {
  wands: ['王牌', '二', '三', '四', '五', '六', '七', '八', '九', '十', '侍从', '骑士', '王后', '国王'],
  cups: ['王牌', '二', '三', '四', '五', '六', '七', '八', '九', '十', '侍从', '骑士', '王后', '国王'],
  swords: ['王牌', '二', '三', '四', '五', '六', '七', '八', '九', '十', '侍从', '骑士', '王后', '国王'],
  pentacles: ['王牌', '二', '三', '四', '五', '六', '七', '八', '九', '十', '侍从', '骑士', '王后', '国王'],
}

const minorKeywords: Record<Suit, string[][]> = {
  wands: [
    ['创造力', '灵感', '新开始'], ['规划', '未来', '决定'],
    ['远见', '领导', '探索'], ['庆祝', '和谐', '稳定'],
    ['竞争', '冲突', '挑战'], ['胜利', '认可', '进步'],
    ['坚守', '防御', '坚持'], ['快速', '行动', '旅行'],
    ['韧性', '坚持', '最后冲刺'], ['负担', '责任', '完成'],
    ['探索', '热情', '自由'], ['冒险', '行动', '激情'],
    ['温暖', '决心', '魅力'], ['领导', '远见', '成就'],
  ],
  cups: [
    ['情感', '爱', '直觉'], ['连接', '伙伴', '和谐'],
    ['欢庆', '友谊', '团聚'], ['沉思', '不满', '冷漠'],
    ['失落', '悲伤', '遗憾'], ['回忆', '怀旧', '纯真'],
    ['幻想', '选择', '迷惑'], ['追寻', '离开', '探索'],
    ['满足', '感恩', '丰盛'], ['幸福', '家庭', '圆满'],
    ['创意', '情感', '消息'], ['浪漫', '邀请', '追求'],
    ['慈悲', '直觉', '宁静'], ['情感成熟', '关怀', '艺术'],
  ],
  swords: [
    ['清晰', '真理', '决断'], ['抉择', '平衡', '僵局'],
    ['心碎', '悲伤', '痛苦'], ['休息', '恢复', '沉思'],
    ['失败', '屈辱', '损失'], ['过渡', '改变', '放手'],
    ['策略', '欺骗', '偷窃'], ['束缚', '恐惧', '无力'],
    ['噩梦', '焦虑', '绝望'], ['结束', '背叛', '崩溃'],
    ['好奇', '新想法', '警惕'], ['行动', '决心', '冲锋'],
    ['洞察', '独立', '界限'], ['真理', '权威', '理智'],
  ],
  pentacles: [
    ['机会', '繁荣', '新开始'], ['平衡', '适应', '灵活'],
    ['技能', '团队', '协作'], ['安全', '保守', '守财'],
    ['贫困', '担忧', '孤立'], ['慷慨', '分享', '给予'],
    ['耐心', '成长', '评估'], ['勤奋', '专注', '技艺'],
    ['收获', '奢侈', '独立'], ['财富', '传承', '稳定'],
    ['学习', '务实', '可靠'], ['效率', '责任', '坚持'],
    ['滋养', '实际', '繁荣'], ['富足', '稳重', '成功'],
  ],
}

export const minorArcana: Card[] = (Object.keys(suitNames) as Suit[]).flatMap((suit) =>
  minorNames[suit].map((name, i) => ({
    id: `minor-${suit}-${String(i + 1).padStart(2, '0')}`,
    name: `${suitNames[suit].cn}${name}`,
    nameEn: `${name} of ${suitNames[suit].en}`,
    type: suit,
    number: -1,
    image: `/static/cards/minor-${suit}-${String(i + 1).padStart(2, '0')}.svg`,
    keywords: minorKeywords[suit][i],
    uprightMeaning: `${suitNames[suit].cn}${name}正位：${minorKeywords[suit][i].join('，')}。代表着${suitNames[suit].cn}特质的积极面向。`,
    reversedMeaning: `${suitNames[suit].cn}${name}逆位：${minorKeywords[suit][i].join('，')}的反面。提醒注意${suitNames[suit].cn}特质的消极面向。`,
    description: `${suitNames[suit].cn}${name}是${suitNames[suit].cn}牌组中的一张牌，代表着${minorKeywords[suit][i].join('、')}等含义。`,
  })),
)

/** 所有 78 张卡牌 */
export const allCards: Card[] = [...majorArcana, ...minorArcana]

/** 根据 ID 获取牌 */
export function getCardById(id: string): Card | undefined {
  return allCards.find((c) => c.id === id)
}

/** 随机抽取 N 张牌 */
export function drawRandomCards(count: number): Card[] {
  const shuffled = [...allCards].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
