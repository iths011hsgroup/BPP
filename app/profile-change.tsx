// app/profile-change.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
const ACCENT = '#4F46E5';

const API_BASE_URL = 'http://192.168.2.57:3000';

type ProfileResponse = {
  id: number;
  email: string;
  username: string | null;
  created_at: string | Date;
};

export const options = {
  title: 'Change profile',
};

export default function ProfileChangeScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

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
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });

        const json = await res.json();

        if (!res.ok) {
        throw new Error(json?.message || 'Failed to load profile.');
        }

        const data = json as ProfileResponse;
        setEmail(data.email || '');
        setUsername(data.username || '');
    } catch (err: any) {
        setError(err?.message || 'Failed to load profile.');
    } finally {
        setLoading(false);
    }
    };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Invalid input', 'Email is required.');
      return;
    }
    if (!currentPassword.trim()) {
      Alert.alert(
        'Invalid input',
        'Please enter your current password to confirm changes.',
      );
      return;
    }

    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Not authenticated', 'Please log in again.');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            email: email.trim(),
            username: username.trim() || null,
            current_password: currentPassword,
        }),
        });


      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to update profile.');
      }

      Alert.alert('Profile updated', 'Your profile has been updated.', [
        {
          text: 'OK',
          onPress: () => router.back(), // Profile screen will refetch on focus
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Change profile</Text>
          <Text style={styles.subtitle}>
            Update your email and username. Your current password is required to confirm changes.
          </Text>

          <View style={styles.card}>
            {loading && (
              <View style={styles.center}>
                <ActivityIndicator color="#ffffff" />
              </View>
            )}

            {error && !loading && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {!loading && (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />

                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional username"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />

                <Text style={styles.label}>Current password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    submitting && { opacity: 0.7 },
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <Text style={styles.saveButtonText}>
                    {submitting ? 'Saving…' : 'Save changes'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => router.back()}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
    padding: 24,
    paddingTop: 64,
  },
  title: {
    color: TEXT_MAIN,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
  },
  center: {
    alignItems: 'center',
    marginVertical: 16,
  },
  errorText: {
    color: NEGATIVE,
    fontSize: 12,
    marginBottom: 8,
  },
  label: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: TEXT_MAIN,
    fontSize: 14,
    backgroundColor: '#020617',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#f9fafb',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
});
