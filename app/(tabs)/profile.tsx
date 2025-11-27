// app/(tabs)/profile.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const BACKGROUND = '#020617';
const TEXT_MAIN = '#E5E7EB';
const TEXT_MUTED = '#9CA3AF';
const CARD = '#0F172A';
const NEGATIVE = '#EF4444';
const ACCENT = '#4F46E5';

const API_BASE_URL = 'http://192.168.2.57:3000';

type ProfileResponse = {
  id: number;
  email: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string | Date;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  // Avatar UI state
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setProfileError(null);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setProfileError('Not authenticated. Please log in again.');
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
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    router.replace('/');
  };

  const handleDeleteAvatar = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Not authenticated', 'Please log in again.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/user/avatar`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to delete avatar.');
      }

      await loadProfile();
      Alert.alert('Profile picture deleted');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Failed to delete profile picture.',
      );
    } finally {
      setAvatarSheetVisible(false);
    }
  };

  const handleChangeAvatar = async () => {
    try {
      setAvatarSheetVisible(false);

      // 1. Ask for photo library permission
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow access to your photo library to change your picture.',
        );
        return;
      }

      // 2. Let user pick and crop to 1:1
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,    // system crop UI
        aspect: [1, 1],         // 1:1 square
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        return;
      }

      setUploadingAvatar(true);

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Not authenticated', 'Please log in again.');
        setUploadingAvatar(false);
        return;
      }

      const uri = asset.uri;
      const fileName = uri.split('/').pop() ?? `avatar-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(fileName);
      const ext = match ? match[1].toLowerCase() : 'jpg';

      let mimeType = 'image/jpeg';
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';

      // 3. Build multipart/form-data
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: fileName,
        type: mimeType,
      } as any);

      // 4. Upload to backend (which deletes old file + saves new one)
      const res = await fetch(`${API_BASE_URL}/user/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`, // DO NOT set Content-Type manually
        },
        body: formData,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to upload avatar.');
      }

      // 5. Refresh profile so new avatar appears
      await loadProfile();
      Alert.alert('Profile picture updated');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Failed to change profile picture.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displayName = (() => {
    if (!profile) return 'User';
    if (profile.username && profile.username.trim().length > 0) {
      return profile.username.trim();
    }
    const createdRaw = profile?.created_at;
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

    const suffix = String(profile?.id % 1000 || 1).padStart(3, '0');

    return `user#${year}${month}${day}${hour}${minute}${second}${suffix}`;
  })();

  const currentTimeText = now.toLocaleString('id-ID', {
    hour12: false,
  });

  const avatarInitial = displayName.trim()[0]?.toUpperCase() ?? 'U';
  const avatarUri =
    profile?.avatar_url && profile.avatar_url.length > 0
      ? `${API_BASE_URL}${profile.avatar_url}`
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
              onPress={() => {
                if (avatarUri) setAvatarPreviewVisible(true);
              }}
              activeOpacity={avatarUri ? 0.8 : 1}
            >
              <View style={styles.avatar}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>{avatarInitial}</Text>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.headerTextCol}>
              <Text style={styles.helloText}>Hello,</Text>
              <Text style={styles.nameText}>{displayName}</Text>
              <Text style={styles.timeText}>{currentTimeText}</Text>
            </View>
          </View>

          {/* Loading / error state */}
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator color="#ffffff" />
            </View>
          )}
          {profileError && !loading && (
            <Text style={styles.errorText}>{profileError}</Text>
          )}

          {/* Avatar upload progress */}
          {uploadingAvatar && (
            <View style={styles.center}>
              <ActivityIndicator color={ACCENT} />
              <Text style={styles.uploadingText}>
                Updating profile picture…
              </Text>
            </View>
          )}

          {/* Menu container */}
          <View style={styles.menuCard}>
            {/* Profile picture menu */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setAvatarSheetVisible(true)}
            >
              <View>
                <Text style={styles.menuTitle}>Profile picture</Text>
                <Text style={styles.menuSubtitle}>
                  Change or remove your profile picture
                </Text>
              </View>
              <Text style={styles.menuChevron}>
                {Platform.OS === 'ios' ? '›' : '>'}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

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

      {/* Avatar action sheet modal */}
      <Modal
        visible={avatarSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setAvatarSheetVisible(false)}
        >
          <View />
        </TouchableOpacity>
        <View style={styles.sheetContainer}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Profile picture</Text>

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={handleChangeAvatar}
            >
              <Text style={styles.sheetActionText}>
                Change profile picture
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={handleDeleteAvatar}
            >
              <Text style={[styles.sheetActionText, { color: NEGATIVE }]}>
                Delete profile picture
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetAction, styles.sheetCancel]}
              onPress={() => setAvatarSheetVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-size avatar preview modal */}
      <Modal
        visible={avatarPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPreviewVisible(false)}
      >
        <TouchableOpacity
          style={styles.previewBackdrop}
          activeOpacity={1}
          onPress={() => setAvatarPreviewVisible(false)}
        >
          <View />
        </TouchableOpacity>
        <View style={styles.previewContainer}>
          <View style={styles.previewCard}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.previewPlaceholder}>{avatarInitial}</Text>
            )}
          </View>
        </View>
      </Modal>
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
    overflow: 'hidden', // circular mask
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
  uploadingText: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 4,
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
  // Action sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  sheetCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sheetTitle: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
    textAlign: 'center',
  },
  sheetAction: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  sheetActionText: {
    color: TEXT_MAIN,
    fontSize: 14,
  },
  sheetCancel: {
    borderTopWidth: 1,
    borderTopColor: '#111827',
    marginTop: 6,
  },
  sheetCancelText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  // Avatar preview
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  previewContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewCard: {
    width: 260,
    height: 260,
    borderRadius: 16,
    backgroundColor: '#020617',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    color: TEXT_MAIN,
    fontSize: 48,
    fontWeight: '700',
  },
});
