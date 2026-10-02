// A painting inside a frame whose paint comes away where the visitor holds and drags, showing the painting beneath.
//
// Two passes per frame:
//   1. field: one texel per CSS px, decide how "torn" each spot is, from the erase mask plus Voronoi shards and a
//      little fbm. It's sampled with linear filtering so the edges come out smooth.
//   2. composite: sample the field, mix surface/hidden, and add the shadow the lifted paint casts on the layer below.

export type Painting = { src: string; aspect: number; focus: [number, number]; zoom: number }

export type TearStyle = {
  name: string
  cell: number // shard size in CSS px
  shard: number // how much shards vary the threshold
  chips: number // small flakes along the edge
  rag: number // fbm raggedness
  ragScale: number
  soft: number // edge softness (smoothstep half-width in field units)
  shadow: number
  lip: number // pale torn-paint edge
  brush: number // brush radius in CSS px
}

export const STYLES: TearStyle[] = [
  // A plain eraser: round, crisp edge, no shadow.
  { name: 'Clean', cell: 60, shard: 0, chips: 0, rag: 0, ragScale: 20, soft: 0.02, shadow: 0, lip: 0, brush: 42 },
  { name: 'Soft', cell: 60, shard: 0, chips: 0, rag: 0, ragScale: 20, soft: 0.2, shadow: 0, lip: 0, brush: 46 },
  { name: 'Shards', cell: 42, shard: 0.7, chips: 0.12, rag: 0.1, ragScale: 16, soft: 0.03, shadow: 0.55, lip: 0, brush: 42 },
  { name: 'Torn', cell: 70, shard: 0.18, chips: 0, rag: 0.7, ragScale: 7, soft: 0.04, shadow: 0.7, lip: 0.85, brush: 46 },
]

// Brush radius in CSS px for a canvas this size: the styles are tuned for a painting of about 620px (geometric mean).
export const brushRadius = (style: TearStyle, width: number, height: number) =>
  style.brush * Math.min(1.2, Math.max(0.55, Math.sqrt(width * height) / 620))

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FIELD = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMask;
uniform vec2 uCss;
uniform float uCell, uShard, uChips, uRag, uRagScale, uReveal;
uniform vec2 uOrigin;
uniform float uMaxD;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float hash1(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Random value of the nearest Voronoi cell: whole shards switch on together.
float shard(vec2 x) {
  vec2 n = floor(x), f = fract(x), best = n;
  float md = 9.0;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 r = g + hash2(n + g) - f;
      float d = dot(r, r);
      if (d < md) { md = d; best = n + g; }
    }
  return hash1(best);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash1(i), hash1(i + vec2(1, 0)), f.x), mix(hash1(i + vec2(0, 1)), hash1(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return noise(p) * 0.55 + noise(p * 2.1 + 7.3) * 0.3 + noise(p * 4.3 + 1.7) * 0.15; }

void main() {
  vec2 st = vec2(vUv.x, 1.0 - vUv.y);
  vec2 q = st * uCss;
  float t = texture2D(uMask, st).r;
  // Scroll tear: grows outward from uOrigin until the whole surface is gone.
  float d = length(q - uOrigin) / uMaxD;
  float g = clamp((uReveal * 1.25 - d) * 4.0, 0.0, 1.0);
  float m = max(t, g);
  // Each shard gets its own threshold, so the edge breaks along shard lines.
  float thr = 0.5 + (shard(q / uCell) - 0.5) * uShard + (shard(q / (uCell * 0.42) + 31.7) - 0.5) * uChips
            + (fbm(q / uRagScale) - 0.5) * uRag;
  thr = clamp(thr, 0.08, 0.97);
  gl_FragColor = vec4(clamp(m - thr + 0.5, 0.0, 1.0));
}
`

const COMPOSITE = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB, uField;
uniform vec4 uCropA, uCropB;
uniform vec2 uCss, uTexelA, uPar;
uniform float uSoft, uShadow, uLip, uTime, uIn;

// The field was rendered into a framebuffer (bottom-up rows), so flip back to screen orientation.
float hole(vec2 st) {
  float f = texture2D(uField, vec2(st.x, 1.0 - st.y)).r;
  return smoothstep(0.5 - uSoft, 0.5 + uSoft, f);
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 st = vec2(vUv.x, 1.0 - vUv.y);
  vec2 px = 1.0 / uCss;
  float h = hole(st);

  // Surface, embossed so the brushwork catches a light from the top left.
  vec2 ua = uCropA.xy + st * uCropA.zw;
  vec3 a = texture2D(uA, ua).rgb;
  a *= 1.0 + (luma(a) - luma(texture2D(uA, ua + uTexelA * 2.0).rgb)) * 1.8;

  // The painting beneath, nudged against the pointer for a little depth.
  vec2 ub = uCropB.xy + (st + uPar) * uCropB.zw;
  vec3 b = texture2D(uB, ub).rgb;
  float s = (1.0 - hole(st - px * vec2(3.0, 4.0))) * 0.6 + (1.0 - hole(st - px * vec2(7.0, 10.0))) * 0.4;
  b *= 1.0 - uShadow * s;

  // Pale lip of lifted paint just outside the hole.
  float lip = hole(st + px * vec2(1.5, 2.0)) * (1.0 - h);
  a = mix(a, vec3(0.95, 0.92, 0.85), lip * uLip);

  vec3 col = mix(a, b, h);

  // The frame's sight edge throws a soft shadow, mostly from the top.
  vec2 e = vec2(min(st.x, 1.0 - st.x) * uCss.x, st.y * uCss.y);
  col *= 1.0 - 0.28 * exp(-e.y / 9.0) - 0.14 * exp(-e.x / 7.0) - 0.1 * exp(-(1.0 - st.y) * uCss.y / 6.0);
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.025;
  gl_FragColor = vec4(mix(vec3(0.92, 0.92, 0.93), col, uIn), 1.0);
}
`

type GL = WebGLRenderingContext | WebGL2RenderingContext

function compile(gl: GL, vs: string, fs: string) {
  const prog = gl.createProgram()!
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader')
    gl.attachShader(prog, sh)
  }
  gl.bindAttribLocation(prog, 0, 'aPos')
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
  const loc: Record<string, WebGLUniformLocation | null> = {}
  return { prog, u: (name: string) => (name in loc ? loc[name] : (loc[name] = gl.getUniformLocation(prog, name))) }
}

