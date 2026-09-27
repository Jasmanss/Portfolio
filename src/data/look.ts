import type { ShapeKind } from '../components/Shapes'

// Each project's swatch strip, its accent, and how its cover sits on a card.
export type Look = {
  accent: string
  swatches: [string, string, string]
  shape: ShapeKind
  // Logos sit on a solid card; photos and screenshots fill it.
  fit: 'cover' | 'contain'
  card: string
  // One or two words for the index list.
  category: string
}

export const PROJECT_LOOK: Record<string, Look> = {
  portlkit: { category: 'SaaS', accent: '#6B5CFF', swatches: ['#6B5CFF', '#C9C2FF', '#0B0B0B'], shape: 'ring', fit: 'cover', card: '#1a1a1a' },
  imperium: { category: 'AI agent', accent: '#FF6A1A', swatches: ['#FF6A1A', '#FFD29E', '#0B0B0B'], shape: 'asterisk', fit: 'contain', card: '#0B0B0B' },
  hairstyl: { category: 'iOS app', accent: '#FF5FC8', swatches: ['#FF5FC8', '#FFE0F4', '#0B0B0B'], shape: 'flower', fit: 'cover', card: '#000000' },
  callback: { category: 'Web app', accent: '#2F55D4', swatches: ['#2F55D4', '#A8D4FF', '#E4E9F2'], shape: 'capsule', fit: 'cover', card: '#E4E9F2' },
}
