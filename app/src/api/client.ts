// Every call to the backend goes through this file (docs/api-contract.md, section 7).
// Set EXPO_PUBLIC_USE_MOCK=true in app/.env to use fake data instead of the server.

import { Platform } from 'react-native';

import { mock } from './mock';
import type {
  AuthResult, ChefAnswers, ChefQuestion, DetectResult, Ingredient, OptionsResult, PickedPhoto,
  Profile, Recipe, SignupInput, SwapResult,
} from './types';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://44.218.50.2:8000';
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

/** Error from the backend's { error: { code, message } } format. `message` is safe to show. */
export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

let token: string | null = null;
export const setToken = (value: string | null) => { token = value; };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('NETWORK', 'Cannot reach Frigi. Check your internet connection.', 0);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.error?.code ?? 'HTTP_ERROR', body?.error?.message ?? 'Something went wrong.', response.status);
  }
  return body as T;
}

const post = <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) });

async function photosForm(photos: PickedPhoto[]): Promise<FormData> {
  const form = new FormData();
  for (const photo of photos) {
    if (Platform.OS === 'web') {
      // In a browser the picker gives a blob: URL, so send the file contents.
      const blob = await (await fetch(photo.uri)).blob();
      form.append('photos', blob, photo.fileName);
    } else {
      // React Native uploads straight from the file URI.
      form.append('photos', { uri: photo.uri, name: photo.fileName, type: photo.mimeType } as unknown as Blob);
    }
  }
  return form;
}

export const api = {
  signup: (input: SignupInput): Promise<AuthResult> =>
    USE_MOCK ? mock.auth(input.name, input.email) : post('/auth/signup', input),

  login: (email: string, password: string): Promise<AuthResult> =>
    USE_MOCK ? mock.auth(undefined, email) : post('/auth/login', { email, password }),

  getProfile: (): Promise<Profile> => (USE_MOCK ? mock.getProfile() : request('/profile')),

  updateProfile: (changes: Partial<Profile>): Promise<Profile> =>
    USE_MOCK ? mock.updateProfile(changes) : request('/profile', { method: 'PUT', body: JSON.stringify(changes) }),

  ingredients: (): Promise<{ detectable: Ingredient[]; staples: Ingredient[] }> =>
    USE_MOCK ? mock.ingredients() : request('/ingredients'),

  detect: async (photos: PickedPhoto[]): Promise<DetectResult> =>
    USE_MOCK ? mock.detect(photos.length) : request('/detect', { method: 'POST', body: await photosForm(photos) }),

  questions: (): Promise<{ questions: ChefQuestion[] }> => (USE_MOCK ? mock.questions() : request('/chef/questions')),

  options: (ingredients: Ingredient[], answers: ChefAnswers): Promise<OptionsResult> =>
    USE_MOCK ? mock.options() : post('/chef/options', { ingredients, answers }),

  recipe: (optionId: string, servings: number): Promise<Recipe> =>
    USE_MOCK ? mock.recipe(servings) : post('/chef/recipe', { option_id: optionId, servings }),

  swap: (recipeId: string, missing: string): Promise<SwapResult> =>
    USE_MOCK ? mock.swap(missing) : post('/chef/swap', { recipe_id: recipeId, missing }),
};
