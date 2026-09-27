import type { ShapeKind } from '../components/Shapes'

// Every project gets its own colour and shape, used on its journey stop and its case study.
export const PROJECT_LOOK: Record<string, { text: string; bg: string; hex: string; shape: ShapeKind }> = {
  portlkit: { text: 'text-lilac', bg: 'bg-lilac', hex: '#A89BFF', shape: 'ring' },
  imperium: { text: 'text-orange', bg: 'bg-orange', hex: '#FF7A1A', shape: 'asterisk' },
  hairstyl: { text: 'text-pink', bg: 'bg-pink', hex: '#FFB3EC', shape: 'flower' },
  callback: { text: 'text-sky', bg: 'bg-sky', hex: '#3CC8F0', shape: 'capsule' },
}
