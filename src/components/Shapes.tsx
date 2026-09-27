import { useId } from 'react'
import type { CSSProperties } from 'react'

export type ShapeKind = 'flower' | 'asterisk' | 'ring' | 'squiggle' | 'capsule' | 'diamond'

const PALETTE: Record<ShapeKind, [string, string]> = {
  flower: ['#FFB3EC', '#FF7A1A'],
  asterisk: ['#FF7A1A', '#FFB3EC'],
  ring: ['#A89BFF', '#3CC8F0'],
  squiggle: ['#A89BFF', '#FFB3EC'],
  capsule: ['#3CC8F0', '#2BF27A'],
  diamond: ['#FF7A1A', '#FFD66B'],
}

type Props = {
  kind: ShapeKind
  size?: number
  colors?: [string, string]
  className?: string
  style?: CSSProperties
}

// Glossy, gradient-filled shapes that float around the page. Each has a soft highlight so it reads as a solid object.
export default function Shape({ kind, size = 120, colors, className = '', style }: Props) {
  const id = useId().replace(/:/g, '')
  const [a, b] = colors ?? PALETTE[kind]
  const fill = `url(#g${id})`
  const shine = `url(#s${id})`

  const body = {
    flower: (
      <g>
        {[0, 90, 180, 270].map((r) => (
          <ellipse key={r} cx="60" cy="33" rx="23" ry="27" fill={fill} transform={`rotate(${r} 60 60)`} />
        ))}
        <circle cx="60" cy="60" r="16" fill={fill} />
        <ellipse cx="46" cy="30" rx="12" ry="8" fill={shine} transform="rotate(-30 46 30)" />
      </g>
    ),
    asterisk: (
      <g>
        {[0, 60, 120].map((r) => (
          <rect key={r} x="51" y="8" width="18" height="104" rx="9" fill={fill} transform={`rotate(${r} 60 60)`} />
        ))}
        <ellipse cx="56" cy="22" rx="5" ry="10" fill={shine} />
      </g>
    ),
    ring: (
      <g>
        <circle cx="60" cy="60" r="38" fill="none" stroke={fill} strokeWidth="22" />
        <path d="M30 42 A38 38 0 0 1 58 22" fill="none" stroke={shine} strokeWidth="8" strokeLinecap="round" />
      </g>
    ),
    squiggle: (
      <g>
        <path d="M10 70 C 25 30, 40 30, 50 60 S 75 95, 85 55 S 105 20, 112 40" fill="none" stroke={fill} strokeWidth="20" strokeLinecap="round" />
        <path d="M22 50 C 28 40, 36 38, 42 46" fill="none" stroke={shine} strokeWidth="5" strokeLinecap="round" />
      </g>
    ),
    capsule: (
      <g>
        <rect x="14" y="36" width="92" height="48" rx="24" fill={fill} transform="rotate(-24 60 60)" />
        <rect x="28" y="44" width="40" height="10" rx="5" fill={shine} transform="rotate(-24 60 60)" />
      </g>
    ),
    diamond: (
      <g>
        <rect x="26" y="26" width="68" height="68" rx="14" fill={fill} transform="rotate(45 60 60)" />
        <ellipse cx="52" cy="36" rx="12" ry="6" fill={shine} transform="rotate(-40 52 36)" />
      </g>
    ),
  }[kind]

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden className={className} style={style}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <radialGradient id={`s${id}`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {body}
    </svg>
  )
}
