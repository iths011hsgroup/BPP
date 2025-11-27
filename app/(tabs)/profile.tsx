// app/(tabs)/profile.tsx
import React, { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';

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
  created_at: string | Date;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setProfileError(null);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setProfileError('Not authenticated. Please log in again.');
        setProfile(null);
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
      setProfileError(err?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh profile whenever tab/screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    router.replace('/');
  };

  const displayName = (() => {
    if (!profile) return 'User';
    if (profile.username && profile.username.trim().length > 0) {
      return profile.username.trim();
    }
    // Placeholder: user#YYYYMMDDHHmmssXXX
    const createdRaw = profile.created_at;
    const created =
      typeof createdRaw === 'string'
        ? new Date(createdRaw)
        : createdRaw ?? new Date();

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const year = created.getFullYear();
    const month = pad2(created.getMonth() + 1);
    const day = pad2(created.getDate());
    const hour = pad2(created.getHours());
    const minute = pad2(created.getMinutes());
    const second = pad2(created.getSeconds());

    const suffix = String(profile.id % 1000 || 1).padStart(3, '0');

    return `user#${year}${month}${day}${hour}${minute}${second}${suffix}`;
  })();

  const currentTimeText = now.toLocaleString('id-ID', {
    hour12: false,
  });

  const avatarInitial = displayName.trim()[0]?.toUpperCase() ?? 'U';

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
          {/* Header with avatar + name + time */}
          <View style={styles.headerCard}>
            <TouchableOpacity
              style={styles.avatar}
              activeOpacity={avatarUrl ? 0.8 : 1}
              onPress={() => {
                if (avatarUrl) {
                  router.push('/profile-avatar-view');
                }
              }}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.headerTextCol}>
              <Text style={styles.helloText}>Hello,</Text>
              <Text style={styles.nameText}>{displayName}</Text>
              <Text style={styles.timeText}>{currentTimeText}</Text>
            </View>
          </View>

          {/* Error / loading */}
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator color="#ffffff" />
            </View>
          )}
          {profileError && !loading && (
            <Text style={styles.errorText}>{profileError}</Text>
          )}

          {/* Menu container */}
          <View style={styles.menuCard}>
            {/* Change profile picture */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/profile-avatar-edit')}
            >
              <View>
                <Text style={styles.menuTitle}>Change profile picture</Text>
                <Text style={styles.menuSubtitle}>
                  Upload & crop a new avatar
                </Text>
              </View>
              <Text style={styles.menuChevron}>
                {Platform.OS === 'ios' ? '›' : '>'}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* Change profile (email + username) */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/profile-change')}
            >
              <View>
                <Text style={styles.menuTitle}>Change profile</Text>
                <Text style={styles.menuSubtitle}>
                  Update email & username (requires password)
                </Text>
              </View>
              <Text style={styles.menuChevron}>
                {Platform.OS === 'ios' ? '›' : '>'}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* Change password */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/password-change')}
            >
              <View>
                <Text style={styles.menuTitle}>Change password</Text>
                <Text style={styles.menuSubtitle}>
                  Update your login password
                </Text>
              </View>
              <Text style={styles.menuChevron}>
                {Platform.OS === 'ios' ? '›' : '>'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Spacer so logout sits visually at bottom */}
          <View style={{ flex: 1 }} />

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
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
    backgroundColor: BACKGROUND,
    padding: 24,
    paddingTop: 64,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  avatarText: {
    color: TEXT_MAIN,
    fontSize: 22,
    fontWeight: '700',
  },
  headerTextCol: {
    flex: 1,
  },
  helloText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  nameText: {
    color: TEXT_MAIN,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  timeText: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 4,
  },
  center: {
    alignItems: 'center',
    marginVertical: 8,
  },
  errorText: {
    color: NEGATIVE,
    fontSize: 12,
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  menuTitle: {
    color: TEXT_MAIN,
    fontSize: 15,
    fontWeight: '600',
  },
  menuSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  menuChevron: {
    color: TEXT_MUTED,
    fontSize: 18,
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#111827',
    opacity: 0.7,
  },
  logoutButton: {
    marginTop: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: NEGATIVE,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: NEGATIVE,
    fontSize: 14,
    fontWeight: '600',
  },
});
