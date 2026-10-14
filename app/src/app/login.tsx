import { router } from 'expo-router';
import { useState } from 'react';

import { api, ApiError } from '@/api/client';
import { Button, ErrorText, Field, Screen } from '@/components/ui';
import { useSession } from '@/state/session';

export default function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const result = await api.login(email.trim(), password);
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
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <ErrorText message={error} />
      <Button label="Log in" onPress={submit} loading={loading} disabled={!email || !password} />
    </Screen>
  );
}
