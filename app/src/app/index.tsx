// Start screen: sends the user to Home if logged in, otherwise to the welcome screen.

import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Image, View } from 'react-native';

import { Body, Button, Screen, Title, colors, styles } from '@/components/ui';
import { useSession } from '@/state/session';

export default function Welcome() {
  const { ready, profile } = useSession();

  if (!ready) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (profile) return <Redirect href="/home" />;

  return (
    <Screen>
      <Image source={require('../../assets/illustrations/logo.jpg')} style={[styles.illustration, { height: 260, marginTop: 40 }]} resizeMode="contain" />
      <Title>Frigi</Title>
      <Body muted>Snap your fridge. Get recipes you can cook now, safe for your allergies and diet.</Body>
      <Button label="Create account" onPress={() => router.push('/signup')} />
      <Button label="I already have an account" variant="secondary" onPress={() => router.push('/login')} />
    </Screen>
  );
}
