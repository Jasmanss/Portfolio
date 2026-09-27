import { useEffect, useId, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { NOW } from '../data/content'

// Carved corner ornament: two acanthus leaves meeting at a bead.
function Corner({ className, style }: { className: string; style?: CSSProperties }) {
  const id = useId()
  return (
    <svg viewBox="0 0 60 60" aria-hidden className={`absolute size-[clamp(26px,3.4vw,52px)] drop-shadow-[1px_2px_1px_rgba(0,0,0,0.5)] ${className}`} style={style}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset=".45" stopColor="#c9993a" />
          <stop offset=".7" stopColor="#f6e27a" />
          <stop offset="1" stopColor="#6e5114" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} stroke="#5a4210" strokeWidth=".8">
        <path d="M3 3c20 0 33 7 35 18-6-5-14-5-18 1-2-8-8-12-17-12z" />
        <path d="M3 3c0 20 7 33 18 35-5-6-5-14 1-18-8-2-12-8-12-17z" />
        <path d="M22 22c8 1 14 5 16 12-5-3-10-3-13 0 1-4 0-8-3-12z" />
        <circle cx="13" cy="13" r="5.5" />
      </g>
    </svg>
  )
}

// A gilt frame: carved outer molding with corner ornaments, a beaded strip, a cove, then the canvas.
export function GoldFrame({ children, oval = false, className = '' }: { children: ReactNode; oval?: boolean; className?: string }) {
  const round = oval ? 'rounded-[50%]' : ''
  return (
    <div
      className={`gilt relative p-[clamp(12px,1.9vw,28px)] shadow-[0_28px_45px_-12px_rgba(0,0,0,0.75),inset_0_0_0_1px_rgba(90,66,16,0.9),inset_2px_2px_3px_rgba(255,243,176,0.8),inset_-3px_-3px_5px_rgba(60,40,5,0.7)] ${round} ${className}`}
    >
      {!oval && (
        <>
          <Corner className="-left-[6px] -top-[6px]" />
          <Corner className="-right-[6px] -top-[6px]" style={{ transform: 'scaleX(-1)' }} />
          <Corner className="-bottom-[6px] -left-[6px]" style={{ transform: 'scaleY(-1)' }} />
          <Corner className="-bottom-[6px] -right-[6px]" style={{ transform: 'scale(-1)' }} />
        </>
      )}
      {/* Bead-and-reel strip */}
      <div
        className={`p-[5px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.6)] ${round}`}
        style={{
          backgroundColor: '#8a6a1f',
          backgroundImage: 'radial-gradient(circle at 40% 35%, #fff3b0 0 1.2px, #d4af5a 1.8px, #6e5114 3px, transparent 3.3px)',
          backgroundSize: '7px 7px',
        }}
      >
        {/* Cove */}
        <div
          className={`p-[clamp(5px,0.7vw,11px)] shadow-[inset_3px_3px_6px_rgba(40,25,0,0.7),inset_-2px_-2px_3px_rgba(255,243,176,0.6)] ${round}`}
          style={{ backgroundImage: 'linear-gradient(315deg, #6e5114, #e9c863 30%, #fff3b0 45%, #b8892d 65%, #f6e27a 85%, #8a6a1f)' }}
        >
          <div className={`relative overflow-hidden bg-[#140a05] p-[2px] ${round}`}>
            {children}
            {/* Varnish sheen and the shadow the frame casts onto the canvas */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 shadow-[inset_0_6px_14px_rgba(0,0,0,0.65),inset_0_-2px_6px_rgba(0,0,0,0.4)] ${round}`}
              style={{ backgroundImage: 'linear-gradient(118deg, transparent 35%, rgba(255,245,220,0.09) 48%, transparent 60%)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// A brass picture lamp on the top rail of a frame, with the warm pool of light it throws.
export function PictureLamp({ lit = true }: { lit?: boolean }) {
  return (
    <>
      <div aria-hidden className="absolute left-1/2 -top-[clamp(30px,3vw,44px)] z-10 w-[46%] -translate-x-1/2">
        <div className="mx-auto h-[clamp(18px,1.8vw,26px)] w-[6px] bg-gradient-to-r from-[#6e5114] via-[#f6e27a] to-[#6e5114]" />
        <div className="gilt h-[clamp(9px,0.9vw,13px)] rounded-full shadow-[0_3px_4px_rgba(0,0,0,0.6)]" />
      </div>
      <div
        aria-hidden
        data-glow
        className="pointer-events-none absolute -inset-x-[12%] -top-[6%] z-10 h-[75%] mix-blend-screen transition-opacity duration-700"
        style={{
          opacity: lit ? 1 : 0.25,
          backgroundImage: 'radial-gradient(ellipse 60% 70% at 50% 0%, rgba(255,214,150,0.42), rgba(255,190,120,0.12) 45%, transparent 70%)',
        }}
      />
    </>
  )
}

// Brass posts with a drooping red velvet rope, set in front of a painting.
export function Stanchions({ className = '' }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 400 120" aria-hidden className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${id}b`} x1="0" x2="1">
          <stop offset="0" stopColor="#6e5114" />
          <stop offset=".35" stopColor="#fff3b0" />
          <stop offset=".6" stopColor="#c9993a" />
          <stop offset="1" stopColor="#5a4210" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d23a44" />
          <stop offset=".5" stopColor="#8e1119" />
          <stop offset="1" stopColor="#4a070c" />
        </linearGradient>
      </defs>
      <path d="M22 22 Q200 92 378 22" fill="none" stroke={`url(#${id}r)`} strokeWidth="11" strokeLinecap="round" />
      <path d="M22 19 Q200 89 378 19" fill="none" stroke="rgba(255,160,160,.35)" strokeWidth="2" />
      {[14, 370].map((x) => (
        <g key={x} fill={`url(#${id}b)`}>
          <circle cx={x + 8} cy="14" r="9" />
          <rect x={x + 3} y="20" width="10" height="84" rx="3" />
          <ellipse cx={x + 8} cy="110" rx="20" ry="7" />
        </g>
      ))}
    </svg>
  )
}

