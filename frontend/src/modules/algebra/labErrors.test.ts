import { describe, expect, it } from 'vitest'
import { ApiError } from '../../services/api'
import { describeLabError } from './labErrors'

describe('describeLabError', () => {
  it('describes an unreachable backend and says how to start it', () => {
    const error = describeLabError(new ApiError('Could not reach the backend at http://localhost:8000', null, { kind: 'offline' }))

    expect(error.kind).toBe('offline')
    expect(error.title).toContain('not reachable')
    expect(error.message).toContain('uvicorn app.main:app')
  })

  it('describes a timeout', () => {
    const error = describeLabError(new ApiError('No response within 5000 ms', null, { kind: 'timeout' }))

    expect(error.kind).toBe('timeout')
    expect(error.message).toContain('Try again')
  })

  it('attaches 422 problems to the fields they name', () => {
    const error = describeLabError(
      new ApiError('first', 422, {
        kind: 'http',
        details: [
          { loc: ['body', 'a'], msg: 'Invalid affine key: a = 4 is not coprime to 26', type: 'invalid_key' },
          { loc: ['body', 'b'], msg: 'Input should be a valid integer', type: 'int_type' },
          { loc: ['body', 'a'], msg: 'second message for a', type: 'x' },
          { loc: ['query', 'a'], msg: 'not a body field', type: 'x' },
          { loc: ['body', 'unknown'], msg: 'not a form field', type: 'x' },
        ],
      }),
    )

    expect(error.kind).toBe('invalid-input')
    expect(error.fieldErrors).toEqual({
      a: 'Invalid affine key: a = 4 is not coprime to 26',
      b: 'Input should be a valid integer',
    })
  })

  it('describes an oversized request', () => {
    const error = describeLabError(new ApiError('Request body too large', 413, { kind: 'http' }))

    expect(error.kind).toBe('too-large')
  })

  it('describes server errors and unexpected replies separately', () => {
    expect(describeLabError(new ApiError('boom', 500, { kind: 'http' })).kind).toBe('server')
    expect(describeLabError(new ApiError('bad shape')).kind).toBe('unexpected')
  })

  it('describes anything else that was thrown', () => {
    expect(describeLabError(new Error('weird'))).toMatchObject({ kind: 'unexpected', message: 'weird' })
    expect(describeLabError('text')).toMatchObject({ kind: 'unexpected', message: 'An unexpected error occurred.' })
  })
})
