// Basic building blocks. The UI designer can restyle everything from `colors` and these components.

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  primary: '#2E7D5B',
  primaryText: '#FFFFFF',
  background: '#FAFAF7',
  card: '#FFFFFF',
  text: '#1F2421',
  muted: '#6B706C',
  border: '#E3E3DE',
  danger: '#C0392B',
  chip: '#E8F3EE',
};

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {scroll ? <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView> : <View style={styles.content}>{children}</View>}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && { color: colors.muted }]}>{children}</Text>;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary'; loading?: boolean; disabled?: boolean;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, primary ? styles.buttonPrimary : styles.buttonSecondary,
        (pressed || disabled) && { opacity: 0.6 }]}
    >
      {loading ? <ActivityIndicator color={primary ? colors.primaryText : colors.primary} />
        : <Text style={[styles.buttonText, { color: primary ? colors.primaryText : colors.primary }]}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && { color: colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={styles.card}>{children}</Pressable>;
}

export function ErrorText({ message }: { message: string | null }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, lineHeight: 22, color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: colors.card, color: colors.text },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { borderWidth: 1, borderColor: colors.primary },
  buttonText: { fontSize: 16, fontWeight: '600' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.chip },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, fontSize: 14 },
  illustration: { width: '100%', height: 200, borderRadius: 16 },
});
