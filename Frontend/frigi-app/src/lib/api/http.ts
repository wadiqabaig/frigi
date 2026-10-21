import { API_BASE_URL } from '../config'
import type { ErrorBody } from './dto'

export type ApiErrorKind =
  | 'network' | 'timeout' | 'aborted' | 'unauthorized' | 'validation' | 'not-found'
  | 'conflict' | 'unsafe' | 'unavailable' | 'server'

/** Every failed request becomes one of these. `message` is safe to show (contract, "Errors"). */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  readonly code: string
  constructor(kind: ApiErrorKind, status: number, code: string, message: string) {
    super(message)
    this.kind = kind
    this.status = status
    this.code = code
  }
}

// True when a request failed only because the caller cancelled it.
export const isAborted = (e: unknown) => e instanceof ApiError && e.kind === 'aborted'

// Returns any thrown value as an ApiError, using `fallback` as the message for unexpected errors.
export const toApiError = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e : new ApiError('server', 0, 'UNKNOWN', fallback)

// Returns a message that is safe to show the user for any thrown value.
export const errorMessage = (e: unknown, fallback: string) => toApiError(e, fallback).message

let token: string | null = null
let onUnauthorized: (() => void) | null = null

// Sets the bearer token sent with authenticated requests (null after log-out).
export const setAuthToken = (value: string | null) => { token = value }

// Registers what to do when an authenticated request returns 401 (missing or expired token).
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn }

// Maps an HTTP status and backend error code to the kind of failure the UI reacts to.
function kindFor(status: number, code: string): ApiErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 404) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 422 && code === 'UNSAFE_RECIPE') return 'unsafe'
  if (status === 400 || status === 422) return 'validation'
  if (status === 502 || status === 503) return 'unavailable'
  return 'server'
}

const FALLBACK_MESSAGE: Partial<Record<ApiErrorKind, string>> = {
  network: 'We couldn’t reach Frigi’s kitchen. Check your connection and try again.',
  timeout: 'Frigi took too long to answer. Please try again.',
  unauthorized: 'Your session has expired. Please log in again.',
  unavailable: 'Frigi’s kitchen is busy right now. Please try again in a moment.',
  server: 'Something went wrong on Frigi’s side. Please try again.',
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  /** JSON body, or FormData for uploads. */
  body?: unknown
  /** Send the bearer token and treat 401 as an expired session. */
  auth?: boolean
  signal?: AbortSignal
  timeoutMs?: number
}

// Sends one request to the backend and returns its JSON, or throws an ApiError.
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, signal, timeoutMs = 30_000 } = opts
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  const forward = () => controller.abort()
  if (signal?.aborted) controller.abort()
  else signal?.addEventListener('abort', forward, { once: true })

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (auth && token) headers.Authorization = `Bearer ${token}`
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    if (signal?.aborted) throw new ApiError('aborted', 0, 'ABORTED', 'Request cancelled.')
    if (timedOut) throw new ApiError('timeout', 0, 'TIMEOUT', FALLBACK_MESSAGE.timeout!)
    throw new ApiError('network', 0, 'NETWORK', FALLBACK_MESSAGE.network!)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forward)
  }

  const data = (await res.json().catch(() => null)) as (T & Partial<ErrorBody>) | null
  if (res.ok) return data as T

  const code = data?.error?.code ?? `HTTP_${res.status}`
  const kind = kindFor(res.status, code)
  const message = data?.error?.message ?? FALLBACK_MESSAGE[kind] ?? FALLBACK_MESSAGE.server!
  if (kind === 'unauthorized' && auth) onUnauthorized?.()
  throw new ApiError(kind, res.status, code, message)
}
