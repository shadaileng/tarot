export interface CardPosition {
  id: number
  x: number
  y: number
  rotation: number
  label: string
}

export interface SpreadConfig {
  type: 'single' | 'three' | 'celtic'
  positions: CardPosition[]
}

export interface CardSpreadProps {
  spreadType: 'single' | 'three' | 'celtic'
  cards: any[]
  revealedIndices: number[]
  onCardTap?: (index: number) => void
}
