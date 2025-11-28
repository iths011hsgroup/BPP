// app/(tabs)/portfolio.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
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

type PnlMode = 'NET' | 'BROKER';

type PositionRow = {
  symbol: string;
  amount: number;
  current_price_idr: number;
  current_value_idr: number;

  total_buy_idr: number;
  total_sell_idr: number;

  // Your logic
  net_invested_idr: number;
  net_pnl_idr: number;
  net_pnl_percent: number;
  net_avg_entry_price_idr: number | null;

  // Broker logic
  broker_cost_basis_idr: number;
  broker_avg_entry_price_idr: number | null;
  broker_realized_pnl_idr: number;
  broker_unrealized_pnl_idr: number;
  broker_unrealized_pnl_percent: number;
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

export default function PortfolioScreen() {
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [pnlMode, setPnlMode] = useState<PnlMode>('NET'); // toggle between styles

  const loadPositions = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/portfolio/positions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load portfolio.');
      }

      setPositions(json.positions || []);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPositions({ silent: true });
  };

  // Totals depend on mode:
  // - NET: net_invested vs net_pnl
  // - BROKER: cost_basis vs unrealized PnL
  const totals = useMemo(() => {
  let totalValue = 0;
  let base = 0; // total buys (NET) or cost basis (BROKER)
  let pnlValue = 0;
  let realizedTotal = 0;

  positions.forEach((p) => {
    totalValue += Number(p.current_value_idr) || 0;

    if (pnlMode === 'NET') {
      base += Number(p.total_buy_idr) || 0;            // lifetime cost
      pnlValue += Number(p.net_pnl_idr) || 0;          // lifetime PnL
    } else {
      base += Number(p.broker_cost_basis_idr) || 0;    // open cost basis
      pnlValue += Number(p.broker_unrealized_pnl_idr) || 0;
      realizedTotal += Number(p.broker_realized_pnl_idr) || 0;
    }
  });

  const pnlPercent = base > 0 ? (pnlValue / base) * 100 : 0;

  return { totalValue, base, pnlValue, pnlPercent, realizedTotal };
}, [positions, pnlMode]);


  const totalColor =
    totals.pnlValue > 0 ? POSITIVE : totals.pnlValue < 0 ? NEGATIVE : TEXT_MUTED;

  const baseLabel =
    pnlMode === 'NET'
        ? 'Total cost (lifetime)'
        : 'Cost basis (open positions)';

    const pnlLabel =
    pnlMode === 'NET'
        ? 'P&L (lifetime, all trades)'
        : 'Unrealized P&L (open positions)';

  return (
    <View style={styles.container}>
      {/* Header with mode toggle on the right */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Portfolio</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              pnlMode === 'NET' && styles.modeButtonActive,
            ]}
            onPress={() => setPnlMode('NET')}
          >
            <Text
              style={[
                styles.modeButtonText,
                pnlMode === 'NET' && styles.modeButtonTextActive,
              ]}
            >
              Net
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              pnlMode === 'BROKER' && styles.modeButtonActive,
            ]}
            onPress={() => setPnlMode('BROKER')}
          >
            <Text
              style={[
                styles.modeButtonText,
                pnlMode === 'BROKER' && styles.modeButtonTextActive,
              ]}
            >
              Broker
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total value</Text>
        <Text style={styles.summaryValue}>
          {formatIDR(totals.totalValue)}
        </Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summarySubLabel}>{baseLabel}</Text>
          <Text style={styles.summarySubValue}>
            {formatIDR(totals.base)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summarySubLabel}>{pnlLabel}</Text>
          <Text style={[styles.summarySubValue, { color: totalColor }]}>
            {totals.pnlValue >= 0 ? '+' : ''}
            {formatIDR(totals.pnlValue)}{' '}
            <Text style={styles.summaryPercent}>
              ({totals.pnlPercent >= 0 ? '+' : ''}
              {totals.pnlPercent.toFixed(2)}%)
            </Text>
          </Text>
        </View>

        {pnlMode === 'BROKER' && (
          <View style={styles.summaryRow}>
            <Text style={styles.summarySubLabel}>Realized P&L (all time)</Text>
            <Text
              style={[
                styles.summarySubValue,
                {
                  color:
                    totals.realizedTotal > 0
                      ? POSITIVE
                      : totals.realizedTotal < 0
                      ? NEGATIVE
                      : TEXT_MUTED,
                },
              ]}
            >
              {totals.realizedTotal >= 0 ? '+' : ''}
              {formatIDR(totals.realizedTotal)}
            </Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadPositions()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={positions}
          keyExtractor={(item) => item.symbol}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={
            positions.length === 0 ? styles.emptyContainer : undefined
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              You don&apos;t have any crypto holdings yet.
            </Text>
          }
          renderItem={({ item }) => (
            <PositionRowItem
              position={item}
              expanded={expandedSymbol === item.symbol}
              onToggle={() =>
                setExpandedSymbol((prev) =>
                  prev === item.symbol ? null : item.symbol
                )
              }
              pnlMode={pnlMode}
            />
          )}
        />
      )}
    </View>
  );
}

