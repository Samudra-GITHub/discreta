import { useEffect, useRef, useState, type ReactNode } from 'react'
import { fragmentSource, VERTEX_SOURCE, type SculptureShape } from './shaders'

interface SculptureCanvasProps {
  shape: SculptureShape
  /** Description for assistive technology; the sculpture itself is decorative. */
  label: string
  /** Shown instead when WebGL is unavailable or the shader cannot be built. */
  fallback: ReactNode
  className?: string
}

/** Longest edge, in device pixels, that the canvas is rendered at. Keeps the GPU load small. */
const MAX_PIXELS = 720
const FRAME_MS = 1000 / 30

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (import.meta.env.DEV) console.warn('Sculpture shader failed to compile:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function buildProgram(gl: WebGLRenderingContext, fragment: string): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE)
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment)
  if (!vs || !fs) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null
}

/**
 * Renders one sculpture on a <canvas>. Cost control: a single full-screen triangle pair, a
 * resolution cap, 30 frames per second, and no drawing at all while the canvas is off screen
 * or the tab is hidden. With reduced motion requested, one still frame is drawn. If WebGL is
 * missing the `fallback` (a static SVG illustration) is shown instead.
 */
export function SculptureCanvas({ shape, label, fallback, className = '' }: SculptureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' })
    const program = gl ? buildProgram(gl, fragmentSource(shape)) : null
    if (!gl || !program) {
      setFailed(true)
      return
    }

    gl.useProgram(program)
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const uRes = gl.getUniformLocation(program, 'uRes')
    const uTime = gl.getUniformLocation(program, 'uTime')
    gl.clearColor(0, 0, 0, 0)

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const stillTime = 2.4
    let frame = 0
    let last = 0
    let visible = true
    let started = performance.now()

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const scale = Math.min(dpr, MAX_PIXELS / Math.max(rect.width, 1))
      const width = Math.max(1, Math.round(rect.width * scale))
      const height = Math.max(1, Math.round(rect.height * scale))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }

    const draw = (seconds: number) => {
      resize()
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, seconds)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (now - last < FRAME_MS) return
      last = now
      draw(((now - started) / 1000) * 0.9 + 1)
    }

    const start = () => {
      if (reduced || frame || !visible || document.hidden) return
      started = performance.now() - 1000
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    draw(reduced ? stillTime : 1)
    start()

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible) start()
      else stop()
    })
    observer.observe(canvas)
    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)
    const resizeObserver = new ResizeObserver(() => draw(reduced ? stillTime : (performance.now() - started) / 1000))
    resizeObserver.observe(canvas)

    return () => {
      stop()
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      // Free GPU objects. The context itself is not forced to be lost: React may mount this
      // effect twice on the same canvas, and a lost context cannot be reused.
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [shape])

  if (failed) return <>{fallback}</>
  return <canvas ref={canvasRef} role="img" aria-label={label} className={`block aspect-[480/360] w-full ${className}`} />
}
