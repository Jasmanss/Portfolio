// Plays a folder of numbered frames on a canvas, one frame per scroll position.
// The folder holds 0001.webp, 0002.webp … and a manifest.json (written by scripts/sequence.sh).
export type Manifest = { count: number; pad: number; ext: string; width: number; height: number }

// How a landscape clip fills the canvas. Landscape screens crop it to fill. On portrait and squarish screens that
// crop would leave a tall sliver from the middle (shards, no hands), so there the frame is fitted to the width,
// zoomed by ZOOM (which only trims the clip's empty sides, never the hands), and centred on the action, where the
// fingertips meet. The rest is the clip's own pure black, so the letterbox reads as part of the shot.
const ZOOM = 1.3
const CLIP_BLACK = '#000'

// onProgress reports how much of a first, coarse pass (every eighth frame) has arrived: enough to scrub.
export function frameSequence(canvas: HTMLCanvasElement, base: string, onProgress?: (share: number) => void) {
  const ctx = canvas.getContext('2d')!
  let manifest: Manifest | null = null
  let frames: (HTMLImageElement | null)[] = []
  let progress = 0
  let drawn: HTMLImageElement | null = null
  let alive = true
  let coarse = 0

  // The closest frame that has finished loading, so scrubbing never shows a blank.
  const nearest = (i: number) => {
    for (let d = 0; d < frames.length; d++) {
      const a = frames[i - d]
      if (a) return a
      const b = frames[i + d]
      if (b) return b
    }
    return null
  }

  const draw = (force = false) => {
    if (!manifest) return
    const img = nearest(Math.round(progress * (manifest.count - 1)))
    if (!img || (img === drawn && !force)) return
    drawn = img
    const { width: cw, height: ch } = canvas
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const s = Math.min(Math.max(cw / iw, ch / ih), (cw / iw) * ZOOM)
    const w = iw * s
    const h = ih * s
    const x = (cw - w) / 2
    const y = (ch - h) / 2
    ctx.fillStyle = CLIP_BLACK
    ctx.fillRect(0, 0, cw, ch)
    ctx.drawImage(img, x, y, w, h)
    if (y > 0.5) {
      // Letterboxed: the frame's top and bottom edges dissolve into the black, so a shard flying out of the shot
      // never stops on a hard line.
      const f = h * 0.1
      for (const [from, to] of [
        [y, y + f],
        [y + h, y + h - f],
      ]) {
        const g = ctx.createLinearGradient(0, from, 0, to)
        g.addColorStop(0, 'rgba(0,0,0,1)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, Math.min(from, to), cw, f)
      }
    }
  }

  // Sized from the canvas's own layout box: not the window (the pinned hero only takes its new size after the
  // scroll refresh that follows a resize or rotation) and not the bounding box (which includes the zoom transform).
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (w === canvas.width && h === canvas.height) return
    canvas.width = w
    canvas.height = h
    draw(true)
  }
  const observer = new ResizeObserver(resize)

  const load = (i: number) =>
    new Promise<void>((resolve) => {
      if (!manifest || frames[i]) return resolve()
      const img = new Image()
      img.decoding = 'async'
      img.src = `${base}/${String(i + 1).padStart(manifest.pad, '0')}.${manifest.ext}`
      const done = () => {
        if (i % 8 === 0 && manifest) onProgress?.(Math.min(1, ++coarse / Math.ceil(manifest.count / 8)))
        resolve()
      }
      img.onload = () => {
        if (!alive) return resolve()
        frames[i] = img
        draw()
        done()
      }
      img.onerror = done
    })

  fetch(`${base}/manifest.json`)
    .then((r) => r.json() as Promise<Manifest>)
    .then(async (m) => {
      if (!alive) return
      manifest = m
      frames = new Array(m.count).fill(null)
      resize()
      // Every eighth frame first so a fast scrub already has something to show, then fill in the rest.
      const order = [...Array(m.count).keys()].sort((a, b) => (a % 8 === 0 ? 0 : 1) - (b % 8 === 0 ? 0 : 1) || a - b)
      for (let k = 0; k < order.length; k += 6) await Promise.all(order.slice(k, k + 6).map(load))
    })
    .catch(() => onProgress?.(1))

  observer.observe(canvas)
  return {
    set(p: number) {
      progress = Math.min(1, Math.max(0, p))
      draw()
    },
    destroy() {
      alive = false
      observer.disconnect()
    },
  }
}
