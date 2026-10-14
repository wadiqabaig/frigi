import { router } from 'expo-router';
import { useState } from 'react';

import { api, ApiError } from '@/api/client';
import { ProfileFields, type ProfileValues } from '@/components/ProfileFields';
import { Body, Button, ErrorText, Screen, Title } from '@/components/ui';
import { useSession } from '@/state/session';

export default function ProfileScreen() {
  const { profile, setProfile, signOut } = useSession();
  const [prefs, setPrefs] = useState<ProfileValues>({
    allergies: profile?.allergies ?? [], diet: profile?.diet ?? 'none', household_size: profile?.household_size ?? 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      setProfile(await api.updateProfile(prefs));
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Title>{profile?.name}</Title>
      <Body muted>{profile?.email}</Body>
      <ProfileFields value={prefs} onChange={(v) => { setPrefs(v); setSaved(false); }} />
      <ErrorText message={error} />
      <Button label={saved ? 'Saved' : 'Save changes'} onPress={save} loading={saving} disabled={saved} />
      <Button label="Log out" variant="secondary" onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
