// Cloudflare Worker - 塔罗牌 AI 解读 API
// 使用 Cloudflare Workers AI 生成个性化解读

interface CardInput {
  position: string
  name: string
  isUpright: boolean
  uprightMeaning: string
  reversedMeaning: string
  keywords: string[]
}

interface RequestBody {
  question: string
  cards: CardInput[]
}

interface Env {
  AI: any
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    try {
      const body: RequestBody = await request.json()
      const { question, cards } = body

      if (!question || !cards || cards.length === 0) {
        return new Response(JSON.stringify({ error: 'Missing question or cards' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      const cardsInfo = cards
        .map(
          (c) =>
            `位置「${c.position}」：${c.name}（${c.isUpright ? '正位' : '逆位'}）
关键词：${c.keywords.join('、')}
通用含义：${c.isUpright ? c.uprightMeaning : c.reversedMeaning}`,
        )
        .join('\n\n')

      const systemPrompt = `你是一位经验丰富、富有同理心的塔罗占卜师。你的解读风格温暖而深刻，善于将牌面含义与用户的实际问题建立关联。请用中文回答。`

      const userPrompt = `用户的问题：「${question}」

抽到的牌如下：
${cardsInfo}

请结合用户的问题，给出个性化的塔罗解读。要求：
1. 对每张牌，结合其在牌阵中的位置含义，给出与用户问题直接相关的解读（而非仅仅重复通用含义）
2. 最后给出一段综合总结，将所有牌的信息串联起来，回应用户的问题
3. 语言温暖、有洞察力，避免过于笼统
4. 每张牌的解读用「📍 位置：XXX」作为标题开头
5. 综合总结用「✨ 综合解读」作为标题`

      const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
      })

      const reading = (response as any).response || ''

      return new Response(JSON.stringify({ reading }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (error: any) {
      console.error('AI reading error:', error)
      return new Response(
        JSON.stringify({ error: error.message || 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        },
      )
    }
  },
}
