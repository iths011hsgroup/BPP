// app/(tabs)/home.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const BACKGROUND = '#020617';
const TEXT_MAIN = '#E5E7EB';
const TEXT_MUTED = '#9CA3AF';
const CARD = '#0F172A';

export default function DashboardScreen() {
  const router = useRouter();

  const handleLogout = () => {
  console.log('Logout pressed');
  // later: also clear any stored token/session here
  router.replace('/'); // go back to login at app/index.tsx
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>BPP Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Available balance</Text>
        <Text style={styles.balance}>$ 12,485.32</Text>
      </View>
      <Text style={styles.text}>
        This is your home screen after login. You can now add accounts,
        transactions, etc.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
    padding: 24,
    paddingTop: 64,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: TEXT_MAIN,
    fontSize: 24,
    fontWeight: '700',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#374151',
  },
  logoutText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  balance: {
    color: TEXT_MAIN,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  text: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
});
