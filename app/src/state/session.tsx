// App-wide state: the logged-in user and the current "fridge to recipe" journey.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setToken } from '@/api/client';
import type { ChefAnswers, Ingredient, PickedPhoto, Profile, RecipeOption } from '@/api/types';

const TOKEN_KEY = 'frigi.token';

interface Journey {
  photos: PickedPhoto[];
  /** Detected items, then the list the user confirmed. */
  confirmed: Ingredient[];
  /** Staples the detector did not find, to ask about (FR5). */
  staples: Ingredient[];
  answers: ChefAnswers;
  options: RecipeOption[];
}

const emptyJourney: Journey = { photos: [], confirmed: [], staples: [], answers: {}, options: [] };

interface Session {
  ready: boolean;
  profile: Profile | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  journey: Journey;
  updateJourney: (changes: Partial<Journey>) => void;
  resetJourney: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [journey, setJourney] = useState<Journey>(emptyJourney);

  const signIn = useCallback(async (token: string) => {
    setToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setProfile(await api.getProfile());
  }, []);

  const signOut = useCallback(async () => {
    setToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    setProfile(null);
    setJourney(emptyJourney);
  }, []);

  // Stay logged in between app launches.
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(TOKEN_KEY);
      if (saved) {
        try {
          await signIn(saved);
        } catch {
          await signOut();
        }
      }
      setReady(true);
    })();
  }, [signIn, signOut]);

  const value = useMemo<Session>(() => ({
    ready, profile, signIn, signOut, setProfile, journey,
    updateJourney: (changes) => setJourney((current) => ({ ...current, ...changes })),
    resetJourney: () => setJourney(emptyJourney),
  }), [ready, profile, signIn, signOut, journey]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
