// Accounts through Amazon Cognito: sign-up with an emailed code, log-in, password reset and
// account deletion. Cognito sends the emails and limits repeated attempts. The backend checks
// Cognito's ID token on every request and keeps the profile (allergies, diet, notes).
import { Amplify } from 'aws-amplify'
import {
  confirmResetPassword, confirmSignUp, deleteUser, fetchAuthSession, resendSignUpCode, resetPassword,
  signIn, signOut, signUp,
} from 'aws-amplify/auth'
import { COGNITO_CLIENT_ID, COGNITO_USER_POOL_ID, USE_COGNITO } from './config'

if (USE_COGNITO) {
  Amplify.configure({
    Auth: { Cognito: { userPoolId: COGNITO_USER_POOL_ID, userPoolClientId: COGNITO_CLIENT_ID, loginWith: { email: true } } },
  })
}

/** Cognito's default password rule: 8+ characters with upper and lower case, a number and a symbol. */
export const PASSWORD_HINT = 'At least 8 characters, with upper and lower case letters, a number and a symbol.'
export const passwordOk = (p: string) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p)

// Plain-language messages for Cognito's error names.
const MESSAGES: Record<string, string> = {
  UsernameExistsException: 'An account with this email already exists. Log in instead.',
  UserNotFoundException: 'Email or password is incorrect.',
  NotAuthorizedException: 'Email or password is incorrect.',
  CodeMismatchException: 'That code isn’t right. Check the latest email and try again.',
  ExpiredCodeException: 'That code has expired. Send a new one.',
  LimitExceededException: 'Too many attempts. Please wait a few minutes and try again.',
  TooManyRequestsException: 'Too many attempts. Please wait a few minutes and try again.',
  TooManyFailedAttemptsException: 'Too many attempts. Please wait a few minutes and try again.',
  InvalidPasswordException: PASSWORD_HINT,
  InvalidParameterException: 'Please check the details and try again.',
  NetworkError: 'We couldn’t reach Frigi. Check your connection and try again.',
}

// Emails are compared in lower case, so "Sara@Example.com" typed on a phone matches.
const norm = (email: string) => email.trim().toLowerCase()

/** Turns any Cognito error into a message that is safe to show. */
export function authMessage(e: unknown): string {
  const err = e as { name?: string; message?: string }
  if (err?.name === 'NotAuthorizedException' && /attempts exceeded/i.test(err.message ?? '')) return MESSAGES.LimitExceededException
  return (err?.name && MESSAGES[err.name]) || 'Something went wrong. Please try again.'
}

/** The current ID token, refreshed when needed; null when signed out. */
export async function idToken(): Promise<string | null> {
  try {
    return (await fetchAuthSession()).tokens?.idToken?.toString() ?? null
  } catch {
    return null
  }
}

/** Creates the account; Cognito emails a 6-digit code. */
export async function startSignUp(email: string, password: string, name: string) {
  await signUp({ username: norm(email), password, options: { userAttributes: { email: norm(email), name } } })
}

export async function confirmCode(email: string, code: string) {
  await confirmSignUp({ username: norm(email), confirmationCode: code.trim() })
}

export async function resendCode(email: string) {
  await resendSignUpCode({ username: norm(email) })
}

/** Logs in. Returns 'confirm' when the account still needs its emailed code. */
export async function logIn(email: string, password: string): Promise<'done' | 'confirm'> {
  try { await signOut() } catch { /* nothing to sign out of */ }
  const result = await signIn({ username: norm(email), password })
  if (result.isSignedIn) return 'done'
  if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
    await resendSignUpCode({ username: norm(email) }).catch(() => undefined)
    return 'confirm'
  }
  throw Object.assign(new Error('Unsupported sign-in step'), { name: 'InvalidParameterException' })
}

/** Emails a code for resetting the password. */
export async function startPasswordReset(email: string) {
  await resetPassword({ username: norm(email) })
}

export async function finishPasswordReset(email: string, code: string, newPassword: string) {
  await confirmResetPassword({ username: norm(email), confirmationCode: code.trim(), newPassword })
}

export async function logOut() {
  try { await signOut() } catch { /* already signed out */ }
}

/** Deletes the signed-in Cognito account. */
export async function deleteAccount() {
  await deleteUser()
}
