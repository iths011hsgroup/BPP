// app/profile-avatar-view.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const BACKGROUND = '#020617';
const TEXT_MAIN = '#E5E7EB';
const TEXT_MUTED = '#9CA3AF';
const CARD = '#0F172A';
const NEGATIVE = '#EF4444';

const API_BASE_URL = 'http://192.168.2.57:3000';

type ProfileResponse = {
  id: number;
  email: string;
  username: string | null;
  avatar_url?: string | null;
  created_at: string;
};

export default function ProfileAvatarViewScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load profile.');
      }

      setProfile(json as ProfileResponse);
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const avatarUrlRelative = profile?.avatar_url ?? null;
  const avatarUrl =
    avatarUrlRelative && avatarUrlRelative.startsWith('http')
      ? avatarUrlRelative
      : avatarUrlRelative
      ? `${API_BASE_URL}${avatarUrlRelative}`
      : null;

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
            <Text style={styles.title}>Profile picture</Text>
            <View style={{ width: 60 }} />
          </View>

          {loading && (
            <View style={styles.center}>
              <ActivityIndicator color="#ffffff" />
            </View>
          )}

          {error && !loading && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {!loading && !error && avatarUrl && (
            <View style={styles.imageCard}>
              <Image
                source={{ uri: avatarUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          )}

          {!loading && !error && !avatarUrl && (
            <Text style={styles.helperText}>
              You have not set a profile picture yet.
            </Text>
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
  errorText: {
    color: NEGATIVE,
    fontSize: 12,
    marginBottom: 8,
  },
  imageCard: {
    marginTop: 16,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: CARD,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  helperText: {
    marginTop: 16,
    color: TEXT_MUTED,
    fontSize: 12,
  },
});
