import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Sculpture } from './Sculpture'
import { fragmentSource, VERTEX_SOURCE, type SculptureShape } from './shaders'

const SHAPES: SculptureShape[] = ['dashboard', 'logic', 'sets', 'combinatorics', 'graphs', 'algebra', 'frequency', 'journey', 'theory', 'orb']

describe('shader source', () => {
  it.each(SHAPES)('%s: one scene function, one entry point, balanced braces', (shape) => {
    const source = fragmentSource(shape)

    expect(source.match(/vec2 map\(vec3 p\)/g)).toHaveLength(1)
    expect(source.match(/void main\(\)/g)).toHaveLength(1)
    expect(source).toMatch(/#define SHAPE \d+/)
    expect(source).toMatch(/#define ZOOM \d+\.\d+/)
    expect(source).not.toContain('undefined')
    expect(source.split('{').length).toBe(source.split('}').length)
    expect(source.split('(').length).toBe(source.split(')').length)
  })

  it('gives every shape a different scene', () => {
    const sources = new Set(SHAPES.map(fragmentSource))
    expect(sources.size).toBe(SHAPES.length)
  })

  it('uses only constructs WebGL 1 accepts: bounded loops, no arrays, no integer modulo', () => {
    for (const shape of SHAPES) {
      const source = fragmentSource(shape)
      for (const loop of source.match(/for \([^)]*\)/g) ?? []) {
        expect(loop, shape).toMatch(/[<>]=? *\d+|[<>]=? *-?\d+/)
      }
      expect(source).not.toMatch(/\[\d+\]\s*=/)
      expect(source).not.toMatch(/\bint\b\s+\w+\s*%/)
    }
  })

  it('has a trivial vertex shader that covers the screen', () => {
    expect(VERTEX_SOURCE).toContain('attribute vec2 aPosition')
    expect(VERTEX_SOURCE).toContain('gl_Position')
  })

  it('draws the frequency bars from the real English letter frequencies, E T A O I N S H R D L U', () => {
    const source = fragmentSource('frequency')

    for (const value of ['12.7', '9.1', '8.2', '7.5', '7.0', '6.7', '6.3', '6.1', '6.0', '4.3', '4.0', '2.8']) {
      expect(source).toContain(`return ${value};`)
    }
  })

  it('places 26 beads on the algebra ring', () => {
    expect(fragmentSource('algebra')).toContain('6.28318 / 26.0')
  })
})

describe('Sculpture component', () => {
  it.each(SHAPES)('%s falls back to a labelled SVG without WebGL', (shape) => {
    render(<Sculpture shape={shape} />)

    const image = screen.getByRole('img')
    expect(image.tagName.toLowerCase()).toBe('svg')
    expect(image.getAttribute('aria-label')?.length).toBeGreaterThan(10)
  })

  it('renders a canvas when a WebGL context can be created', () => {
    const calls: string[] = []
    const gl = new Proxy(
      {},
      {
        get: (_target, name: string) => {
          calls.push(name)
          if (name === 'getShaderParameter' || name === 'getProgramParameter') return () => true
          if (name === 'createShader' || name === 'createProgram' || name === 'createBuffer') return () => ({})
          if (name === 'getExtension') return () => null
          if (name === 'getAttribLocation' || name === 'getUniformLocation') return () => 1
          if (typeof name === 'string' && /^[A-Z_0-9]+$/.test(name)) return 1
          return () => undefined
        },
      },
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => gl as unknown as WebGLRenderingContext)
    vi.stubGlobal('matchMedia', () => ({ matches: true }))

    render(<Sculpture shape="dashboard" />)

    const image = screen.getByRole('img')
    expect(image.tagName.toLowerCase()).toBe('canvas')
    expect(image.getAttribute('aria-label')).toContain('Decorative 3D sculpture')
    expect(calls).toContain('compileShader')
    expect(calls).toContain('drawArrays') // reduced motion: one still frame is drawn
  })
})