function PositionRowItem({
  position,
  expanded,
  onToggle,
  pnlMode,
}: {
  position: PositionRow;
  expanded: boolean;
  onToggle: () => void;
  pnlMode: PnlMode;
}) {
  const {
    symbol,
    amount,
    current_price_idr,
    current_value_idr,
    total_buy_idr,
    total_sell_idr,
    net_invested_idr,
    net_pnl_idr,
    net_pnl_percent,
    net_avg_entry_price_idr,
    broker_cost_basis_idr,
    broker_avg_entry_price_idr,
    broker_realized_pnl_idr,
    broker_unrealized_pnl_idr,
    broker_unrealized_pnl_percent,
  } = position;

  const isNet = pnlMode === 'NET';

  const mainPnlValue = isNet ? net_pnl_idr : broker_unrealized_pnl_idr;
  const mainPnlPercent = isNet
    ? net_pnl_percent
    : broker_unrealized_pnl_percent;

  const pnlColor =
    mainPnlValue > 0 ? POSITIVE : mainPnlValue < 0 ? NEGATIVE : TEXT_MUTED;
  const sign = mainPnlValue >= 0 ? '+' : '';

  const avgEntry = isNet
    ? net_avg_entry_price_idr
    : broker_avg_entry_price_idr;

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
      <View style={styles.rowCard}>
        {/* Header row */}
        <View>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.amountText}>
            {amount.toFixed(8)} {symbol}
          </Text>
          <Text style={styles.priceLine}>
            Now {formatIDR(current_price_idr)}
          </Text>
        </View>
        <View style={styles.rowHeaderRight}>
          <Text style={[styles.pnlPercent, { color: pnlColor }]}>
            {sign}
            {mainPnlPercent.toFixed(2)}%
          </Text>
          {avgEntry !== null && (
            <Text style={styles.avgEntry}>
              Avg entry ({isNet ? 'Net' : 'Broker'}):{' '}
              {formatIDR(avgEntry)}
            </Text>
          )}
          <Text style={styles.dropdownIcon}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </View>

      {/* Dropdown detail */}
      {expanded && (
        <View style={styles.detailCard}>
          <Text style={styles.detailLine}>
            Current value: {formatIDR(current_value_idr)}
          </Text>

          {isNet ? (
            <>
              <Text style={styles.detailLine}>
                Total buys: {formatIDR(total_buy_idr)}
              </Text>
              <Text style={styles.detailLine}>
                Total sells: {formatIDR(total_sell_idr)}
              </Text>
              <Text style={styles.detailLine}>
                Net invested: {formatIDR(net_invested_idr)}
              </Text>
              <Text style={[styles.detailLine, { color: pnlColor }]}>
                P&amp;L (net): {sign}
                {formatIDR(Math.abs(net_pnl_idr))} ({sign}
                {net_pnl_percent.toFixed(2)}%)
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.detailLine}>
                Cost basis (open): {formatIDR(broker_cost_basis_idr)}
              </Text>
              <Text style={styles.detailLine}>
                Realized P&amp;L: {broker_realized_pnl_idr >= 0 ? '+' : '-'}
                {formatIDR(Math.abs(broker_realized_pnl_idr))}
              </Text>
              <Text style={[styles.detailLine, { color: pnlColor }]}>
                Unrealized P&amp;L: {sign}
                {formatIDR(Math.abs(broker_unrealized_pnl_idr))} ({sign}
                {broker_unrealized_pnl_percent.toFixed(2)}%)
              </Text>
            </>
          )}
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
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: TEXT_MAIN,
    fontSize: 24,
    fontWeight: '700',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 999,
    padding: 2,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modeButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
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
  summaryCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryLabel: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  summaryValue: {
    color: TEXT_MAIN,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summarySubLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    flexShrink: 1,
    paddingRight: 8,
  },
  summarySubValue: {
    color: TEXT_MAIN,
    fontSize: 13,
    textAlign: 'right',
    flexShrink: 1,
  },
  summaryPercent: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  center: {
    alignItems: 'center',
    marginTop: 24,
  },
  errorText: {
    color: NEGATIVE,
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
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
    fontSize: 13,
  },
  emptyContainer: {
    paddingTop: 32,
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
  },
  rowCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowHeaderRight: {
    alignItems: 'flex-end',
    maxWidth: '55%',   // allow wrapping in right column
  },
  symbol: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '600',
  },
  amountText: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  priceLine: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  pnlPercent: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  avgEntry: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
    flexShrink: 1,
  },
  dropdownIcon: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
  },
  detailLine: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
    flexWrap: 'wrap',
  },
});
