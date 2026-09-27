import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'

const W = 900
const H = 320

type Point = [number, number]

// Smooth a stroke with quadratic curves through the midpoints of its samples.
function toPath(points: Point[]) {
  if (points.length < 2) return ''
  const r = (n: number) => Math.round(n * 10) / 10
  let d = `M${r(points[0][0])} ${r(points[0][1])}`
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]
    const [nx, ny] = points[i + 1]
    d += ` Q${r(x)} ${r(y)} ${r((x + nx) / 2)} ${r((y + ny) / 2)}`
  }
  const [lx, ly] = points[points.length - 1]
  return d + ` L${r(lx)} ${r(ly)}`
}

// Dev-only tool: sign once with a trackpad, mouse or pen, then copy the result into src/data/signature.ts.
export default function Sign() {
  const [strokes, setStrokes] = useState<Point[][]>([])
  const drawing = useRef<Point[] | null>(null)
  const svg = useRef<SVGSVGElement>(null)

  const point = (e: PointerEvent): Point => {
    const box = svg.current!.getBoundingClientRect()
    return [((e.clientX - box.left) / box.width) * W, ((e.clientY - box.top) / box.height) * H]
  }
  const down = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = [point(e)]
    setStrokes((s) => [...s, drawing.current!])
  }
  const move = (e: PointerEvent) => {
    if (!drawing.current) return
    drawing.current.push(point(e))
    setStrokes((s) => [...s.slice(0, -1), [...drawing.current!]])
  }
  const up = () => {
    drawing.current = null
  }

  const paths = strokes.map(toPath).filter(Boolean)
  // Crop the viewBox to the ink (plus a little padding) so the signature fills its container.
  const all = strokes.flat()
  const pad = 12
  const box = all.length
    ? [
        Math.min(...all.map((p) => p[0])) - pad,
        Math.min(...all.map((p) => p[1])) - pad,
        Math.max(...all.map((p) => p[0])) + pad,
        Math.max(...all.map((p) => p[1])) + pad,
      ].map(Math.round)
    : [0, 0, W, H]
  const viewBox = `${box[0]} ${box[1]} ${box[2] - box[0]} ${box[3] - box[1]}`
  const code = `export const SIGNATURE: Signature | null = ${JSON.stringify({ viewBox, strokes: paths }, null, 2)}`
  ;(window as unknown as { __signature?: string }).__signature = code

  return (
    <main className="container-xl pt-28 pb-16">
      <h1 className="type-display text-6xl">Sign here</h1>
      <p className="mt-4 text-muted max-w-xl">
        Sign the way you normally would. Strokes are recorded in order, so the site can replay them. Dev only; this page is
        not in the production build.
      </p>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        className="mt-8 w-full max-w-[900px] aspect-[900/320] bg-white rounded-lg border border-line touch-none cursor-crosshair"
      >
        <line x1="40" x2={W - 40} y1={H * 0.72} y2={H * 0.72} stroke="#C5CCD2" strokeDasharray="6 6" />
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#0E1114" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <div className="mt-6 flex gap-4">
        <button onClick={() => setStrokes((s) => s.slice(0, -1))} className="type-label border border-cream px-4 py-3">
          Undo stroke
        </button>
        <button onClick={() => setStrokes([])} className="type-label border border-cream px-4 py-3">
          Clear
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="type-label bg-cream text-night px-4 py-3 disabled:opacity-40"
          disabled={!paths.length}
        >
          Copy code
        </button>
      </div>
      <p className="mt-4 type-label text-muted">{paths.length} strokes</p>
    </main>
  )
}
