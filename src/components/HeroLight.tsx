import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'
import DITHER from './light/dither'

export type Rgb = readonly [number, number, number]

// What the page steers:
// light: how much light is on (0..1)
// cursor: how strongly the cursor plays with the light (0..1)
// load: loader progress (0..1); boot: how much the loader's bloom still shows (0..1)
// accent: the light's colour (0..255 per channel)
export type LightControl = { light: number; cursor: number; load: number; boot: number; accent: Rgb }

// From empty to dense, in ten steps (for the cursor's lens).
const GLYPHS = ' .:-=+*#%@'

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uLight;
uniform vec2 uMouse;
uniform float uCursor;
uniform vec3 uAccent;
uniform float uDpr;
uniform float uLoad;
uniform float uBoot;
uniform sampler2D uGlyphs;
uniform vec2 uCell;

const vec3 BG = vec3(0.039);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

vec2 mouseGL() { return vec2(uMouse.x, uRes.y - uMouse.y); }

// The light leans to the right, so the left of the screen and the tagline (top left) stay dark and readable.
// wobble (about -0.5..0.5) lets the edge follow the light's own shapes instead of a straight fade.
float rightSide(vec2 frag, float wobble) {
  float side = smoothstep(0.1, 0.62, frag.x / uRes.x + wobble * 0.35);
  // The tagline's box, in CSS pixels from the top left, always stays clear.
  vec2 px = vec2(frag.x, uRes.y - frag.y) / uDpr;
  float corner = smoothstep(0.0, 180.0, length(max(px - vec2(340.0, 110.0), 0.0)));
  return side * corner;
}
${DITHER}
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec3 col = lens(frag, dither(frag));
  gl_FragColor = vec4(col + (hash(frag + fract(uTime) * 91.7) - 0.5) * 0.04, 1.0);
}
`

// Draws the characters once into a strip the shader reads from.
function glyphAtlas() {
  const size = 64
  const c = document.createElement('canvas')
  c.width = size * GLYPHS.length
  c.height = size
  const x = c.getContext('2d')!
  x.font = `600 ${size * 0.86}px "Geist Mono Variable", ui-monospace, monospace`
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillStyle = '#fff'
  ;[...GLYPHS].forEach((g, i) => x.fillText(g, (i + 0.5) * size, size * 0.54))
  return c
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader did not compile')
  return s
}

type Props = { control: LightControl; className?: string }

// The hero's background: light pouring down on the right, printed as a 1-bit dither (see ./light/dither), drawn
// by a fragment shader. Without WebGL the canvas simply stays dark.
export default function HeroLight({ control, className = '' }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvas.current
    const gl = cv?.getContext('webgl', { antialias: false, premultipliedAlpha: false })
    if (!cv || !gl) return
    const prog = gl.createProgram()!
    try {
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
    } catch (e) {
      console.warn(e)
      return
    }
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (n: string) => gl.getUniformLocation(prog, n)
    const uRes = u('uRes'), uTime = u('uTime'), uLight = u('uLight'), uMouse = u('uMouse'), uCursor = u('uCursor')
    const uLoad = u('uLoad'), uBoot = u('uBoot'), uDpr = u('uDpr'), uCell = u('uCell'), uAccent = u('uAccent')
    gl.uniform1i(u('uGlyphs'), 0)

    const tex = gl.createTexture()
    let alive = true
    const upload = () => {
      if (!alive) return
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphAtlas())
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    }
    upload()
    // Redraw the characters once the mono font has arrived.
    document.fonts?.load('600 55px "Geist Mono Variable"').then(upload, () => {})

    // Crisp pixels for the dither, up to 1.5x the screen density to stay smooth.
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      cv.width = Math.max(1, Math.round(cv.clientWidth * dpr))
      cv.height = Math.max(1, Math.round(cv.clientHeight * dpr))
      gl.viewport(0, 0, cv.width, cv.height)
      gl.uniform2f(uRes, cv.width, cv.height)
      gl.uniform1f(uDpr, dpr)
      gl.uniform2f(uCell, 11 * dpr, 17 * dpr)
    }
    resize()

    // The pointer, eased; its influence fades out when it leaves, and on touch screens.
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: 0, target: 0 }
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      mouse.tx = e.clientX - r.left
      mouse.ty = e.clientY - r.top
      if (mouse.x < -5000) {
        mouse.x = mouse.tx
        mouse.y = mouse.ty
      }
      mouse.target = fine ? 1 : 0
    }
    const leave = () => (mouse.target = 0)
    window.addEventListener('pointermove', move)
    document.addEventListener('pointerleave', leave)

    const reduce = prefersReducedMotion()
    let raf = 0
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(cv)
    const t0 = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      mouse.x += (mouse.tx - mouse.x) * 0.14
      mouse.y += (mouse.ty - mouse.y) * 0.14
      mouse.on += (mouse.target - mouse.on) * 0.06
      const [r, g, b] = control.accent
      gl.uniform1f(uTime, reduce ? 12 : (now - t0) / 1000)
      gl.uniform1f(uLight, control.light)
      gl.uniform1f(uLoad, control.load)
      gl.uniform1f(uBoot, control.boot)
      gl.uniform2f(uMouse, mouse.x * dpr, mouse.y * dpr)
      gl.uniform1f(uCursor, control.cursor * mouse.on)
      gl.uniform3f(uAccent, r / 255, g / 255, b / 255)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(frame)
    // Watch the canvas itself, not the window: after a rotation the pinned hero gets its new size a moment after
    // the window's resize event, and sizing early left the light stretched.
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      gl.deleteProgram(prog)
      gl.deleteTexture(tex)
    }
  }, [control])

  return <canvas ref={canvas} aria-hidden className={className} />
}
