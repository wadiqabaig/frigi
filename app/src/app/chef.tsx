// Step 3: the chef asks one question at a time with tap-to-answer buttons (FR6), then finds recipes (FR7).

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { api, ApiError } from '@/api/client';
import type { ChefAnswers, ChefQuestion } from '@/api/types';
import { Body, Button, Card, Chip, ErrorText, Field, Screen, Title, styles } from '@/components/ui';
import { useSession } from '@/state/session';

export default function Chef() {
  const { profile, journey, updateJourney } = useSession();
  const [questions, setQuestions] = useState<ChefQuestion[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ChefAnswers>({ servings: profile?.household_size });
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.questions().then((r) => setQuestions(r.questions)).catch(() => setError('Could not load the chef. Please go back and try again.'));
  }, []);

  function answer(question: ChefQuestion, option: string) {
    const value = question.key === 'max_minutes' || question.key === 'servings' ? Number(option) : option;
    setAnswers({ ...answers, [question.key]: value });
    setStep(step + 1);
  }

  async function findRecipes() {
    setError(null);
    setLoading(true);
    const finalAnswers = { ...answers, note: note.trim() || undefined };
    try {
      const result = await api.options(journey.confirmed, finalAnswers);
      updateJourney({ answers: finalAnswers, options: result.options });
      router.push({ pathname: '/options', params: { removed: String(result.removed_by_safety_filter), notice: result.notice ?? '' } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const question = questions[step];

  return (
    <Screen>
      <Image source={require('../../assets/illustrations/chef.jpg')} style={styles.illustration} resizeMode="contain" />
      {question ? (
        <Card>
          <Title>{question.text}</Title>
          <View style={[styles.row, { marginTop: 8 }]}>
            {question.options.map((o) => (
              <Chip key={o} label={o} selected={String(answers[question.key] ?? '') === o} onPress={() => answer(question, o)} />
            ))}
          </View>
        </Card>
      ) : questions.length > 0 ? (
        <>
          <Title>Anything else the chef should know?</Title>
          <Field label="Optional" value={note} onChangeText={setNote} placeholder="e.g. nothing too spicy" />
          <Button label={loading ? 'The chef is thinking…' : 'Show me recipes'} onPress={findRecipes} loading={loading} />
        </>
      ) : null}
      {step > 0 && !loading && <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} />}
      <ErrorText message={error} />
      <Body muted>Cooking with: {journey.confirmed.map((i) => i.name).join(', ')}</Body>
    </Screen>
  );
}
