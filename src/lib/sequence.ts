// Plays a folder of numbered frames on a canvas, one frame per scroll position.
// The folder holds 0001.webp, 0002.webp … and a manifest.json (written by scripts/sequence.py).
export type Manifest = { count: number; pad: number; ext: string; width: number; height: number }

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
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight)
    const w = img.naturalWidth * s
    const h = img.naturalHeight * s
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, cw, ch)
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h)
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const r = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(r.width * dpr))
    canvas.height = Math.max(1, Math.round(r.height * dpr))
    draw(true)
  }

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

  window.addEventListener('resize', resize)
  return {
    set(p: number) {
      progress = Math.min(1, Math.max(0, p))
      draw()
    },
    destroy() {
      alive = false
      window.removeEventListener('resize', resize)
    },
  }
}
