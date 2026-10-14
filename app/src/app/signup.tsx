import { router } from 'expo-router';
import { useState } from 'react';

import { api, ApiError } from '@/api/client';
import { ProfileFields, type ProfileValues } from '@/components/ProfileFields';
import { Button, ErrorText, Field, Screen } from '@/components/ui';
import { useSession } from '@/state/session';

export default function Signup() {
  const { signIn } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [prefs, setPrefs] = useState<ProfileValues>({ allergies: [], diet: 'none', household_size: 1 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const result = await api.signup({ name: name.trim(), email: email.trim(), password, age: age ? Number(age) : undefined, ...prefs });
      await signIn(result.token);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Field label="Name" value={name} onChangeText={setName} autoComplete="name" />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password (at least 8 characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Field label="Age (optional)" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <ProfileFields value={prefs} onChange={setPrefs} />
      <ErrorText message={error} />
      <Button label="Create account" onPress={submit} loading={loading} disabled={!name || !email || password.length < 8} />
    </Screen>
  );
}
