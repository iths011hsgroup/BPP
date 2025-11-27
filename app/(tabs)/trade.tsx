// app/(tabs)/trade.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
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

const BACKGROUND = '#020617';
const TEXT_MAIN = '#E5E7EB';
const TEXT_MUTED = '#9CA3AF';
const CARD = '#0F172A';
const POSITIVE = '#22C55E';
const NEGATIVE = '#EF4444';

const API_BASE_URL = 'http://192.168.2.57:3000';

type BalanceRow = {
  currency: string;
  balance: number;
};

type HoldingRow = {
  symbol: string;
  amount: number;
};

type TradeRow = {
  id: number;
  symbol: 'BUY' | 'SELL' | string;
  side: 'BUY' | 'SELL';
  amount: number | string;
  price_idr: number | string;
  notional_idr: number | string;
  created_at: string;
};

type CoinOption = {
  symbol: string;
  name: string;
  priceIdr: number;
};

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

// For decimal input (coin amount) – allow digits and '.', format integer part
const formatDecimalInput = (text: string): string => {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned) return '';

  const [intPart, fracPart] = cleaned.split('.');
  const intNum = intPart ? Number(intPart) : 0;
  const formattedInt =
    intPart && !Number.isNaN(intNum)
      ? intNum.toLocaleString('en-US') // comma thousands, dot decimal
      : '';

  if (fracPart !== undefined) {
    return `${formattedInt}.${fracPart}`;
  }
  return formattedInt;
};

