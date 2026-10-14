// Step 4: at least 3 safe recipe ideas (FR7, FR10).

import { router, useLocalSearchParams } from 'expo-router';
import { Image, Text } from 'react-native';

import { Body, Card, Screen, Title, colors } from '@/components/ui';
import { useSession } from '@/state/session';

export default function Options() {
  const { journey } = useSession();
  const { removed, notice } = useLocalSearchParams<{ removed?: string; notice?: string }>();

  return (
    <Screen>
      <Title>Pick a recipe</Title>
      {!!notice && <Body muted>{notice}</Body>}
      {Number(removed) > 0 && (
        <Body muted>🛡️ {removed} recipe{removed === '1' ? ' was' : 's were'} hidden because they didn't match your allergies or diet.</Body>
      )}
      {journey.options.map((option) => (
        <Card key={option.option_id} onPress={() => router.push({ pathname: '/recipe', params: { optionId: option.option_id } })}>
          {option.image_url && <Image source={{ uri: option.image_url }} style={{ width: '100%', height: 160, borderRadius: 10 }} />}
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{option.title}</Text>
          {!!option.summary && <Body>{option.summary}</Body>}
          <Body muted>
            {option.minutes ? `${option.minutes} min · ` : ''}Uses {option.uses.join(', ') || 'your ingredients'}
          </Body>
          {option.missing.length > 0 && <Body muted>You'd also need: {option.missing.join(', ')}</Body>}
        </Card>
      ))}
    </Screen>
  );
}
