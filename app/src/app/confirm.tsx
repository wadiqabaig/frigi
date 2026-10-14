// Step 2: the user confirms the detected list, answers the staples question and adds missed items (FR4, FR5).

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { api } from '@/api/client';
import type { Ingredient } from '@/api/types';
import { Body, Button, Chip, Field, Screen, Title, styles } from '@/components/ui';
import { useSession } from '@/state/session';

const key = (i: Ingredient) => i.id ?? i.name.toLowerCase();

export default function Confirm() {
  const { journey, updateJourney } = useSession();
  const [items, setItems] = useState<Ingredient[]>(journey.confirmed);
  const [selected, setSelected] = useState<Set<string>>(new Set(journey.confirmed.map(key)));
  const [extra, setExtra] = useState('');
  const [catalogue, setCatalogue] = useState<Ingredient[]>([]);

  useEffect(() => {
    api.ingredients().then((r) => setCatalogue(r.detectable)).catch(() => setCatalogue([]));
  }, []);

  function toggle(item: Ingredient) {
    const next = new Set(selected);
    next.has(key(item)) ? next.delete(key(item)) : next.add(key(item));
    if (!items.some((i) => key(i) === key(item))) setItems([...items, item]);
    setSelected(next);
  }

  function addTyped() {
    const name = extra.trim();
    if (!name) return;
    const match = catalogue.find((c) => c.name.toLowerCase() === name.toLowerCase());
    toggle(match ?? { id: null, name });
    setExtra('');
  }

  function next() {
    updateJourney({ confirmed: items.filter((i) => selected.has(key(i))) });
    router.push('/chef');
  }

  const notListed = catalogue.filter((c) => !items.some((i) => key(i) === key(c)));

  return (
    <Screen>
      <Image source={require('../../assets/illustrations/confirm.jpg')} style={styles.illustration} resizeMode="contain" />
      <Title>We found these</Title>
      <Body muted>Untick anything that's wrong. Detection can miss hidden or unusual items.</Body>
      <View style={styles.row}>
        {items.map((item) => <Chip key={key(item)} label={item.name} selected={selected.has(key(item))} onPress={() => toggle(item)} />)}
        {items.length === 0 && <Body muted>No ingredients found. Add them below.</Body>}
      </View>

      {journey.staples.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Do you also have…</Text>
          <View style={styles.row}>
            {journey.staples.map((s) => <Chip key={key(s)} label={s.name} selected={selected.has(key(s))} onPress={() => toggle(s)} />)}
          </View>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Field label="Add something else" value={extra} onChangeText={setExtra} onSubmitEditing={addTyped} placeholder="e.g. rice" returnKeyType="done" />
        {notListed.length > 0 && (
          <View style={styles.row}>
            {notListed.slice(0, 12).map((c) => <Chip key={key(c)} label={`+ ${c.name}`} onPress={() => toggle(c)} />)}
          </View>
        )}
      </View>

      <Button label={`Continue with ${selected.size} item${selected.size === 1 ? '' : 's'}`} onPress={next} disabled={selected.size === 0} />
    </Screen>
  );
}
