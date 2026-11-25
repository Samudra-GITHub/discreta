const DEFAULT_API_BASE_URL = 'http://localhost:8000'

/** Backend base URL from `VITE_API_BASE_URL`, without a trailing slash. */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/+$/, '')
