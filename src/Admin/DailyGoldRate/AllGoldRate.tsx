import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';

export type GoldRate = {
  metal_type: string;
  purity: string;
  rate_per_gram?: number | string;
  rate_per_unit?: number | string;
  rate_unit?: string;
};

export type CurrentRateSet = {
  rates: GoldRate[];
  rate_date?: string;
  effective_from?: string;
  updated_at?: string;
  updated_by_name?: string;
  updated_by?: string | number;
  making_charge_type?: string;
  making_charge_value?: number | string;
  wastage_percentage?: number | string;
};

type Props = {
  onBack: () => void;
  onAddRate: () => void;
  onEditRate: (rateSet: CurrentRateSet) => void;
};

const METAL_ORDER = ['Gold', 'Silver', 'Platinum', 'Diamond'];
const GOLD_PURITY_LABELS: Record<string, string> = {
  '999': '24K (999)',
  '24K': '24K (999)',
  '916': '22K (916)',
  '22K': '22K (916)',
  '833': '20K (833)',
  '20K': '20K (833)',
  '750': '18K (750)',
  '18K': '18K (750)',
  '585': '14K (585)',
  '14K': '14K (585)',
};
const GOLD_PURITY_CODES: Record<string, string> = {
  '24K': '999',
  '22K': '916',
  '20K': '833',
  '18K': '750',
  '14K': '585',
};
const GOLD_PURITY_ORDER = ['999', '916', '833', '750', '585'];

const normalizeGoldPurity = (purity: string) => {
  const normalized = purity.trim().toUpperCase().replace(/\s+/g, '');
  return GOLD_PURITY_CODES[normalized] ?? normalized;
};

const getRateLabel = (rate: GoldRate) => {
  if (rate.metal_type.toLowerCase() !== 'gold') return rate.purity;
  const purity = rate.purity.trim().toUpperCase().replace(/\s+/g, '');
  return GOLD_PURITY_LABELS[purity] ?? rate.purity;
};

const compareGoldPurity = (first: GoldRate, second: GoldRate) => {
  const firstIndex = GOLD_PURITY_ORDER.indexOf(normalizeGoldPurity(first.purity));
  const secondIndex = GOLD_PURITY_ORDER.indexOf(normalizeGoldPurity(second.purity));
  if (firstIndex === -1 || secondIndex === -1) return 0;
  return firstIndex - secondIndex;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const formatAmount = (value?: number | string) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : 'Not set';
};