export default function TradeScreen() {
  const [loading, setLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);

  // Trade form state
  const [symbol, setSymbol] = useState('');
  const [spendIdr, setSpendIdr] = useState('');
  const [buyAmountCoin, setBuyAmountCoin] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [buyMode, setBuyMode] = useState<'IDR' | 'COIN'>('IDR');

  // Symbol dropdown state
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [availableCoins, setAvailableCoins] = useState<CoinOption[]>([]);

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

  const idrBalance =
    balances.find((b) => b.currency === 'IDR')?.balance ?? 0;

  const loadPortfolio = async () => {
    setLoading(true);
    setPortfolioError(null);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setPortfolioError('Not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/portfolio`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load portfolio.');
      }

      setBalances(json.balances || []);
      setHoldings(json.holdings || []);
    } catch (err: any) {
      setPortfolioError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const loadTrades = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.warn('No token, cannot load trades');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/trades`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load trades.');
      }
      setTrades(json.trades || []);
    } catch (err) {
      console.error('Error loading trades', err);
    }
  };

  const loadSymbols = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/crypto/top?limit=200`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load coins.');
      }
      const list = (json.data || []) as any[];
      const opts: CoinOption[] = list.map((c) => ({
        symbol: c.symbol,
        name: c.name,
        priceIdr: Number(c.quote?.IDR?.price ?? 0),
      }));
      setAvailableCoins(opts);
    } catch (err) {
      console.error('Error loading coin options', err);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadPortfolio(), loadTrades(), loadSymbols()]);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredCoinOptions = useMemo(() => {
    const q = symbolSearch.trim().toLowerCase();
    if (!q) return availableCoins;
    return availableCoins.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    );
  }, [availableCoins, symbolSearch]);

  const selectedCoinInfo = useMemo(
    () => availableCoins.find((c) => c.symbol === symbol),
    [availableCoins, symbol],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleBuy = async () => {
    const s = symbol.trim().toUpperCase();
    let payload: any = null;

    if (buyMode === 'IDR') {
      const cleaned = spendIdr.replace(/[^\d]/g, '');
      const spend = Number(cleaned);

      if (!s || !spend || spend <= 0) {
        showDialog(
          'Invalid input',
          'Select a symbol and enter amount in IDR to spend.',
          'error',
        );
        return;
      }

      payload = { symbol: s, spend_idr: spend };
    } else {
      const cleaned = buyAmountCoin.replace(/[^0-9.]/g, '');
      const amount = Number(cleaned);

      if (!s || !amount || amount <= 0) {
        showDialog(
          'Invalid input',
          'Select a symbol and enter amount of coin to buy.',
          'error',
        );
        return;
      }

      payload = { symbol: s, amount_coin: amount };
    }

    setTradeLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showDialog('Not authenticated', 'Please log in again.', 'error');
        setTradeLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/trade/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || 'Failed to buy.');
      }

      showDialog(
        'Trade executed',
        `Bought ${json.amount_coin.toFixed(8)} ${json.symbol} at ${formatIDR(
          json.price_idr,
        )}`,
        'success',
      );

      // Clear both inputs
      setSpendIdr('');
      setBuyAmountCoin('');
      await loadAll();
    } catch (err: any) {
      showDialog('Error', err?.message || 'Something went wrong.', 'error');
    } finally {
      setTradeLoading(false);
    }
  };

  const handleSell = async () => {
    const s = symbol.trim().toUpperCase();
    const cleaned = sellAmount
      .replace(/,/g, '') // remove thousands separators
      .replace(/[^0-9.]/g, '');
    const amount = Number(cleaned);

    if (!s || !amount || amount <= 0) {
      showDialog(
        'Invalid input',
        'Select a symbol and enter amount of coin to sell.',
        'error',
      );
      return;
    }

    setTradeLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showDialog('Not authenticated', 'Please log in again.', 'error');
        setTradeLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/trade/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbol: s, amount_coin: amount }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || 'Failed to sell.');
      }

      showDialog(
        'Trade executed',
        `Sold ${json.amount_coin.toFixed(8)} ${json.symbol} at ${formatIDR(
          json.price_idr,
        )}`,
        'success',
      );
      setSellAmount('');
      await loadAll();
    } catch (err: any) {
      showDialog('Error', err?.message || 'Something went wrong.', 'error');
    } finally {
      setTradeLoading(false);
    }
  };

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym.toUpperCase());
    setSymbolPickerOpen(false);
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
          <Text style={styles.title}>Trade</Text>

          {/* Balance */}
          <View style={styles.card}>
            <Text style={styles.label}>IDR balance</Text>
            <Text style={styles.value}>{formatIDR(idrBalance)}</Text>
          </View>

          {loading && (
            <View style={styles.center}>
              <ActivityIndicator color="#ffffff" />
            </View>
          )}

          {portfolioError && !loading && (
            <Text style={styles.errorText}>{portfolioError}</Text>
          )}

          {/* Holdings summary */}
          {!loading && !portfolioError && holdings.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.label}>Holdings</Text>
              {holdings.map((h) => (
                <Text key={h.symbol} style={styles.holdingLine}>
                  {h.symbol}: {h.amount}
                </Text>
              ))}
            </View>
          )}

          {/* Trade form */}
          <View style={styles.card}>
            <Text style={styles.label}>Symbol</Text>

            {/* Symbol dropdown */}
            <TouchableOpacity
              style={styles.symbolSelector}
              onPress={() => setSymbolPickerOpen((open) => !open)}
            >
              <Text style={styles.symbolSelectorText}>
                {symbol ? symbol : 'Select a coin'}
              </Text>
            </TouchableOpacity>

            {selectedCoinInfo && (
              <Text style={styles.currentPrice}>
                Current price: {formatIDR(selectedCoinInfo.priceIdr)}
              </Text>
            )}

            {symbolPickerOpen && (
              <View style={styles.dropdown}>
                <TextInput
                  placeholder="Search coin (e.g. BTC, ETH)"
                  placeholderTextColor="#6B7280"
                  value={symbolSearch}
                  onChangeText={setSymbolSearch}
                  style={styles.dropdownSearch}
                  autoCapitalize="none"
                />
                <ScrollView
                  style={styles.dropdownList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {filteredCoinOptions.map((item) => (
                    <TouchableOpacity
                      key={item.symbol}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectSymbol(item.symbol)}
                    >
                      <Text style={styles.dropdownSymbol}>{item.symbol}</Text>
                      <Text style={styles.dropdownName}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Buy mode toggle */}
            <View style={styles.buyModeRow}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  buyMode === 'IDR' && styles.modeButtonActive,
                ]}
                onPress={() => setBuyMode('IDR')}
                disabled={tradeLoading}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    buyMode === 'IDR' && styles.modeButtonTextActive,
                  ]}
                >
                  By IDR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  buyMode === 'COIN' && styles.modeButtonActive,
                ]}
                onPress={() => setBuyMode('COIN')}
                disabled={tradeLoading}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    buyMode === 'COIN' && styles.modeButtonTextActive,
                  ]}
                >
                  By coin amount
                </Text>
              </TouchableOpacity>
            </View>

            {buyMode === 'IDR' ? (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>
                  Buy: amount in IDR to spend
                </Text>
                <TextInput
                  placeholder="1000000"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={spendIdr}
                  onChangeText={(text) => setSpendIdr(formatIdrInput(text))}
                  style={styles.input}
                />
              </>
            ) : (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>
                  Buy: amount of coin to buy
                </Text>
                <TextInput
                  placeholder="0.01"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={buyAmountCoin}
                  onChangeText={(text) =>
                    setBuyAmountCoin(formatDecimalInput(text))
                  }
                  style={styles.input}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.buyButton, tradeLoading && { opacity: 0.7 }]}
              onPress={handleBuy}
              disabled={tradeLoading}
            >
              <Text style={styles.buyText}>Buy</Text>
            </TouchableOpacity>

            {/* Sell */}
            <Text style={[styles.label, { marginTop: 16 }]}>
              Sell: amount of coin to sell
            </Text>
            <TextInput
              placeholder="0.01"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={sellAmount}
              onChangeText={(text) =>
                setSellAmount(formatDecimalInput(text))
              }
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.sellButton, tradeLoading && { opacity: 0.7 }]}
              onPress={handleSell}
              disabled={tradeLoading}
            >
              <Text style={styles.sellText}>Sell</Text>
            </TouchableOpacity>
          </View>

          {/* Trade history */}
          {trades.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.label}>Recent trades</Text>
              {trades.map((t) => {
                const color = t.side === 'BUY' ? POSITIVE : NEGATIVE;
                const sign = t.side === 'BUY' ? '+' : '-';
                const date = new Date(t.created_at);

                const amountNum = Number(t.amount ?? 0);
                const priceNum = Number(t.price_idr ?? 0);
                const notionalNum = Number(t.notional_idr ?? 0);

                return (
                  <View key={t.id} style={styles.tradeRow}>
                    <View>
                      <Text style={styles.tradeSymbol}>
                        {t.symbol} · {t.side}
                      </Text>
                      <Text style={styles.tradeMeta}>
                        {date.toLocaleString('id-ID')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.tradeNotional, { color }]}>
                        {sign}
                        {formatIDR(notionalNum)}
                      </Text>
                      <Text style={styles.tradePrice}>
                        {amountNum.toFixed(8)} @ {formatIDR(priceNum)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  center: {
    alignItems: 'center',
    marginVertical: 16,
  },
  errorText: {
    color: NEGATIVE,
    fontSize: 13,
    marginBottom: 8,
  },
  holdingLine: {
    color: TEXT_MAIN,
    fontSize: 13,
    marginTop: 6,
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
  buyButton: {
    marginTop: 12,
    backgroundColor: POSITIVE,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buyText: {
    color: '#0b1120',
    fontWeight: '600',
  },
  sellButton: {
    marginTop: 8,
    backgroundColor: NEGATIVE,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sellText: {
    color: '#f9fafb',
    fontWeight: '600',
  },
  symbolSelector: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#020617',
  },
  symbolSelectorText: {
    color: TEXT_MAIN,
    fontSize: 14,
  },
  currentPrice: {
    marginTop: 4,
    color: TEXT_MUTED,
    fontSize: 12,
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    backgroundColor: BACKGROUND,
    maxHeight: 250,
  },
  dropdownSearch: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    color: TEXT_MAIN,
    fontSize: 14,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  dropdownSymbol: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '600',
    width: 60,
  },
  dropdownName: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#111827',
    marginTop: 4,
  },
  tradeSymbol: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '600',
  },
  tradeMeta: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  tradeNotional: {
    fontSize: 13,
    fontWeight: '600',
  },
  tradePrice: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  buyModeRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#020617',
    padding: 2,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#1F2937',
  },
  modeButtonText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: TEXT_MAIN,
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
