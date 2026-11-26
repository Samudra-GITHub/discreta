import { ApiError } from '../../services/api'

/** Fields of the cipher form that a backend problem can be attached to. */
export type LabField = 'text' | 'key' | 'a' | 'b'

export type LabErrorKind = 'offline' | 'timeout' | 'invalid-input' | 'too-large' | 'server' | 'unexpected'

export interface LabError {
  kind: LabErrorKind
  title: string
  message: string
  /** Problems the backend tied to a specific field, shown next to that field. */
  fieldErrors: Partial<Record<LabField, string>>
}

const FIELDS: readonly string[] = ['text', 'key', 'a', 'b']

/** Turn anything thrown while calling the backend into something the page can show. */
export function describeLabError(error: unknown): LabError {
  if (!(error instanceof ApiError)) {
    return {
      kind: 'unexpected',
      title: 'Something went wrong',
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      fieldErrors: {},
    }
  }

  if (error.kind === 'offline') {
    return {
      kind: 'offline',
      title: 'The backend is not reachable',
      message: `${error.message}. Start it from the backend folder with: uvicorn app.main:app --port 8000`,
      fieldErrors: {},
    }
  }
  if (error.kind === 'timeout') {
    return {
      kind: 'timeout',
      title: 'The backend took too long to answer',
      message: `${error.message}. Try again in a moment.`,
      fieldErrors: {},
    }
  }
  if (error.kind === 'invalid-response') {
    return { kind: 'unexpected', title: 'Unexpected reply from the backend', message: error.message, fieldErrors: {} }
  }

  if (error.status === 413) {
    return {
      kind: 'too-large',
      title: 'The message is too large',
      message: error.message,
      fieldErrors: {},
    }
  }
  if (error.status === 422 || error.status === 400) {
    const fieldErrors: LabError['fieldErrors'] = {}
    for (const detail of error.details) {
      const field = detail.loc[1]
      if (detail.loc[0] === 'body' && typeof field === 'string' && FIELDS.includes(field)) {
        fieldErrors[field as LabField] ??= detail.msg
      }
    }
    return { kind: 'invalid-input', title: 'The server rejected the input', message: error.message, fieldErrors }
  }
  return { kind: 'server', title: 'The backend reported an error', message: error.message, fieldErrors: {} }
}