// Image-space crop for a cover fit around `focus`, as offset.xy + scale.zw.
function crop(p: Painting, canvasAspect: number): [number, number, number, number] {
  let sx = 1
  let sy = 1
  if (p.aspect > canvasAspect) sx = canvasAspect / p.aspect
  else sy = p.aspect / canvasAspect
  sx /= p.zoom
  sy /= p.zoom
  const ox = Math.min(Math.max(p.focus[0] - sx / 2, 0), 1 - sx)
  const oy = Math.min(Math.max(p.focus[1] - sy / 2, 0), 1 - sy)
  return [ox, oy, sx, sy]
}

export type Tear = {
  setStyle(i: number): void
  setProgress(rooms: number): void
  // Paints the erased areas back in.
  restore(): void
  destroy(): void
}

type Options = { onReady?: () => void; onErase?: () => void; fadeIn?: boolean }

export function createTear(canvas: HTMLCanvasElement, paintings: Painting[], { onReady, onErase, fadeIn = true }: Options = {}): Tear | null {
  const gl = (canvas.getContext('webgl2', { antialias: false }) ?? canvas.getContext('webgl', { antialias: false })) as GL | null
  if (!gl) return null
  const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const field = compile(gl, VERT, FIELD)
  const comp = compile(gl, VERT, COMPOSITE)

  const tex = (filter: number) => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    return t
  }

  // Paintings load in the background; the canvas fades in once they're all on the GPU.
  const images: { tex: WebGLTexture; w: number; h: number }[] = []
  let loaded = 0
  let alive = true
  paintings.forEach((p, i) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = p.src
    img.decode().then(() => {
      if (!alive) return
      const t = tex(gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      if (isGL2) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.generateMipmap(gl.TEXTURE_2D)
      }
      images[i] = { tex: t, w: img.naturalWidth, h: img.naturalHeight }
      if (++loaded === paintings.length) onReady?.()
    })
  })

  // What's been erased, on a small 2D canvas uploaded every frame. It's kept until the surface painting changes.
  const MS = 2
  const mask = document.createElement('canvas')
  const mctx = mask.getContext('2d')!
  const maskTex = tex(gl.LINEAR)
  const clearMask = () => {
    mctx.globalCompositeOperation = 'source-over'
    mctx.fillStyle = '#000'
    mctx.fillRect(0, 0, mask.width, mask.height)
  }

  const fieldTex = tex(gl.LINEAR)
  const fbo = gl.createFramebuffer()
  let fw = 1
  let fh = 1

  let cssW = 1
  let cssH = 1
  let style = STYLES[0]

  const sizeField = () => {
    fw = Math.max(1, Math.round(cssW))
    fh = Math.max(1, Math.round(cssH))
    gl.bindTexture(gl.TEXTURE_2D, fieldTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    cssW = Math.max(1, r.width)
    cssH = Math.max(1, r.height)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    // Setting the size clears the canvas, so only touch it when it changes (a remount keeps the last frame up).
    const w = Math.round(cssW * dpr)
    const h = Math.round(cssH * dpr)
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    // Resizing a canvas wipes it, so carry what's been erased over at the new size.
    const keep = document.createElement('canvas')
    keep.width = mask.width
    keep.height = mask.height
    keep.getContext('2d')!.drawImage(mask, 0, 0)
    mask.width = Math.ceil(cssW / MS)
    mask.height = Math.ceil(cssH / MS)
    clearMask()
    mctx.drawImage(keep, 0, 0, mask.width, mask.height)
    sizeField()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  // A dab is solid in the middle and falls off toward its rim. 'lighten' keeps the brighter of mask and dab, so
  // overlapping dabs never add up: the edge stays the clean outline of the brush instead of building up in steps.
  const stamp = (x: number, y: number, r: number) => {
    const g = mctx.createRadialGradient(x / MS, y / MS, 0, x / MS, y / MS, r / MS)
    g.addColorStop(0, '#fff')
    g.addColorStop(0.6, '#fff')
    g.addColorStop(1, '#000')
    mctx.globalCompositeOperation = 'lighten'
    mctx.fillStyle = g
    mctx.beginPath()
    mctx.arc(x / MS, y / MS, r / MS, 0, Math.PI * 2)
    mctx.fill()
  }

  // Only a held pointer erases. Dragging lays dabs along the path; holding still slowly widens the spot.
  const pts: { x: number; y: number }[] = []
  const pointer = { x: 0, y: 0, over: false }
  let held = false
  let last: { x: number; y: number } | null = null
  let erased = false
  let still = 0

  const at = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    held = true
    Object.assign(pointer, at(e), { over: true })
    pts.push(at(e))
    if (!erased) {
      erased = true
      onErase?.()
    }
  }
  const onMove = (e: PointerEvent) => {
    Object.assign(pointer, at(e), { over: true })
    if (!held) return
    const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []
    for (const ev of list.length ? list : [e]) pts.push(at(ev))
  }
  const onUp = () => {
    held = false
    last = null
  }
  const onLeave = () => {
    if (!held) pointer.over = false
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onLeave)

  let rooms = 0
  let surface = 0
  let healing = 0
  let parX = 0
  let parY = 0
  let shown = fadeIn ? 0 : 1
  let prev = performance.now()
  let raf = 0

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - prev) / 1000)
    prev = now
    if (loaded < paintings.length) return

    const radius = brushRadius(style, cssW, cssH)
    for (const p of pts) {
      if (last) {
        const dx = p.x - last.x
        const dy = p.y - last.y
        const steps = Math.ceil(Math.hypot(dx, dy) / 2)
        for (let k = 1; k <= steps; k++) stamp(last.x + (dx * k) / steps, last.y + (dy * k) / steps, radius)
      } else stamp(p.x, p.y, radius)
      last = p
      still = 0
    }
    pts.length = 0
    if (held) {
      still += dt
      stamp(pointer.x, pointer.y, radius * (1 + 0.35 * Math.min(1, still / 1.2)))
    }

    // Restore: the paint flakes back on over a moment.
    if (healing > 0) {
      healing -= dt
      mctx.globalCompositeOperation = 'source-over'
      mctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 6)})`
      mctx.fillRect(0, 0, mask.width, mask.height)
      if (healing <= 0) clearMask()
    }

    shown = Math.min(1, shown + dt * 1.6)

    // Which pair of paintings is showing, and how far the scroll tear has gone.
    const n = paintings.length
    const i = Math.min(Math.floor(rooms), n - 2)
    const local = Math.min(1, rooms - i)
    const reveal = local <= 0.08 ? 0 : local >= 0.92 ? 1 : (local - 0.08) / 0.84
    // Once a tear completes, the revealed painting becomes the surface; the last one hides the first again.
    const done = reveal >= 1
    const s = done ? i + 1 : i
    if (s !== surface) {
      surface = s
      clearMask()
    }
    const surf = paintings[s]
    const under = paintings[(s + 1) % n]
    const scrollReveal = done ? 0 : reveal

    gl.bindTexture(gl.TEXTURE_2D, maskTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask)

    const aspect = cssW / cssH
    const cA = crop(surf, aspect)
    const cB = crop(under, aspect)
    const imgA = images[s]
    const imgB = images[(s + 1) % n]

    // Scroll tear origin: the focal point of the painting beneath, mapped into the canvas.
    const ox = ((under.focus[0] - cB[0]) / cB[2]) * cssW
    const oy = ((under.focus[1] - cB[1]) / cB[3]) * cssH

    const tx = pointer.over ? (pointer.x / cssW - 0.5) * -0.012 : 0
    const ty = pointer.over ? (pointer.y / cssH - 0.5) * -0.012 : 0
    parX += (tx - parX) * Math.min(1, dt * 4)
    parY += (ty - parY) * Math.min(1, dt * 4)

    // Pass 1: field.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.viewport(0, 0, fw, fh)
    gl.useProgram(field.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, maskTex)
    gl.uniform1i(field.u('uMask'), 0)
    gl.uniform2f(field.u('uCss'), cssW, cssH)
    gl.uniform1f(field.u('uCell'), style.cell)
    gl.uniform1f(field.u('uShard'), style.shard)
    gl.uniform1f(field.u('uChips'), style.chips)
    gl.uniform1f(field.u('uRag'), style.rag)
    gl.uniform1f(field.u('uRagScale'), style.ragScale)
    gl.uniform1f(field.u('uReveal'), scrollReveal)
    gl.uniform2f(field.u('uOrigin'), ox, oy)
    gl.uniform1f(field.u('uMaxD'), Math.hypot(Math.max(ox, cssW - ox), Math.max(oy, cssH - oy)))
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    // Pass 2: composite.
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(comp.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, imgA.tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, imgB.tex)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, fieldTex)
    gl.uniform1i(comp.u('uA'), 0)
    gl.uniform1i(comp.u('uB'), 1)
    gl.uniform1i(comp.u('uField'), 2)
    gl.uniform4f(comp.u('uCropA'), ...cA)
    gl.uniform4f(comp.u('uCropB'), ...cB)
    gl.uniform2f(comp.u('uCss'), cssW, cssH)
    gl.uniform2f(comp.u('uTexelA'), 1 / imgA.w, 1 / imgA.h)
    gl.uniform2f(comp.u('uPar'), parX * (1 - scrollReveal), parY * (1 - scrollReveal))
    gl.uniform1f(comp.u('uSoft'), style.soft)
    gl.uniform1f(comp.u('uShadow'), style.shadow)
    gl.uniform1f(comp.u('uLip'), style.lip)
    gl.uniform1f(comp.u('uTime'), now / 1000)
    gl.uniform1f(comp.u('uIn'), shown)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  raf = requestAnimationFrame(frame)

  return {
    setStyle(i) {
      style = STYLES[i] ?? STYLES[0]
    },
    setProgress(r) {
      rooms = r
    },
    restore() {
      healing = 0.6
    },
    destroy() {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      // Free GPU resources but keep the context: StrictMode remounts onto the same canvas.
      for (const t of [maskTex, fieldTex, ...images.map((im) => im?.tex)]) if (t) gl.deleteTexture(t)
      gl.deleteFramebuffer(fbo)
      gl.deleteBuffer(quad)
      gl.deleteProgram(field.prog)
      gl.deleteProgram(comp.prog)
    },
  }
}
