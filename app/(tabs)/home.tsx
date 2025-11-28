// app/(tabs)/home.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';

const BACKGROUND = '#020617';
const TEXT_MAIN = '#E5E7EB';
const TEXT_MUTED = '#9CA3AF';
const CARD = '#0F172A';
const POSITIVE = '#22C55E';
const NEGATIVE = '#EF4444';

// Same backend base URL as in app/index.tsx
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.2.57:3000';

type Coin = {
  id?: number;
  name: string;
  symbol: string;
  cmc_rank: number;
  quote: {
    IDR: {
      price: number | string;
      percent_change_24h: number | string | null;
      market_cap: number | string;
    };
  };
};

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

// small helper to generate a simple sparkline-style bar graph
const buildSparklineHeights = (coin: Coin, points = 20): number[] => {
  const rawChange = coin.quote.IDR.percent_change_24h;
  const changeNum = Number(rawChange ?? 0);
  const variance = Math.max(Math.min(changeNum, 20), -20); // clamp

  const values: number[] = [];
  for (let i = 0; i < points; i++) {
    const noise =
      Math.sin(i / 2) * variance * 0.7 + Math.random() * variance * 0.3;
    const baseHeight = 30 + noise; // px
    values.push(Math.max(8, Math.min(70, baseHeight)));
  }
  return values;
};

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DashboardScreen() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const fetchCoins = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/crypto/top?limit=200`);
      const json = await res.json();

      if (!res.ok) {
        const message =
          (json && json.message) || 'Failed to load crypto data.';
        throw new Error(message);
      }

      const list: Coin[] = json.data || [];
      setCoins(list);
      setLastUpdated(json.last_updated || null);
    } catch (err: any) {
      console.error('Error fetching coins', err);
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCoins({ silent: true });
  };

  const handleManualRefresh = async () => {
    try {
      setManualRefreshing(true);
      const res = await fetch(`${API_BASE_URL}/crypto/refresh`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          (json && json.message) || 'Failed to refresh prices.';
        throw new Error(message);
      }
      await fetchCoins({ silent: true });
    } catch (err: any) {
      console.error('Manual refresh error', err);
      Alert.alert('Error', err?.message || 'Failed to refresh prices.');
    } finally {
      setManualRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCoins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCoins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coins;
    return coins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(q) ||
        coin.symbol.toLowerCase().includes(q),
    );
  }, [coins, search]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Crypto dashboard</Text>
          <Text style={styles.subtitle}>Live prices in IDR</Text>
          {lastUpdated && (
            <Text style={styles.lastUpdated}>
              Last update{' '}
              {new Date(lastUpdated).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <TouchableOpacity
            style={[styles.refreshButton, manualRefreshing && { opacity: 0.7 }]}
            onPress={handleManualRefresh}
            disabled={manualRefreshing}
          >
            <View style={styles.headerButtonInner}>
              <IconSymbol
                size={16}
                name="arrow.clockwise"
                color={TEXT_MAIN}
              />
              <Text style={styles.refreshText}>
                {manualRefreshing ? 'Refreshing…' : 'Refresh'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchCard}>
        <TextInput
          placeholder="Search by name or symbol (e.g. BTC, Ethereum)"
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <Text style={styles.searchHint}>
          Pull to refresh · Tap a coin to see chart & details.
        </Text>
      </View>

      {/* Loading / error / list */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.loadingText}>Loading markets…</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchCoins()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={filteredCoins}
          keyExtractor={(item, index) =>
            (item.id ?? item.cmc_rank ?? index).toString()
          }
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <CoinRow
              coin={item}
              isExpanded={expandedSymbol === item.symbol}
              onToggle={() => {
                LayoutAnimation.configureNext({
                  duration: 220,
                  update: { type: LayoutAnimation.Types.easeInEaseOut },
                  delete: {
                    type: LayoutAnimation.Types.easeInEaseOut,
                    property: LayoutAnimation.Properties.opacity,
                  },
                  create: {
                    type: LayoutAnimation.Types.easeInEaseOut,
                    property: LayoutAnimation.Properties.opacity,
                  },
                });
                setExpandedSymbol((prev) =>
                  prev === item.symbol ? null : item.symbol,
                );
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function CoinRow({
  coin,
  isExpanded,
  onToggle,
}: {
  coin: Coin;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const price = Number(coin.quote.IDR.price || 0);
  const change = Number(coin.quote.IDR.percent_change_24h || 0);
  const marketCap = Number(coin.quote.IDR.market_cap || 0);

  const isUp = change >= 0;
  const changeColor = isUp ? POSITIVE : NEGATIVE;
  const changePrefix = isUp ? '+' : '';

  const marketCapTrillions = marketCap / 1_000_000_000_000;

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.row, isExpanded && styles.rowSelected]}>
        <View style={styles.leftCol}>
          <Text style={styles.rank}>#{coin.cmc_rank}</Text>
          <View>
            <Text style={styles.name}>{coin.name}</Text>
            <Text style={styles.symbol}>{coin.symbol}</Text>
          </View>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.price}>{formatIDR(price)}</Text>
          <Text style={[styles.change, { color: changeColor }]}>
            {changePrefix}
            {change.toFixed(2)}%
          </Text>
          <Text style={styles.marketCap}>
            MCap: {marketCapTrillions.toFixed(2)} T IDR
          </Text>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.rowGraphCard}>
          <Text style={styles.rowGraphTitle}>
            {coin.name} ({coin.symbol}) · 24h mock trend
          </Text>
          <View style={styles.graphRow}>
            {buildSparklineHeights(coin).map((h, idx) => (
              <View key={idx} style={[styles.graphBar, { height: h }]} />
            ))}
          </View>
          <Text style={styles.rowGraphSubtitle}>
            Current price {formatIDR(price)} · 24h {change.toFixed(2)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    color: TEXT_MAIN,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginTop: 4,
  },
  lastUpdated: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4B5563',
    marginBottom: 6,
  },
  refreshText: {
    color: TEXT_MAIN,
    fontSize: 12,
    fontWeight: '500',
  },
  searchCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    color: TEXT_MAIN,
    fontSize: 14,
    paddingVertical: 4,
  },
  searchHint: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 4,
  },
  graphCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  graphTitle: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  graphRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: 8,
  },
  graphBar: {
    width: 6,
    borderRadius: 999,
    marginRight: 3,
    backgroundColor: '#4F46E5',
  },
  graphSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  center: {
    alignItems: 'center',
    marginTop: 24,
  },
  loadingText: {
    color: TEXT_MUTED,
    marginTop: 8,
  },
  errorText: {
    color: NEGATIVE,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  retryText: {
    color: TEXT_MAIN,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#111827',
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowSelected: {
    backgroundColor: '#020617',
    borderRadius: 10,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  rank: {
    color: TEXT_MUTED,
    fontSize: 12,
    width: 32,
  },
  name: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '500',
  },
  symbol: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  price: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '600',
  },
  change: {
    fontSize: 12,
    marginTop: 2,
  },
  marketCap: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  headerButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  rowGraphCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  rowGraphTitle: {
    color: TEXT_MAIN,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  rowGraphSubtitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 4,
    flexWrap: 'wrap',
  },
});
