/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Frigi backend base URL, e.g. http://localhost:8000. */
  readonly VITE_API_BASE_URL?: string
  /** Cognito user pool ID, e.g. us-east-1_AbC123. */
  readonly VITE_COGNITO_USER_POOL_ID?: string
  /** Cognito app client ID (no secret). */
  readonly VITE_COGNITO_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
