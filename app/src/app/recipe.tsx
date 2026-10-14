// Step 5: the full recipe scaled to the number of people (FR8), with swaps for missing items (FR9).

import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { api, ApiError } from '@/api/client';
import type { Recipe, SwapResult } from '@/api/types';
import { Body, Button, Card, ErrorText, Screen, Title, colors, styles } from '@/components/ui';
import { useSession } from '@/state/session';

function amount(quantity: number, unit: string) {
  if (!quantity) return '';
  const q = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/\.?0+$/, '');
  return `${q}${unit ? ` ${unit}` : ''} `;
}

export default function RecipeScreen() {
  const { optionId } = useLocalSearchParams<{ optionId: string }>();
  const { journey, profile, resetJourney } = useSession();
  const [servings, setServings] = useState(journey.answers.servings ?? profile?.household_size ?? 2);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [swap, setSwap] = useState<SwapResult | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (count: number) => {
    setError(null);
    try {
      setRecipe(await api.recipe(optionId, count));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    }
  }, [optionId]);

  useEffect(() => { load(servings); }, [load, servings]);

  async function askSwap(missing: string) {
    if (!recipe) return;
    setSwapping(missing);
    setSwap(null);
    try {
      setSwap(await api.swap(recipe.recipe_id, missing));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setSwapping(null);
    }
  }

  if (!recipe) {
    return (
      <Screen>
        {error ? <ErrorText message={error} /> : <ActivityIndicator color={colors.primary} />}
        {error && <Button label="Back to recipes" variant="secondary" onPress={() => router.back()} />}
      </Screen>
    );
  }

  return (
    <Screen>
      {recipe.image_url
        ? <Image source={{ uri: recipe.image_url }} style={{ width: '100%', height: 200, borderRadius: 14 }} />
        : <Image source={require('../../assets/illustrations/cooking.jpg')} style={styles.illustration} resizeMode="contain" />}
      <Title>{recipe.title}</Title>
      <Body muted>{recipe.minutes ? `${recipe.minutes} min · ` : ''}🛡️ Checked for your allergies and diet</Body>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Text style={styles.label}>Servings</Text>
        <Button label="−" variant="secondary" onPress={() => setServings(Math.max(1, servings - 1))} />
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{servings}</Text>
        <Button label="+" variant="secondary" onPress={() => setServings(Math.min(20, servings + 1))} />
      </View>

      <Card>
        <Text style={styles.label}>Ingredients</Text>
        {recipe.ingredients.map((item) => (
          <Pressable key={item.name} disabled={item.have} onPress={() => askSwap(item.name)}>
            <Body>
              {item.have ? '✅' : '🛒'} {amount(item.quantity, item.unit)}{item.name}
              {!item.have && <Text style={{ color: colors.primary }}>  · swap?</Text>}
            </Body>
          </Pressable>
        ))}
      </Card>

      {swapping && <Body muted>Finding a swap for {swapping}…</Body>}
      {swap && (
        <Card>
          <Text style={styles.label}>Instead of {swap.missing}</Text>
          {swap.swaps.length === 0 && <Body muted>No safe swap found.</Body>}
          {swap.swaps.map((s) => <Body key={s.name}>• {s.name}: {s.note}</Body>)}
        </Card>
      )}

      <Card>
        <Text style={styles.label}>Steps</Text>
        {recipe.steps.map((step, i) => <Body key={i}>{i + 1}. {step}</Body>)}
      </Card>

      <ErrorText message={error} />
      <Button label="Cook something else" variant="secondary" onPress={() => { resetJourney(); router.replace('/home'); }} />
    </Screen>
  );
}
