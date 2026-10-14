import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/components/ui';
import { SessionProvider } from '@/state/session';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Log in' }} />
          <Stack.Screen name="signup" options={{ title: 'Create account' }} />
          <Stack.Screen name="home" options={{ title: 'Frigi', headerBackVisible: false }} />
          <Stack.Screen name="confirm" options={{ title: 'Check your ingredients' }} />
          <Stack.Screen name="chef" options={{ title: 'Chef' }} />
          <Stack.Screen name="options" options={{ title: 'Recipe ideas' }} />
          <Stack.Screen name="recipe" options={{ title: 'Recipe' }} />
          <Stack.Screen name="profile" options={{ title: 'Your profile' }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