// One velvet drape with a gold tieback and tassel. `side` is where it gathers; position it with `className`.
export function Drape({ side, className = '' }: { side: 'left' | 'right'; className?: string }) {
  // Full at the rod, pinched at the tieback, flaring to the floor.
  const clip =
    side === 'left'
      ? 'polygon(0 0, 100% 0, 96% 20%, 70% 45%, 38% 60%, 48% 72%, 78% 100%, 0 100%)'
      : 'polygon(0 0, 100% 0, 100% 100%, 22% 100%, 52% 72%, 62% 60%, 30% 45%, 4% 20%)'
  return (
    <div data-drape className={className} style={{ transformOrigin: side === 'left' ? '0 0' : '100% 0' }}>
      <div className="velvet absolute inset-0 drop-shadow-[8px_0_14px_rgba(0,0,0,0.6)]" style={{ clipPath: clip }} />
      {/* Tieback rope and tassel */}
      <div aria-hidden className={`absolute top-[58%] ${side === 'left' ? 'left-[2%] w-[46%]' : 'right-[2%] w-[46%]'}`}>
        <div className="gilt h-[7px] rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.6)]" style={{ transform: `rotate(${side === 'left' ? 8 : -8}deg)` }} />
        <div className={`absolute top-1 ${side === 'left' ? 'right-0' : 'left-0'} flex flex-col items-center`}>
          <div className="gilt size-[14px] rounded-full" />
          <div
            className="h-[46px] w-[20px] rounded-b-[40%]"
            style={{ backgroundImage: 'repeating-linear-gradient(90deg, #6e5114 0 2px, #f6e27a 2px 4px, #b8892d 4px 5px)' }}
          />
        </div>
      </div>
    </div>
  )
}

