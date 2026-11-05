// Backend address comes from the environment (see .env.example), never from code.
const raw = import.meta.env.VITE_API_BASE_URL?.trim()

export const API_BASE_URL = (raw || 'http://localhost:8000').replace(/\/+$/, '')

// Amazon Cognito user pool for sign-up codes, log-in and password resets. Both values are
// public identifiers, not secrets. Without them the app falls back to the backend's own log-in.
export const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID?.trim() || ''
export const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID?.trim() || ''
export const USE_COGNITO = !!(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID)
