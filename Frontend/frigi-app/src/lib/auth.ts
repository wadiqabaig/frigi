// Local mock authentication for the demo. Passwords are never stored: we keep
// a random salt and a PBKDF2-SHA-256 hash in browser storage. This is still a
// demo, not real security; the real backend owns accounts in production.
import { load, save } from './storage'
import type { Profile } from './types'

interface StoredUser { email: string; salt: string; hash: string; profile: Profile }

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('Secure hashing is not available in this browser, so the demo cannot store an account. Use Explore Demo instead.')
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120_000, hash: 'SHA-256' }, key, 256)
  return toHex(bits)
}

export async function mockSignUp(email: string, password: string, profile: Profile) {
  const users = load<Record<string, StoredUser>>('users', {})
  const key = email.trim().toLowerCase()
  if (users[key]) throw new Error('An account with this email already exists on this device. Try logging in.')
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const hash = await hashPassword(password, salt)
  users[key] = { email: key, salt, hash, profile: { ...profile, email: key } }
  save('users', users)
  return users[key].profile
}

export async function mockLogIn(email: string, password: string) {
  const users = load<Record<string, StoredUser>>('users', {})
  const u = users[email.trim().toLowerCase()]
  if (!u) throw new Error('We couldn’t find an account with that email on this device.')
  const hash = await hashPassword(password, u.salt)
  if (hash !== u.hash) throw new Error('That password doesn’t match. Check it and try again.')
  return u.profile
}

export function mockSaveUserProfile(profile: Profile) {
  if (!profile.email) return
  const users = load<Record<string, StoredUser>>('users', {})
  const u = users[profile.email]
  if (u) { u.profile = profile; save('users', users) }
}