function AllGoldRate({ onBack, onAddRate, onEditRate }: Props) {
  const [current, setCurrent] = useState<CurrentRateSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const addButtonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(addButtonPulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(addButtonPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [addButtonPulse]);

  const fetchCurrentRates = useCallback(async (refresh = false) => {
    setLoadError('');
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data } = await api.get<CurrentRateSet>('/gold-rates/current');
      if (!Array.isArray(data?.rates)) {
        throw new Error('The server returned an invalid gold rate set.');
      }
      setCurrent({
        ...data,
        rates: data.rates.filter(
          rate => typeof rate?.metal_type === 'string' && typeof rate?.purity === 'string',
        ),
      });
    } catch (error) {
      console.error('Error fetching daily gold rates:', error);
      setLoadError(getErrorMessage(error, 'Could not load today’s rates.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentRates();
  }, [fetchCurrentRates]);

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
        <Pressable
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-extrabold tracking-wide text-white">
            Daily Gold Rates
          </Text>
          <Text className="text-[10px] font-medium text-emerald-200">
            Sri Golds Jewellery
          </Text>
        </View>
      </View>

      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pb-28 pt-5"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                fetchCurrentRates(true);
              }}
              tintColor="#004D40"
            />
          }
        >
          <View className="rounded-2xl bg-primary p-5 shadow-sm">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Today’s applied rate set
                </Text>
                <Text className="mt-2 text-xl font-extrabold text-white">
                  {current ? formatDate(current.rate_date) : 'Precious Metal Rates'}
                </Text>
                {current?.effective_from ? (
                  <Text className="mt-1 text-xs text-emerald-100">
                    Effective {new Date(current.effective_from).toLocaleString()}
                  </Text>
                ) : null}
                {current?.updated_by_name || current?.updated_by ? (
                  <Text className="mt-1 text-xs text-emerald-100">
                    Updated by {current.updated_by_name || `Admin ${current.updated_by}`}
                    {current.updated_at ? ` · ${new Date(current.updated_at).toLocaleString()}` : ''}
                  </Text>
                ) : null}
              </View>
              {current && !isLoading ? (
                <Pressable
                  className="flex-row items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 active:bg-white/20"
                  onPress={() => onEditRate(current)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit current rate set"
                >
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="m16 4 4 4M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"
                      stroke="#FFFFFF"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text className="text-xs font-bold text-white">Edit</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#004D40" />
              <Text className="mt-3 text-sm text-slate-500">Loading today’s rates…</Text>
            </View>
          ) : loadError ? (
            <View className="items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-7">
              <Text className="text-center text-sm font-semibold text-red-700">{loadError}</Text>
              <Pressable
                className="mt-4 rounded-xl bg-primary px-5 py-3"
                onPress={() => {
                  fetchCurrentRates();
                }}
                accessibilityRole="button"
              >
                <Text className="font-bold text-white">Try Again</Text>
              </Pressable>
            </View>
          ) : current?.rates.length ? (
            <>
              {METAL_ORDER.map(metal => {
                const metalRates = current.rates
                  .filter(rate => rate.metal_type.toLowerCase() === metal.toLowerCase())
                  .sort(metal.toLowerCase() === 'gold' ? compareGoldPurity : () => 0);
                if (!metalRates.length) return null;
                return (
                  <View
                    key={metal}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs"
                  >
                    <View className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <Text className="text-base font-extrabold text-slate-900">{metal}</Text>
                    </View>
                    {metalRates.map((rate, index) => (
                      <View
                        key={`${rate.metal_type}-${rate.purity}-${rate.rate_unit ?? ''}`}
                        className={`flex-row items-center justify-between px-4 py-3 ${
                          index > 0 ? 'border-t border-slate-100' : ''
                        }`}
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-sm font-bold text-slate-800">
                            {getRateLabel(rate)}
                          </Text>
                          <Text className="mt-0.5 text-xs text-slate-500">
                            per {rate.rate_unit === 'carat' ? 'carat' : 'gram'}
                          </Text>
                        </View>
                        <Text className="text-base font-extrabold text-primary-dark">
                          {formatAmount(rate.rate_per_unit ?? rate.rate_per_gram)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}

              <View className="rounded-2xl border border-slate-200 bg-surface p-4">
                <Text className="mb-3 text-sm font-extrabold text-slate-900">
                  Making & wastage charges
                </Text>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-600">Making charge</Text>
                  <Text className="text-sm font-bold text-slate-900">
                    {current.making_charge_type === 'Percentage'
                      ? `${Number(current.making_charge_value ?? 0).toLocaleString('en-IN')}%`
                      : formatAmount(current.making_charge_value)}
                  </Text>
                </View>
                <View className="mt-3 flex-row justify-between border-t border-slate-100 pt-3">
                  <Text className="text-sm text-slate-600">Wastage</Text>
                  <Text className="text-sm font-bold text-slate-900">
                    {Number(current.wastage_percentage ?? 0).toLocaleString('en-IN')}%
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View className="items-center rounded-2xl border border-slate-200 bg-surface px-5 py-10">
              <Text className="text-base font-bold text-slate-800">No rates configured</Text>
              <Text className="mt-2 text-center text-sm text-slate-500">
                Add today’s rate set to display metal and diamond prices here.
              </Text>
            </View>
          )}
        </ScrollView>

        <View className="absolute bottom-5 right-5 items-end">
          <View className="h-14 w-14 items-center justify-center">
            <Animated.View
              pointerEvents="none"
              className="absolute h-14 w-14 rounded-full bg-accent"
              style={{
                opacity: addButtonPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0],
                }),
                transform: [
                  {
                    scale: addButtonPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.22],
                    }),
                  },
                ],
              }}
            />
            <Pressable
              className="h-14 w-14 items-center justify-center rounded-full border-2 border-accent-light bg-primary shadow-lg"
              onPress={onAddRate}
              accessibilityRole="button"
              accessibilityLabel="Add daily gold rates"
            >
              <Text className="text-2xl font-bold text-white">+</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default AllGoldRate;