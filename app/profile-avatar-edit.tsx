// app/profile-avatar-edit.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const BACKGROUND = '#020617';
const TEXT_MAIN = '#E5E7EB';
const TEXT_MUTED = '#9CA3AF';
const CARD = '#0F172A';
const ACCENT = '#4F46E5';
const NEGATIVE = '#EF4444';

const API_BASE_URL = 'http://192.168.2.57:3000';

type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

type CropState = {
  frameSize: number;
  scale: number;
  displayWidth: number;
  displayHeight: number;
  x: number;
  y: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export default function ProfileAvatarEditScreen() {
  const router = useRouter();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);
  const [saving, setSaving] = useState(false);

  const cropRef = useRef<CropState | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  const pickImage = useCallback(async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Media library permission is required to select a profile picture.',
      );
      router.back();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) {
      router.back();
      return;
    }

    const asset = result.assets[0];
    setImage({
      uri: asset.uri,
      width: asset.width ?? 1024,
      height: asset.height ?? 1024,
    });
  }, [router]);

  useEffect(() => {
    pickImage();
  }, [pickImage]);

  // Initialize crop state once we have an image
  useEffect(() => {
    if (!image) return;

    const frameSize = 280;
    const baseScale =
      frameSize / Math.min(image.width, image.height);
    const displayWidth = image.width * baseScale;
    const displayHeight = image.height * baseScale;

    let minX: number;
    let maxX: number;
    if (displayWidth > frameSize) {
      minX = frameSize - displayWidth;
      maxX = 0;
    } else {
      minX = maxX = (frameSize - displayWidth) / 2;
    }

    let minY: number;
    let maxY: number;
    if (displayHeight > frameSize) {
      minY = frameSize - displayHeight;
      maxY = 0;
    } else {
      minY = maxY = (frameSize - displayHeight) / 2;
    }

    const x = Math.max(minX, Math.min(maxX, (minX + maxX) / 2));
    const y = Math.max(minY, Math.min(maxY, (minY + maxY) / 2));

    setCrop({
      frameSize,
      scale: baseScale,
      displayWidth,
      displayHeight,
      x,
      y,
      minX,
      maxX,
      minY,
      maxY,
    });
  }, [image]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const c = cropRef.current;
        if (!c) return;
        startPosRef.current = { x: c.x, y: c.y };
      },
      onPanResponderMove: (_evt, gesture) => {
        const c = cropRef.current;
        if (!c) return;

        let nextX = startPosRef.current.x + gesture.dx;
        let nextY = startPosRef.current.y + gesture.dy;

        nextX = Math.max(c.minX, Math.min(c.maxX, nextX));
        nextY = Math.max(c.minY, Math.min(c.maxY, nextY));

        setCrop({ ...c, x: nextX, y: nextY });
      },
    }),
  ).current;

  const handleSave = useCallback(async () => {
    if (!image || !crop) return;

    try {
      setSaving(true);

      const { frameSize, scale, x, y } = crop;

      let originX = (0 - x) / scale;
      let originY = (0 - y) / scale;
      let size = frameSize / scale;

      originX = Math.max(0, originX);
      originY = Math.max(0, originY);

      if (originX + size > image.width) {
        size = image.width - originX;
      }
      if (originY + size > image.height) {
        size = Math.min(size, image.height - originY);
      }

      const manipulated = await ImageManipulator.manipulateAsync(
        image.uri,
        [
          {
            crop: {
              originX,
              originY,
              width: size,
              height: size,
            },
          },
          {
            resize: { width: 512, height: 512 },
          },
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Not authenticated', 'Please log in again.');
        router.replace('/');
        return;
      }

      const formData = new FormData();
      formData.append('avatar', {
        uri: manipulated.uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await fetch(`${API_BASE_URL}/user/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to upload avatar.');
      }

      Alert.alert('Profile picture updated');
      router.back();
    } catch (err: any) {
      console.error('Error saving avatar', err);
      Alert.alert(
        'Error',
        err?.message || 'Failed to save avatar.',
      );
    } finally {
      setSaving(false);
    }
  }, [image, crop, router]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>
                {Platform.OS === 'ios' ? '‹ Back' : '< Back'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.title}>Change profile picture</Text>
            <View style={{ width: 60 }} />
          </View>

          {!image || !crop ? (
            <View style={styles.center}>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.helperText}>Opening gallery…</Text>
            </View>
          ) : (
            <>
              <Text style={styles.helperText}>
                Drag the photo to adjust the circular focus. The saved
                picture will be a square crop.
              </Text>

              <View
                style={[
                  styles.cropFrame,
                  {
                    width: crop.frameSize,
                    height: crop.frameSize,
                  },
                ]}
              >
                <View style={styles.cropCircleBorder} />
                <View
                  style={styles.cropImageContainer}
                  {...panResponder.panHandlers}
                >
                  <Image
                    source={{ uri: image.uri }}
                    style={{
                      width: crop.displayWidth,
                      height: crop.displayHeight,
                      transform: [
                        { translateX: crop.x },
                        { translateY: crop.y },
                      ],
                    }}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && { opacity: 0.7 },
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving…' : 'Save picture'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scroll: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  title: {
    color: TEXT_MAIN,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  center: {
    alignItems: 'center',
    marginTop: 32,
  },
  helperText: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 12,
  },
  cropFrame: {
    alignSelf: 'center',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
  },
  cropImageContainer: {
    flex: 1,
  },
  cropCircleBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#e5e7eb33',
    zIndex: 2,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
  },
});
