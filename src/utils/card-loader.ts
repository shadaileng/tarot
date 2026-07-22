const cardImageCache = new Map<string, string>()

export async function loadCardImage(cardId: string): Promise<string> {
  if (cardImageCache.has(cardId)) {
    return cardImageCache.get(cardId)!
  }

  try {
    const module = await import(`@/static/cards/${cardId}.svg`)
    const url = module.default
    cardImageCache.set(cardId, url)
    return url
  } catch {
    console.error(`Failed to load card image: ${cardId}`)
    return '/static/cards/default.svg'
  }
}

export function preloadCardImages(cardIds: string[]): Promise<void[]> {
  return Promise.all(cardIds.map(id => loadCardImage(id).then(() => {})))
}
