// Backend address comes from the environment (see .env.example), never from code.
const raw = import.meta.env.VITE_API_BASE_URL?.trim()

export const API_BASE_URL = (raw || 'http://localhost:8000').replace(/\/+$/, '')