// A tall arched window onto the garden, dressed with drapes and a gilded rod,
// throwing a shaft of afternoon light with dust drifting through it.
export function Window({ className = '' }: { className?: string }) {
  const motes = Array.from({ length: 16 }, (_, i) => i)
  return (
    <div className={`relative ${className}`}>
      {/* Light shaft */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[20%] top-[18%] h-[120%] w-[190%] mix-blend-screen"
        style={{
          clipPath: 'polygon(0 0, 32% 0, 100% 100%, 42% 100%)',
          backgroundImage: 'linear-gradient(160deg, rgba(255,226,160,0.32), rgba(255,200,120,0.08) 60%, transparent)',
        }}
      >
        {motes.map((i) => (
          <span
            key={i}
            className="absolute size-[3px] rounded-full bg-[#fff1c9] motion-safe:animate-[drift_9s_linear_infinite]"
            style={
              {
                left: `${10 + ((i * 37) % 50)}%`,
                top: `${(i * 53) % 70}%`,
                animationDelay: `${-i * 0.7}s`,
                animationDuration: `${7 + (i % 5)}s`,
                '--dx': `${20 + (i % 4) * 15}px`,
                '--dy': `${60 + (i % 3) * 50}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Casing */}
      <div className="relative mx-auto h-full w-[62%] rounded-t-full bg-[#e9dcc0] p-[14px] shadow-[0_30px_50px_-10px_rgba(0,0,0,0.7),inset_0_0_0_3px_#c9993a]">
        <div className="relative h-full overflow-hidden rounded-t-full shadow-[inset_0_0_0_6px_#d9c9a4,inset_0_0_20px_rgba(0,0,0,0.5)]">
          <img data-garden src="/museum/garden.jpg" alt="" className="absolute inset-0 h-full w-full scale-110 object-cover" />
          {/* Glass */}
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(115deg, rgba(255,255,255,0.18), transparent 30%, transparent 60%, rgba(255,255,255,0.1) 70%, transparent 78%)' }} />
          {/* Mullions */}
          <div className="absolute inset-y-0 left-1/2 w-[8px] -translate-x-1/2 bg-[#e9dcc0] shadow-[0_0_4px_rgba(0,0,0,0.4)]" />
          {[28, 52, 76].map((t) => (
            <div key={t} className="absolute inset-x-0 h-[8px] bg-[#e9dcc0] shadow-[0_0_4px_rgba(0,0,0,0.4)]" style={{ top: `${t}%` }} />
          ))}
        </div>
        {/* Sill */}
        <div className="absolute -bottom-[14px] -left-[6%] h-[18px] w-[112%] bg-[#e9dcc0] shadow-[0_8px_10px_rgba(0,0,0,0.5),inset_0_-3px_0_#c9b58e]" />
      </div>

      {/* Rod and drapes */}
      <div className="absolute -top-[4%] left-0 right-0 flex items-center">
        <div className="gilt size-[22px] rounded-full shadow-[0_3px_4px_rgba(0,0,0,0.6)]" />
        <div className="gilt h-[10px] flex-1 rounded-full shadow-[0_3px_4px_rgba(0,0,0,0.6)]" />
        <div className="gilt size-[22px] rounded-full shadow-[0_3px_4px_rgba(0,0,0,0.6)]" />
      </div>
      <Drape side="left" className="absolute -top-[3%] bottom-[-6%] left-[2%] w-[30%]" />
      <Drape side="right" className="absolute -top-[3%] bottom-[-6%] right-[2%] w-[30%]" />
      {/* Swagged valance */}
      <svg viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden className="absolute -top-[4%] left-0 h-[9%] w-full drop-shadow-[0_6px_6px_rgba(0,0,0,0.55)]">
        <defs>
          <linearGradient id="valance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a070c" />
            <stop offset=".6" stopColor="#a8162a" />
            <stop offset="1" stopColor="#5e0a10" />
          </linearGradient>
        </defs>
        <path d="M0 0H400V22Q350 62 300 22Q250 62 200 22Q150 62 100 22Q50 62 0 22Z" fill="url(#valance)" />
        <path d="M0 22Q50 62 100 22Q150 62 200 22Q250 62 300 22Q350 62 400 22" fill="none" stroke="#d4af5a" strokeWidth="3" strokeDasharray="2 2" />
      </svg>
    </div>
  )
}

// Hours and minutes in Michigan right now.
function useMichiganTime() {
  const read = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: NOW.timeZone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date())
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
    return { h: get('hour'), m: get('minute') }
  }
  const [t, setT] = useState(read)
  useEffect(() => {
    const id = window.setInterval(() => setT(read()), 20000)
    return () => window.clearInterval(id)
  }, [])
  return t
}

const NUMERALS = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']

// A longcase clock set to Michigan time, pendulum swinging.
export function GrandfatherClock({ className = '' }: { className?: string }) {
  const { h, m } = useMichiganTime()
  const hourAngle = ((h % 12) + m / 60) * 30
  const minuteAngle = m * 6
  return (
    <svg viewBox="0 0 160 460" role="img" aria-label={`A grandfather clock showing ${h % 12 || 12}:${String(m).padStart(2, '0')}, Michigan time`} className={className}>
      <defs>
        <linearGradient id="clockwood" x1="0" x2="1">
          <stop offset="0" stopColor="#1c0c05" />
          <stop offset=".3" stopColor="#5a2c14" />
          <stop offset=".55" stopColor="#3a1a0b" />
          <stop offset="1" stopColor="#1c0c05" />
        </linearGradient>
        <linearGradient id="clockbrass" x1="0" x2="1">
          <stop offset="0" stopColor="#6e5114" />
          <stop offset=".4" stopColor="#fff3b0" />
          <stop offset="1" stopColor="#8a6a1f" />
        </linearGradient>
      </defs>
      {/* Hood with arched pediment */}
      <path d="M14 120V40Q80-6 146 40v80z" fill="url(#clockwood)" />
      <path d="M22 118V44Q80 6 138 44v74z" fill="none" stroke="url(#clockbrass)" strokeWidth="2" />
      <circle cx="80" cy="18" r="6" fill="url(#clockbrass)" />
      <circle cx="80" cy="80" r="44" fill="url(#clockbrass)" />
      <circle cx="80" cy="80" r="39" fill="#f4ead2" />
      {NUMERALS.map((n, i) => {
        const a = (i * 30 * Math.PI) / 180
        return (
          <text key={n} x={80 + Math.sin(a) * 31} y={80 - Math.cos(a) * 31 + 3} fontSize="7.5" textAnchor="middle" fill="#24150e" fontFamily="Cinzel, serif">
            {n}
          </text>
        )
      })}
      <g stroke="#24150e" strokeLinecap="round">
        <line x1="80" y1="80" x2="80" y2="58" strokeWidth="3.2" transform={`rotate(${hourAngle} 80 80)`} />
        <line x1="80" y1="80" x2="80" y2="50" strokeWidth="1.8" transform={`rotate(${minuteAngle} 80 80)`} />
      </g>
      <circle cx="80" cy="80" r="3" fill="url(#clockbrass)" />
      {/* Trunk with pendulum window */}
      <rect x="28" y="120" width="104" height="270" fill="url(#clockwood)" />
      <rect x="50" y="140" width="60" height="200" rx="30" fill="#12070a" stroke="url(#clockbrass)" strokeWidth="2" />
      <g className="animate-swing" style={{ transformOrigin: '80px 142px', transformBox: 'view-box' }}>
        <line x1="80" y1="142" x2="80" y2="300" stroke="url(#clockbrass)" strokeWidth="2.5" />
        <circle cx="80" cy="306" r="16" fill="url(#clockbrass)" />
        <circle cx="75" cy="301" r="5" fill="#fff3b0" opacity=".7" />
      </g>
      {/* Plinth */}
      <rect x="18" y="390" width="124" height="60" fill="url(#clockwood)" />
      <rect x="10" y="446" width="140" height="14" fill="#1c0c05" />
    </svg>
  )
}

// A museum placard: the engraved card beside each painting.
export function Placard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`parchment w-[min(260px,70vw)] p-4 text-[15px] leading-snug shadow-[0_10px_18px_-6px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(138,100,36,0.5)] ${className}`}>
      {children}
    </div>
  )
}
