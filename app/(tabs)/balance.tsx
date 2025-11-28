// app/(tabs)/balance.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND = '#020617';
const TEXT_MAIN = '#E5E7EB';
const TEXT_MUTED = '#9CA3AF';
const CARD = '#0F172A';
const POSITIVE = '#22C55E';
const NEGATIVE = '#EF4444';

// const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://bpp-server-production.up.railway.app/';
import { API_BASE_URL } from '@/constants/api';

type BalanceTransaction = {
  id: number;
  type: 'DEPOSIT' | 'WITHDRAW';
  currency: string;
  amount: number | string;
  balance_after: number | string;
  created_at: string;
};

type BalanceRow = {
  currency: string;
  balance: number | string;
};

type BalanceMode = 'DEPOSIT' | 'WITHDRAW';

type DialogVariant = 'info' | 'success' | 'error';

const formatIDR = (value: number) => {
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
  }
};

// For IDR input – allow only digits, format with thousands separators
const formatIdrInput = (text: string): string => {
  const cleaned = text.replace(/[^\d]/g, '');
  if (!cleaned) return '';
  const num = Number(cleaned);
  if (Number.isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};

export default function BalanceScreen() {
  const [idrBalance, setIdrBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<BalanceMode>('DEPOSIT'); // default deposit
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Themed modal dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogVariant, setDialogVariant] = useState<DialogVariant>('info');

  const showDialog = (
    title: string,
    message: string,
    variant: DialogVariant = 'info',
  ) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVariant(variant);
    setDialogVisible(true);
  };

  const loadBalances = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated. Please log in again.');
        setIdrBalance(0);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/balance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load balance.');
      }

      const balances = (json.balances || []) as BalanceRow[];
      const idrRow = balances.find((b) => b.currency === 'IDR');
      const bal = idrRow ? Number(idrRow.balance) || 0 : 0;
      setIdrBalance(bal);
    } catch (err: any) {
      setError(err?.message || 'Failed to load balance.');
      setIdrBalance(0);
    }
  };

  const loadTransactions = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        return;
      }
      const res = await fetch(
        `${API_BASE_URL}/balance/transactions?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load transactions.');
      }
      setTransactions(json.transactions || []);
    } catch (err) {
      console.error('Error loading balance transactions', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadBalances(), loadTransactions()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleDeposit = async () => {
    const cleaned = depositAmount.replace(/[^\d]/g, '');
    const amount = Number(cleaned);

    if (!amount || amount <= 0) {
      showDialog(
        'Invalid input',
        'Enter a positive deposit amount in IDR.',
        'error',
      );
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showDialog('Not authenticated', 'Please log in again.', 'error');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/balance/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount_idr: amount }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to deposit.');
      }

      setDepositAmount('');
      await loadAll();
      showDialog(
        'Deposit successful',
        `New balance: ${formatIDR(Number(json.new_balance_idr || 0))}`,
        'success',
      );
    } catch (err: any) {
      showDialog('Error', err?.message || 'Failed to deposit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    const cleaned = withdrawAmount.replace(/[^\d]/g, '');
    const amount = Number(cleaned);

    if (!amount || amount <= 0) {
      showDialog(
        'Invalid input',
        'Enter a positive withdrawal amount in IDR.',
        'error',
      );
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showDialog('Not authenticated', 'Please log in again.', 'error');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/balance/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount_idr: amount }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to withdraw.');
      }

      setWithdrawAmount('');
      await loadAll();
      showDialog(
        'Withdrawal successful',
        `New balance: ${formatIDR(Number(json.new_balance_idr || 0))}`,
        'success',
      );
    } catch (err: any) {
      showDialog('Error', err?.message || 'Failed to withdraw.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onPrimaryPress = () => {
    if (mode === 'DEPOSIT') {
      handleDeposit();
    } else {
      handleWithdraw();
    }
  };

  const primaryAmount = mode === 'DEPOSIT' ? depositAmount : withdrawAmount;
  const setPrimaryAmount =
    mode === 'DEPOSIT' ? setDepositAmount : setWithdrawAmount;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={[TEXT_MAIN]}
          />
        }
      >
        <View style={styles.container}>
          <Text style={styles.title}>Balance</Text>

          {/* Balance summary + mode toggle */}
          <View style={styles.card}>
            <Text style={styles.label}>IDR balance</Text>
            {loading ? (
              <View style={styles.centerRow}>
                <ActivityIndicator color="#ffffff" />
              </View>
            ) : (
              <Text style={styles.value}>{formatIDR(idrBalance)}</Text>
            )}
            {error && !loading && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === 'DEPOSIT' && styles.modeButtonDepositActive,
                ]}
                onPress={() => setMode('DEPOSIT')}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === 'DEPOSIT' && styles.modeButtonTextActiveOnDark,
                  ]}
                >
                  Deposit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === 'WITHDRAW' && styles.modeButtonWithdrawActive,
                ]}
                onPress={() => setMode('WITHDRAW')}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === 'WITHDRAW' && styles.modeButtonTextActiveOnLight,
                  ]}
                >
                  Withdraw
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Active form (only ONE method at a time) */}
          <View style={styles.card}>
            <Text style={styles.label}>
              {mode === 'DEPOSIT'
                ? 'Deposit amount (IDR)'
                : 'Withdraw amount (IDR)'}
            </Text>
            <TextInput
              placeholder="1000000"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={primaryAmount}
              onChangeText={(text) => setPrimaryAmount(formatIdrInput(text))}
              style={styles.input}
            />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                mode === 'DEPOSIT'
                  ? styles.primaryButtonDeposit
                  : styles.primaryButtonWithdraw,
                submitting && { opacity: 0.7 },
              ]}
              onPress={onPrimaryPress}
              disabled={submitting}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  mode === 'DEPOSIT'
                    ? styles.primaryButtonTextDark
                    : styles.primaryButtonTextLight,
                ]}
              >
                {mode === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}
              </Text>
            </TouchableOpacity>

            {mode === 'WITHDRAW' && (
              <Text style={styles.note}>
                Withdrawals cannot take your balance below 0.
              </Text>
            )}
          </View>

          {/* Transaction history */}
          <View style={styles.card}>
            <Text style={styles.label}>Transaction history</Text>
            {transactions.length === 0 && !loading ? (
              <Text style={styles.emptyText}>
                No balance changes yet.
              </Text>
            ) : (
              transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Themed modal dialog */}
      <Modal
        transparent
        animationType="fade"
        visible={dialogVisible}
        onRequestClose={() => setDialogVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{dialogTitle}</Text>
            <Text style={styles.modalMessage}>{dialogMessage}</Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                dialogVariant === 'error'
                  ? styles.modalButtonError
                  : styles.modalButtonPrimary,
              ]}
              onPress={() => setDialogVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function TransactionRow({ tx }: { tx: BalanceTransaction }) {
  const isDeposit = tx.type === 'DEPOSIT';
  const color = isDeposit ? POSITIVE : NEGATIVE;
  const sign = isDeposit ? '+' : '-';

  const amountNum = Number(tx.amount) || 0;
  const balanceAfterNum = Number(tx.balance_after) || 0;
  const created = new Date(tx.created_at);

  return (
    <View style={styles.txRow}>
      <View style={{ flexShrink: 1, paddingRight: 8 }}>
        <Text style={styles.txType}>{isDeposit ? 'Deposit' : 'Withdraw'}</Text>
        <Text style={styles.txDate}>
          {created.toLocaleString('id-ID')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
        <Text style={[styles.txAmount, { color }]}>
          {sign}
          {formatIDR(amountNum)}
        </Text>
        <Text style={styles.txBalance}>
          Balance: {formatIDR(balanceAfterNum)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
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
  value: {
    color: TEXT_MAIN,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  centerRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: NEGATIVE,
    fontSize: 12,
    marginTop: 4,
  },
  modeRow: {
    flexDirection: 'row',
    marginTop: 12,
    columnGap: 8,
  },
  modeButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modeButtonDepositActive: {
    backgroundColor: POSITIVE,
    borderColor: POSITIVE,
  },
  modeButtonWithdrawActive: {
    backgroundColor: NEGATIVE,
    borderColor: NEGATIVE,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  modeButtonTextActiveOnDark: {
    color: '#0b1120', // dark text on green
  },
  modeButtonTextActiveOnLight: {
    color: '#f9fafb', // light text on red
  },
  input: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: TEXT_MAIN,
    fontSize: 14,
    backgroundColor: '#020617',
  },
  primaryButton: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonDeposit: {
    backgroundColor: POSITIVE,
  },
  primaryButtonWithdraw: {
    backgroundColor: NEGATIVE,
  },
  primaryButtonText: {
    fontWeight: '600',
  },
  primaryButtonTextDark: {
    color: '#0b1120',
  },
  primaryButtonTextLight: {
    color: '#f9fafb',
  },
  note: {
    marginTop: 8,
    color: TEXT_MUTED,
    fontSize: 11,
  },
  emptyText: {
    marginTop: 8,
    color: TEXT_MUTED,
    fontSize: 12,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#111827',
    marginTop: 4,
  },
  txType: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  txBalance: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
    flexShrink: 1,
    textAlign: 'right',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    maxWidth: 360,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  modalTitle: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalMessage: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginBottom: 14,
  },
  modalButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  modalButtonPrimary: {
    backgroundColor: '#4F46E5',
  },
  modalButtonError: {
    backgroundColor: NEGATIVE,
  },
  modalButtonText: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '600',
  },
});
