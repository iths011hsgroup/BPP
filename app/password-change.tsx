// app/password-change.tsx
import React, { useState } from 'react';
import {
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

// const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://bpp-server-production.up.railway.app/';
import { API_BASE_URL } from '@/constants/api';

export const options = {
  title: 'Change password',
};

export default function PasswordChangeScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert('Invalid input', 'All fields are required.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Invalid input', 'New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        'Weak password',
        'For this demo, please use at least 6 characters.',
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Not authenticated', 'Please log in again.');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to change password.');
      }

      Alert.alert('Password updated', 'Your password has been changed.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      const msg = err?.message || 'Failed to change password.';
      setError(msg);
      Alert.alert('Error', msg);
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
          <Text style={styles.title}>Change password</Text>
          <Text style={styles.subtitle}>
            Set a new password for your account. Your current password is required to confirm this change.
          </Text>

          <View style={styles.card}>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <Text style={styles.label}>Current password</Text>
            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              secureTextEntry
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
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
                {submitting ? 'Saving…' : 'Update password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              In a real production app, you would enforce stronger password rules and add extra security checks.
            </Text>
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
  note: {
    marginTop: 10,
    color: TEXT_MUTED,
    fontSize: 11,
  },
});
