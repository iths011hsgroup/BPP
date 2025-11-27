// app/index.tsx
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIMARY = '#1E3A8A';
const BACKGROUND = '#020617';
const CARD = '#0F172A';
const TEXT_MAIN = '#E5E7EB';
const TEXT_MUTED = '#9CA3AF';
const ACCENT = '#4F46E5';

const API_BASE_URL = 'http://192.168.2.57:3000';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !confirmPassword)) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';

      const payload = isRegister
        ? { email, password }
        : { identifier: email, password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          (data && data.message) || 'Failed to authenticate. Please try again.';
        throw new Error(message);
      }

      if (data?.token) {
        await AsyncStorage.setItem('authToken', data.token);
      }

      router.replace('/home');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.appTitle}>BPP</Text>
      <Text style={styles.subtitle}>
        {isRegister ? 'Create your account' : 'Welcome back'}
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>
          {isRegister ? 'Email' : 'Email or username'}
        </Text>
        <TextInput
          placeholder={isRegister ? 'you@example.com' : 'you@example.com or username'}
          placeholderTextColor="#8A8FA6"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor="#8A8FA6"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        {isRegister && (
          <>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#8A8FA6"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </>
        )}


        <TouchableOpacity
          style={[styles.primaryButton, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isRegister ? 'Create account' : 'Login'}
            </Text>
          )}
        </TouchableOpacity>

        {!isRegister ? (
          <>
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Forgot password', 'Not implemented in this demo.')
              }
            >
              <Text style={styles.linkText}>Forgot your password?</Text>
            </TouchableOpacity>

            <Text style={styles.registerPrompt}>
              Haven&apos;t registered yet?{' '}
              <Text
                style={styles.registerLink}
                onPress={() => setMode('register')}
              >
                Create your account now!
              </Text>
            </Text>
          </>
        ) : (
          <Text style={styles.registerPrompt}>
            Already have an account?{' '}
            <Text
              style={styles.registerLink}
              onPress={() => setMode('login')}
            >
              Log in instead.
            </Text>
          </Text>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Demo UI only. Do not use real banking credentials.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 24,
    paddingTop: 64,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: TEXT_MUTED,
  },
  form: {
    marginTop: 24,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 20,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    color: TEXT_MUTED,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_MAIN,
    fontSize: 14,
    backgroundColor: '#020617',
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  linkText: {
    marginTop: 16,
    textAlign: 'center',
    color: ACCENT,
    fontSize: 13,
  },
  registerPrompt: {
    marginTop: 16,
    textAlign: 'center',
    color: TEXT_MUTED,
    fontSize: 13,
  },
  registerLink: {
    color: ACCENT,
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
});
