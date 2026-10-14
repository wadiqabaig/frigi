// Allergy, diet and household inputs, shared by Sign up and Profile (FR1).
// Allergies are tick-boxes so the app always sends the exact words the backend expects.

import { Text, View } from 'react-native';

import { ALLERGIES, DIETS, type Allergy, type Diet } from '@/api/types';
import { Chip, styles } from './ui';

export interface ProfileValues {
  allergies: Allergy[];
  diet: Diet;
  household_size: number;
}

export function ProfileFields({ value, onChange }: { value: ProfileValues; onChange: (v: ProfileValues) => void }) {
  const toggleAllergy = (a: Allergy) =>
    onChange({ ...value, allergies: value.allergies.includes(a) ? value.allergies.filter((x) => x !== a) : [...value.allergies, a] });

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Allergies</Text>
        <View style={styles.row}>
          {ALLERGIES.map((a) => (
            <Chip key={a.value} label={a.label} selected={value.allergies.includes(a.value)} onPress={() => toggleAllergy(a.value)} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Diet</Text>
        <View style={styles.row}>
          {DIETS.map((d) => (
            <Chip key={d.value} label={d.label} selected={value.diet === d.value} onPress={() => onChange({ ...value, diet: d.value })} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>People in your household</Text>
        <View style={styles.row}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Chip key={n} label={String(n)} selected={value.household_size === n} onPress={() => onChange({ ...value, household_size: n })} />
          ))}
        </View>
      </View>
    </View>
  );
}
