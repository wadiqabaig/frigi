// Step 1: choose 1 to 3 fridge photos and detect the ingredients (FR2, FR3).

import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { api, ApiError } from '@/api/client';
import type { PickedPhoto } from '@/api/types';
import { Body, Button, ErrorText, Screen, Title, colors, styles } from '@/components/ui';
import { useSession } from '@/state/session';

const MAX_PHOTOS = 3;

function toPhoto(asset: ImagePicker.ImagePickerAsset, index: number): PickedPhoto {
  return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg', fileName: asset.fileName ?? `fridge-${index}.jpg` };
}

export default function Home() {
  const { profile, journey, updateJourney, resetJourney } = useSession();
  const [photos, setPhotos] = useState<PickedPhoto[]>(journey.photos);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const room = MAX_PHOTOS - photos.length;

  async function fromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 0.8,
    });
    if (!result.canceled) setPhotos([...photos, ...result.assets.slice(0, room).map(toPhoto)]);
  }

  async function fromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera access is needed to take a photo. You can still choose photos from your library.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) setPhotos([...photos, toPhoto(result.assets[0], photos.length)]);
  }

  async function detect() {
    setError(null);
    setLoading(true);
    try {
      const result = await api.detect(photos);
      resetJourney();
      updateJourney({
        photos,
        confirmed: result.ingredients.map(({ id, name }) => ({ id, name })),
        staples: result.ask_about_staples,
      });
      router.push('/confirm');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile')}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Profile</Text>
            </Pressable>
          ),
        }}
      />
      <Title>Hi {profile?.name ?? 'there'}, what's in your fridge?</Title>
      <Image
        source={loading ? require('../../assets/illustrations/scanning.jpg') : require('../../assets/illustrations/upload.jpg')}
        style={styles.illustration}
        resizeMode="contain"
      />
      <Body muted>Add up to 3 photos of your open fridge. More angles help find hidden items.</Body>

      <View style={styles.row}>
        {photos.map((photo, index) => (
          <Pressable key={photo.uri} onPress={() => setPhotos(photos.filter((_, i) => i !== index))}>
            <Image source={{ uri: photo.uri }} style={{ width: 96, height: 96, borderRadius: 10 }} />
            <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>Tap to remove</Text>
          </Pressable>
        ))}
      </View>

      {room > 0 && (
        <>
          <Button label="Take a photo" variant="secondary" onPress={fromCamera} disabled={loading} />
          <Button label="Choose from library" variant="secondary" onPress={fromLibrary} disabled={loading} />
        </>
      )}
      <ErrorText message={error} />
      <Button label={loading ? 'Looking in your fridge…' : 'Find my ingredients'} onPress={detect} loading={loading} disabled={photos.length === 0} />
    </Screen>
  );
}
