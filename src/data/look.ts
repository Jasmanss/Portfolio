import type { ShapeKind } from '../components/Shapes'

// How each project hangs in the gallery: its painting, the painting's own title, and its size on the wall.
export type Look = {
  numeral: string
  painting: string
  // The artwork's title; the project name stays the headline.
  artwork: string
  // Width over height of the painting.
  aspect: number
  accent: string
  shape: ShapeKind
}

export const PROJECT_LOOK: Record<string, Look> = {
  portlkit: { numeral: 'I', painting: '/museum/portlkit.jpg', artwork: 'One Door on the Mountain', aspect: 1168 / 880, accent: '#E9C98A', shape: 'ring' },
  imperium: { numeral: 'II', painting: '/museum/imperium.jpg', artwork: 'The Emperor Commands His Machine', aspect: 880 / 1168, accent: '#E9C98A', shape: 'asterisk' },
  hairstyl: { numeral: 'III', painting: '/museum/hairstyl.jpg', artwork: 'Young Man Consulting the Mirror', aspect: 880 / 1168, accent: '#E9C98A', shape: 'flower' },
  callback: { numeral: 'IV', painting: '/museum/callback.jpg', artwork: 'Still Life with Unanswered Letters', aspect: 1, accent: '#E9C98A', shape: 'capsule' },
}

// "Next.js, TypeScript and Supabase on canvas": a project's stack written as a painting's medium.
export const medium = (stack: string[]) => {
  const top = stack.slice(0, 3)
  return `${top.slice(0, -1).join(', ')} and ${top[top.length - 1]} on canvas`
}
