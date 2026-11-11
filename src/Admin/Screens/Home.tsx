import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import ProductCard from '../../Components/ProductCard';
import { getProductImageUrl } from '../../utils/productImage';
import type { AuthenticatedUser } from '../Auth/Login';
import type { AdminRoute } from '../Navigations/TopHeader';
import { getDashboardDateFilterParams } from './dashboardDateFilters';

type DashboardStat = {
  id?: string;
  label?: string;
  value?: string | number;
  trend?: string;
};

type DashboardRecord = Record<string, unknown>;

const isDashboardRecord = (value: unknown): value is DashboardRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getProductRecords = (data: unknown): DashboardRecord[] | null => {
  if (Array.isArray(data)) {
    return data.filter(isDashboardRecord);
  }
  if (isDashboardRecord(data) && Array.isArray(data.products)) {
    return data.products.filter(isDashboardRecord);
  }
  return null;
};

const getRecordProductId = (record: DashboardRecord): string | undefined => {
  const value = [record.id, record.product_id, record.productId, record._id].find(
    candidate => typeof candidate === 'string' || typeof candidate === 'number',
  );
  return value === undefined ? undefined : String(value);
};

const getMatchingProduct = (
  topProduct: DashboardRecord,
  products: DashboardRecord[],
): DashboardRecord | undefined => {
  const productId = getRecordProductId(topProduct);
  if (productId) {
    const match = products.find(product => getRecordProductId(product) === productId);
    if (match) {
      return match;
    }
  }

  const name = getDisplayName(
    topProduct,
    ['name', 'product_name', 'productName', 'title'],
    '',
  )
    .trim()
    .toLowerCase();
  return name
    ? products.find(product =>
        getDisplayName(product, ['name', 'product_name', 'productName', 'title'], '')
          .trim()
          .toLowerCase() === name,
      )
    : undefined;
};

const getMatchingLoanProduct = (
  loan: DashboardRecord,
  products: DashboardRecord[],
): DashboardRecord | undefined => {
  const jewellery = getDisplayName(
    loan,
    ['jewellery', 'jewelry', 'product_name', 'productName'],
    '',
  )
    .split('(')[0]
    .trim()
    .toLowerCase();
  if (!jewellery) {
    return undefined;
  }

  return products.find(product => {
    const name = getDisplayName(
      product,
      ['name', 'product_name', 'productName', 'title'],
      '',
    )
      .trim()
      .toLowerCase();
    return name && (name === jewellery || jewellery.includes(name) || name.includes(jewellery));
  });
};

const getLoanImageUrl = (
  loan: DashboardRecord,
  products: DashboardRecord[],
): string | undefined => {
  const directImage = getProductImageUrl(loan);
  if (directImage) {
    return directImage;
  }

  for (const key of ['product', 'jewellery', 'item', 'customer']) {
    const nestedRecord = loan[key];
    if (isDashboardRecord(nestedRecord)) {
      const nestedImage = getProductImageUrl(nestedRecord);
      if (nestedImage) {
        return nestedImage;
      }
    }
  }

  const matchingProduct = getMatchingLoanProduct(loan, products);
  return matchingProduct ? getProductImageUrl(matchingProduct) : undefined;
};

type DashboardResponse = {
  stats?: DashboardStat[];
  totalLoansCount?: number;
  loanStatusCounts?: Record<string, number>;
  revenueTrends?: DashboardRecord[];
  recentLoans?: DashboardRecord[];
  topProducts?: DashboardRecord[];
};

type HomeGoldRate = {
  metal_type: string;
  purity: string;
  rate_per_gram?: number | string;
  rate_per_unit?: number | string;
  rate_unit?: string;
};

type HomeGoldRateSet = {
  rates: HomeGoldRate[];
  rate_date?: string;
  effective_from?: string;
};

type HomeProps = {
  user: AuthenticatedUser;
  onNavigate?: (route: AdminRoute) => void;
  isActive?: boolean;
};

const STAT_CARDS = [
  { id: 'today_collection', fallbackLabel: "Today's Collection", icon: 'rupee', color: '#E6BF5A', backgroundColor: '#063D32' },
  { id: 'total_customers', fallbackLabel: 'Total Customers', icon: 'users', color: '#E6BF5A', backgroundColor: '#0A3768' },
  { id: 'active_gold_loans', fallbackLabel: 'Active Gold Loans', icon: 'gold', color: '#E6BF5A', backgroundColor: '#4B164E' },
  { id: 'gold_stock_value', fallbackLabel: 'Gold Stock Value', icon: 'gem', color: '#E6BF5A', backgroundColor: '#571E38' },
  { id: 'total_products', fallbackLabel: 'Total Products', icon: 'box', color: '#E6BF5A', backgroundColor: '#123E57' },
  { id: 'total_categories', fallbackLabel: 'Total Categories', icon: 'layers', color: '#E6BF5A', backgroundColor: '#3E2865' },
  { id: 'completed_loans', fallbackLabel: 'Completed Loans', icon: 'check', color: '#E6BF5A', backgroundColor: '#1C4E45' },
  { id: 'low_stock_products', fallbackLabel: 'Low Stock Products', icon: 'alert', color: '#E6BF5A', backgroundColor: '#5A2A22' },
] as const;

const styles = StyleSheet.create({
  statIconBadge: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 5,
  },
  rateCardGlow: {
    shadowColor: '#ffd84d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 9,
    elevation: 8,
  },
});

const FILTERS = [
  { label: 'All time', value: 'all' },
  { label: 'This month', value: 'month' },
  { label: 'This week', value: 'week' },
] as const;

const LOAN_STATUSES = [
  { label: 'Active', color: '#10B981' },
  { label: 'Processing', color: '#F59E0B' },
  { label: 'Pending', color: '#38BDF8' },
  { label: 'Overdue', color: '#EF4444' },
  { label: 'Completed', color: '#0F766E' },
] as const;

const QUICK_ACTIONS: {
  label: string;
  subtitle: string;
  icon: 'box' | 'rupee' | 'gold' | 'users';
  route: AdminRoute;
}[] = [
  { label: 'Add Product', subtitle: 'Manage inventory', icon: 'box', route: 'products' },
  { label: 'New Bill', subtitle: 'Create a billing entry', icon: 'rupee', route: 'billing' },
  { label: 'New Loan', subtitle: 'Start a gold loan', icon: 'gold', route: 'loans' },
  { label: 'Customers', subtitle: 'View customer records', icon: 'users', route: 'loans' },
];

const getString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;

const getNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown): string => {
  const amount = getNumber(value);
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatGoldRate = (value: unknown): string => {
  const amount = getNumber(value);
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const GOLD_RATE_METALS = ['Gold', 'Silver', 'Platinum', 'Diamond'];
const GOLD_PURITY_ORDER = ['585', '750', '833', '916', '999'];
const GOLD_KARAT_LABELS: Record<string, string> = {
  '585': '14K (585)',
  '750': '18K (750)',
  '833': '20K (833)',
  '916': '22K (916)',
  '999': '24K (999)',
  '14K': '14K (585)',
  '18K': '18K (750)',
  '20K': '20K (833)',
  '22K': '22K (916)',
  '24K': '24K (999)',
};
const GOLD_PURITY_CODES: Record<string, string> = {
  '14K': '585',
  '18K': '750',
  '20K': '833',
  '22K': '916',
  '24K': '999',
};

const getRatePurityLabel = (rate: HomeGoldRate): string => {
  if (rate.metal_type.toLowerCase() === 'gold') {
    const key = rate.purity.trim().toUpperCase().replace(/\s+/g, '');
    return GOLD_KARAT_LABELS[key] ?? rate.purity;
  }
  return rate.purity;
};

const formatRateDate = (value?: string): string => {
  if (!value) return 'Latest available rates';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDisplayName = (record: DashboardRecord, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
  }
  return fallback;
};

function Home({ user, onNavigate, isActive = false }: HomeProps) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [products, setProducts] = useState<DashboardRecord[]>([]);
  const [goldRateViewportWidth, setGoldRateViewportWidth] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<(typeof FILTERS)[number]['value']>('all');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [goldRateSet, setGoldRateSet] = useState<HomeGoldRateSet | null>(null);
  const [isLoadingGoldRates, setIsLoadingGoldRates] = useState(true);
  const [goldRateError, setGoldRateError] = useState(false);
  const hasLoadedDashboard = useRef(false);
  const hasLoadedGoldRates = useRef(false);

  useEffect(() => {
    if (isActive === false) return undefined;

    const refreshInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        setRefreshVersion(version => version + 1);
      }
    }, 30000);
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setRefreshVersion(version => version + 1);
      }
    });

    return () => {
      clearInterval(refreshInterval);
      appStateSubscription.remove();
    };
  }, [isActive]);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    if (!hasLoadedDashboard.current) setIsLoading(true);
    setLoadError(false);
    api
      .get('/products', {
        params: { limit: 100, page: 1 },
        signal: controller.signal,
      })
      .then(response => {
        if (!isCurrentRequest) {
          return;
        }
        const productRecords = getProductRecords(response.data);
        if (productRecords) {
          setProducts(productRecords);
        } else {
          console.error('Product API returned an invalid product list.');
        }
      })
      .catch(error => {
        if (!isCurrentRequest || error?.name === 'CanceledError') {
          return;
        }
        console.error('Failed to load product images for dashboard:', error);
      });

    api
      .get('/dashboard', {
        params: {
          ...getDashboardDateFilterParams(selectedFilter),
        },
        signal: controller.signal,
      })
      .then(response => {
        if (!isCurrentRequest) {
          return;
        }
        const dashboardData = response.data as DashboardResponse;
        if (!dashboardData || !Array.isArray(dashboardData.stats)) {
          throw new Error('Dashboard API returned no metrics');
        }
        setDashboard(dashboardData);
        hasLoadedDashboard.current = true;
      })
      .catch(error => {
        if (!isCurrentRequest || error?.name === 'CanceledError') {
          return;
        }
        console.error('Failed to load dashboard metrics:', error);
        setLoadError(true);
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    if (!hasLoadedGoldRates.current) setIsLoadingGoldRates(true);
    setGoldRateError(false);
    api
      .get<HomeGoldRateSet>('/gold-rates/current', { signal: controller.signal })
      .then(({ data }) => {
        if (!isCurrentRequest) return;
        if (!Array.isArray(data?.rates)) {
          throw new Error('Gold rates API returned an invalid rate list.');
        }
        setGoldRateSet({
          ...data,
          rates: data.rates.filter(
            rate => typeof rate?.metal_type === 'string' && typeof rate?.purity === 'string',
          ),
        });
        hasLoadedGoldRates.current = true;
      })
      .catch(error => {
        if (!isCurrentRequest || error?.name === 'CanceledError') return;
        console.error('Failed to load daily gold rates for dashboard:', error);
        setGoldRateError(true);
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoadingGoldRates(false);
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [selectedFilter, refreshVersion]);

  const statsById = useMemo(
    () => new Map((dashboard?.stats ?? []).map(stat => [stat.id, stat])),
    [dashboard?.stats],
  );
  const loanStatusCounts = dashboard?.loanStatusCounts ?? {};
  const totalStatusCount = LOAN_STATUSES.reduce(
    (total, status) => total + getNumber(loanStatusCounts[status.label]),
    0,
  );
  const revenueTrends = (dashboard?.revenueTrends ?? []).slice(-6);
  const largestRevenue = Math.max(
    1,
    ...revenueTrends.map(item => getNumber(item.revenue)),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshVersion(version => version + 1);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pb-6 pt-4"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#004D40"
          colors={['#004D40']}
        />
      }
    >
      <View className="mb-5 overflow-hidden rounded-3xl bg-primary-dark px-5 py-5">
        <View className="absolute -right-7 -top-10 h-36 w-36 rounded-full bg-primary-light opacity-30" />
        <View className="absolute -bottom-12 right-20 h-28 w-28 rounded-full bg-accent opacity-20" />
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-accent-light">
          Sri Golds · Admin
        </Text>
        <Text className="mt-2 text-2xl font-bold text-white">
          Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ' back'}
        </Text>
        <Text className="mt-1 text-sm leading-5 text-emerald-50">
          Your business overview at a glance.
        </Text>
        <View className="mt-4 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
          <Text className="text-xs font-semibold text-white">
            {loadError ? 'Dashboard needs a refresh' : 'Business dashboard'}
          </Text>
        </View>
      </View>

      

      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-bold text-slate-900">Overview</Text>
          <Text className="mt-0.5 text-xs text-muted">Track your key numbers</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color="#004D40" accessibilityLabel="Loading dashboard" />
        ) : null}
      </View>

      

      {loadError ? (
        <View className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <Text className="text-sm font-semibold text-rose-800">
            Could not refresh dashboard data.
          </Text>
          <Text className="mt-1 text-xs leading-5 text-rose-700">
            {dashboard
              ? 'Showing the last successful data. Pull down to try again.'
              : 'Check your connection, then tap to try again.'}
          </Text>
          {!dashboard ? (
            <Pressable
              onPress={handleRefresh}
              className="mt-2 self-start rounded-lg bg-rose-700 px-3 py-2"
              accessibilityRole="button"
            >
              <Text className="text-xs font-bold text-white">Try again</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View className="mb-6 flex-row flex-wrap justify-between">
        {STAT_CARDS.map(card => {
          const stat = statsById.get(card.id);
          const value =
            stat?.value === undefined || stat.value === null
              ? isLoading && !dashboard
                ? '…'
                : '—'
              : card.id === 'today_collection' || card.id === 'gold_stock_value'
                ? typeof stat.value === 'number'
                  ? formatCurrency(stat.value)
                  : String(stat.value)
                : String(stat.value);

          return (
            <View
              key={card.id}
              className="mb-3 min-h-[108px] w-[48.5%] overflow-hidden rounded-[18px] border-2 px-2.5 pb-2 pt-2 shadow-lg"
              style={{
                backgroundColor: card.backgroundColor,
                borderColor: card.color,
              }}
              accessibilityLabel={`${stat?.label || card.fallbackLabel}: ${value}${stat?.trend ? `. ${stat.trend}` : ''}`}
              accessible
            >
              <DashboardCardArtwork color={card.color} />
              <View className="z-10 min-h-10 flex-row items-center">
                <View
                  className="mr-1.5 h-6 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: card.color }}
                />
                <View className="min-w-0 flex-1 pr-1">
                  <Text
                    className="text-[11px] font-bold leading-[14px] text-white"
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {stat?.label || card.fallbackLabel}
                  </Text>
                </View>
                <View
                  className="h-10 w-10 shrink-0 items-center justify-center"
                  pointerEvents="none"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <View
                    className="h-7 w-7 items-center justify-center rounded-lg border"
                    style={[
                      styles.statIconBadge,
                      {
                        borderColor: card.color,
                        backgroundColor: `${card.color}35`,
                        transform: [{ rotate: '45deg' }],
                        shadowColor: card.color,
                      },
                    ]}
                  >
                    <View style={{ transform: [{ rotate: '-45deg' }] }}>
                      <DashboardIcon name={card.icon} color={card.color} size={18} />
                    </View>
                  </View>
                  <Svg
                    width={10}
                    height={10}
                    viewBox="0 0 24 24"
                    className="absolute right-1 top-0"
                  >
                    <Path
                      d="M12 1.5 14.2 9.8 22.5 12l-8.3 2.2-2.2 8.3-2.2-8.3L1.5 12l8.3-2.2L12 1.5Z"
                      fill="#FFF4C2"
                    />
                  </Svg>
                </View>
              </View>
              <Text
                className="z-10 mt-1 text-[24px] font-extrabold tracking-tight text-white"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {value}
              </Text>
              {stat?.trend ? (
                <View
                  className="z-10 mt-1 max-w-full self-start rounded-full border px-2.5 py-1"
                  style={{
                    backgroundColor: `${card.color}12`,
                    borderColor: `${card.color}22`,
                  }}
                >
                  <Text
                    className="text-[10px] font-bold"
                    style={{ color: card.color }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {stat.trend}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View className="mb-5 overflow-hidden rounded-3xl border border-[#d6b66e] bg-[#003b2d] p-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="min-w-0 flex-1 flex-row items-center">
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-950">
              <Svg width={27} height={27} viewBox="0 0 24 24" fill="none">
                <Path
                  d="m3 9 4-5h10l4 5-9 12L3 9Z"
                  stroke="#f2d58a"
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                />
                <Path
                  d="M3 9h18M7 4l5 17 5-17"
                  stroke="#f2d58a"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#f2d58a]">
                Daily market snapshot
              </Text>
              <Text className="mt-0.5 text-lg font-extrabold text-white" numberOfLines={1}>
                Sri Golds Precious Rates
              </Text>
              <Text className="mt-1 text-xs font-medium text-emerald-50">
                {goldRateSet
                  ? `Effective ${formatRateDate(goldRateSet.effective_from ?? goldRateSet.rate_date)}`
                  : 'Gold, silver, platinum & diamond'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => onNavigate?.('dailyGoldRates')}
            className="flex-row items-center rounded-xl border border-[#d6b66e] bg-[#064c3d] px-3 py-2.5"
            accessibilityRole="button"
            accessibilityLabel="Manage daily gold rates"
          >
            <Text className="text-[10px] font-extrabold text-white">Manage rates</Text>
            <Text className="ml-1 text-sm font-bold text-[#f2d58a]">→</Text>
          </Pressable>
        </View>

        {isLoadingGoldRates ? (
          <View className="mt-4 flex-row items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-6">
            <ActivityIndicator size="small" color="#F5C45E" />
            <Text className="ml-2 text-xs font-semibold text-emerald-100">Loading today’s rates…</Text>
          </View>
        ) : goldRateError ? (
          <Pressable
            onPress={() => setRefreshVersion(version => version + 1)}
            className="mt-4 items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-5"
            accessibilityRole="button"
            accessibilityLabel="Retry loading daily gold rates"
          >
            <Text className="text-center text-xs font-semibold text-rose-200">
              Could not load today’s rates. Tap to retry.
            </Text>
          </Pressable>
        ) : goldRateSet?.rates.length ? (
          <View className="mt-4 gap-2.5">
            {GOLD_RATE_METALS.map(metal => {
              const metalRates = goldRateSet.rates
                .filter(rate => rate.metal_type.toLowerCase() === metal.toLowerCase())
                .sort((first, second) => {
                  if (metal !== 'Gold') return 0;
                  const firstPurity = first.purity.trim().toUpperCase().replace(/\s+/g, '');
                  const secondPurity = second.purity.trim().toUpperCase().replace(/\s+/g, '');
                  const firstIndex = GOLD_PURITY_ORDER.indexOf(GOLD_PURITY_CODES[firstPurity] ?? firstPurity);
                  const secondIndex = GOLD_PURITY_ORDER.indexOf(GOLD_PURITY_CODES[secondPurity] ?? secondPurity);
                  return firstIndex - secondIndex;
                });
              if (!metalRates.length) return null;
              const rateRows: HomeGoldRate[][] = [];
              const ratesPerRow = metal === 'Gold' || metal === 'Diamond'
                ? metalRates.length
                : metal === 'Platinum'
                  ? 2
                  : 3;
              for (let index = 0; index < metalRates.length; index += ratesPerRow) {
                rateRows.push(metalRates.slice(index, index + ratesPerRow));
              }
              const rateRowsContent = (
                <View className="gap-1.5">
                  {rateRows.map((row, rowIndex) => (
                    <View
                      key={`${metal}-${rowIndex}`}
                      className="flex-row gap-1.5"
                    >
                      {row.map(rate => (
                        <View
                          key={`${rate.metal_type}-${rate.purity}-${rate.rate_unit ?? ''}`}
                          className={`min-h-[58px] rounded-xl bg-[#003b2d] px-2 py-2.5 ${
                            metal === 'Gold' || metal === 'Diamond'
                              ? 'flex-none'
                              : 'min-w-0 flex-1'
                          } ${
                            metal === 'Silver'
                              ? 'flex-row items-center'
                              : 'items-center justify-center'
                          }`}
                          style={[
                            styles.rateCardGlow,
                            metal === 'Gold' || metal === 'Diamond'
                              ? {
                                  width: Math.max(
                                    1,
                                    (goldRateViewportWidth - 6) / 2,
                                  ),
                                }
                              : undefined,
                          ]}
                        >
                          {metal === 'Silver' ? (
                            <>
                              <Text className="flex-1 text-center text-sm font-bold text-[#f2d58a]">
                                {getRatePurityLabel(rate)}
                              </Text>
                              <View className="mx-2 h-8 w-px bg-[#d9a441]/70" />
                              <Text
                                className="flex-[2] text-center text-lg font-extrabold text-white"
                                numberOfLines={1}
                                adjustsFontSizeToFit
                              >
                                {formatGoldRate(rate.rate_per_unit ?? rate.rate_per_gram)}
                                <Text className="text-xs font-semibold text-emerald-50">
                                  {rate.rate_unit?.toLowerCase() === 'carat' ||
                                  rate.rate_unit?.toLowerCase() === 'ct'
                                    ? ' /ct'
                                    : ' /g'}
                                </Text>
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text
                                className="text-center text-[10px] font-bold text-[#f2d58a]"
                                numberOfLines={1}
                                adjustsFontSizeToFit
                              >
                                {getRatePurityLabel(rate)}
                              </Text>
                              <Text
                                className="mt-1 text-center text-xs font-extrabold text-white"
                                numberOfLines={1}
                                adjustsFontSizeToFit
                              >
                                {formatGoldRate(rate.rate_per_unit ?? rate.rate_per_gram)}
                                <Text className="text-[9px] font-semibold text-emerald-50">
                                  {rate.rate_unit?.toLowerCase() === 'carat' ||
                                    rate.rate_unit?.toLowerCase() === 'ct'
                                    ? ' /ct'
                                    : ' /g'}
                                </Text>
                              </Text>
                            </>
                          )}
                        </View>
                      ))}
                      {metal !== 'Silver' && row.length < ratesPerRow ? (
                        <View className="min-w-0 flex-1" />
                      ) : null}
                    </View>
                  ))}
                </View>
              );
              return (
                <View
                  key={metal}
                  className="rounded-2xl border border-[#a8894e] bg-[#064c3d] p-2.5"
                >
                  <View className="mb-2 flex-row items-center">
                    <View className="mr-2 h-7 w-7 items-center justify-center rounded-full border border-[#d6b66e]/50 bg-[#003b2d]">
                      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                        {metal === 'Diamond' ? (
                          <>
                            <Path
                              d="m3 9 4-5h10l4 5-9 12L3 9Z"
                              stroke="#bd8732"
                              strokeWidth={1.8}
                              strokeLinejoin="round"
                            />
                            <Path
                              d="M3 9h18M7 4l5 17 5-17"
                              stroke="#bd8732"
                              strokeWidth={1.4}
                              strokeLinejoin="round"
                            />
                          </>
                        ) : (
                          <Path
                            d="M2.5 14h8l2 5h-12l2-5ZM8.5 5h9l2 6h-13l4-6ZM13 14h8l1.5 5h-9l-2-5Z"
                            stroke="#bd8732"
                            strokeWidth={1.5}
                            strokeLinejoin="round"
                          />
                        )}
                      </Svg>
                    </View>
                    <Text className="text-base font-extrabold text-white">
                      {metal}
                    </Text>
                  </View>
                  {metal === 'Gold' || metal === 'Diamond' ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      onLayout={event =>
                        setGoldRateViewportWidth(event.nativeEvent.layout.width)
                      }
                      accessibilityLabel={`Swipe horizontally to see all ${metal.toLowerCase()} purity rates`}
                    >
                      {rateRowsContent}
                    </ScrollView>
                  ) : (
                    rateRowsContent
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View className="mt-4 items-center rounded-2xl border border-white/10 bg-white/5 py-5">
            <Text className="text-xs font-semibold text-emerald-100">
              {isLoadingGoldRates ? 'Loading rates…' : 'No rates have been configured yet.'}
            </Text>
          </View>
        )}
      </View>

      <View className="mb-5 rounded-2xl border border-slate-100 bg-surface p-4 shadow-sm">
        <SectionHeading title="Quick actions" subtitle="Common tasks" />
        <View className="mt-4 flex-row flex-wrap justify-between">
          {QUICK_ACTIONS.map(action => (
            <Pressable
              key={action.label}
              onPress={() => onNavigate?.(action.route)}
              className="mb-2.5 w-[48%] flex-row items-center rounded-xl border border-slate-100 bg-slate-50 p-3"
              accessibilityRole="button"
            >
              <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <DashboardIcon name={action.icon} color="#FFFFFF" size={18} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                  {action.label}
                </Text>
                <Text className="mt-0.5 text-[9px] text-slate-500" numberOfLines={1}>
                  {action.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mb-5 rounded-2xl border border-slate-100 bg-surface p-4 shadow-sm">
        <SectionHeading
          title="Loan status"
          subtitle={`${getNumber(dashboard?.totalLoansCount)} total loans`}
        />
        <View className="mt-4">
          <View className="mb-3 h-2.5 flex-row overflow-hidden rounded-full bg-slate-100">
            {LOAN_STATUSES.map(status => {
              const count = getNumber(loanStatusCounts[status.label]);
              const width = totalStatusCount
                ? `${(count / totalStatusCount) * 100}%`
                : '0%';
              return (
                <View
                  key={status.label}
                  style={{ width, backgroundColor: status.color }}
                />
              );
            })}
          </View>
          <View className="flex-row flex-wrap">
            {LOAN_STATUSES.map(status => (
              <View key={status.label} className="mb-2 w-1/2 flex-row items-center">
                <View
                  className="mr-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <Text className="flex-1 text-xs text-slate-600">{status.label}</Text>
                <Text className="mr-3 text-xs font-bold text-slate-800">
                  {getNumber(loanStatusCounts[status.label])}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {revenueTrends.length > 0 ? (
        <View className="mb-5 rounded-2xl border border-slate-100 bg-surface p-4 shadow-sm">
          <SectionHeading title="Collection trend" subtitle="Recent revenue" />
          <View className="mt-5 h-32 flex-row items-end justify-around">
            {revenueTrends.map((item, index) => {
              const amount = getNumber(item.revenue);
              const height = Math.max(5, (amount / largestRevenue) * 100);
              const label = getDisplayName(item, ['label', 'month'], `${index + 1}`);
              return (
                <View key={`${label}-${index}`} className="mx-1 flex-1 items-center">
                  <View
                    className="w-full max-w-8 rounded-t-md bg-secondary-light"
                    style={{ height }}
                  />
                  <Text className="mt-2 text-[9px] text-slate-500" numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View className="mb-5 rounded-2xl border border-slate-100 bg-surface p-4 shadow-sm">
        <SectionHeading title="Recent loans" subtitle="Latest activity" />
        {dashboard?.recentLoans?.length ? (
          <View className="mt-2">
            {dashboard.recentLoans.slice(0, 4).map((loan, index) => {
              const customer = getDisplayName(
                loan,
                ['customer_name', 'customerName', 'customer', 'name'],
                'Customer',
              );
              const loanNumber = getDisplayName(
                loan,
                ['loan_number', 'loanNumber', 'id'],
                `Loan ${index + 1}`,
              );
              const status = getDisplayName(loan, ['status'], 'Processing');
              const amount = loan.amount ?? loan.loan_amount ?? loan.principal_amount;
              const imageUrl = getLoanImageUrl(loan, products);
              return (
                <View
                  key={`${loanNumber}-${index}`}
                  className="flex-row items-center border-b border-slate-100 py-3 last:border-b-0"
                >
                  <LoanThumbnail imageUrl={imageUrl} customer={customer} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
                      {customer}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-slate-500" numberOfLines={1}>
                      {loanNumber}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs font-bold text-slate-800">
                      {amount === undefined ? '—' : formatCurrency(amount)}
                    </Text>
                    <Text className="mt-1 text-[10px] text-slate-500">{status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            message={
              isLoading && !dashboard
                ? 'Loading recent loans…'
                : 'No recent loan activity to show.'
            }
          />
        )}
      </View>

      <View className="mb-2 rounded-2xl border border-slate-100 bg-surface p-4 shadow-sm">
        <SectionHeading title="Top products" subtitle="Popular inventory" />
        {dashboard?.topProducts?.length ? (
          <View className="mt-2">
            {dashboard.topProducts.slice(0, 4).map((product, index) => {
              const name = getDisplayName(
                product,
                ['name', 'product_name', 'productName', 'title'],
                `Product ${index + 1}`,
              );
              const quantity =
                product.quantity ?? product.stock ?? product.stock_quantity;
              const matchingProduct = getMatchingProduct(product, products);
              const imageUrl =
                getProductImageUrl(product) ??
                (matchingProduct ? getProductImageUrl(matchingProduct) : undefined);
              return (
                <ProductCard
                  key={`${name}-${index}`}
                  product={{
                    ...product,
                    image_url: imageUrl ?? product.image_url,
                  }}
                  layout="compact"
                  title={name}
                  subtitle={
                    product.category_name || product.category
                      ? getString(product.category_name ?? product.category)
                      : undefined
                  }
                  trailingText={
                    quantity !== undefined
                      ? `Stock ${getString(quantity)}`
                      : undefined
                  }
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            message={
              isLoading && !dashboard
                ? 'Loading product data…'
                : 'No product data to show.'
            }
          />
        )}
      </View>
    </ScrollView>
  );
}

function LoanThumbnail({
  imageUrl,
  customer,
}: {
  imageUrl?: string;
  customer: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  return (
    <View className="mr-3 h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-50">
      {imageUrl && !hasError ? (
        <Image
          source={{ uri: imageUrl }}
          className="h-full w-full"
          resizeMode="cover"
          onError={() => setHasError(true)}
          accessibilityLabel={`${customer} loan image`}
        />
      ) : (
        <Text className="text-sm font-bold text-primary">
          {customer.slice(0, 1).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <View>
        <Text className="text-base font-bold text-slate-900">{title}</Text>
        <Text className="mt-0.5 text-[10px] text-slate-500">{subtitle}</Text>
      </View>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center py-5">
      <Text className="text-xs text-slate-500">{message}</Text>
    </View>
  );
}

function DashboardCardArtwork({
  color,
}: {
  color: string;
}) {
  return (
    <View className="absolute -left-3 -right-3 bottom-0 h-24" pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 300 96" preserveAspectRatio="none">
        <Path d="M0 64 C52 48 85 80 143 66 C210 49 245 22 300 18 V96 H0Z" fill={color} opacity={0.1} />
        <Path d="M0 78 C58 60 93 92 157 76 C213 62 258 39 300 36 V96 H0Z" fill={color} opacity={0.18} />
        <Path d="M0 90 C72 76 106 98 174 86 C224 76 265 55 300 52 V96 H0Z" fill={color} opacity={0.34} />
      </Svg>
    </View>
  );
}

type DashboardIconName =
  | 'users'
  | 'gold'
  | 'rupee'
  | 'gem'
  | 'box'
  | 'layers'
  | 'check'
  | 'alert';

function DashboardIcon({
  name,
  color,
  size,
}: {
  name: DashboardIconName;
  color: string;
  size: number;
}) {
  const iconPaths: Record<DashboardIconName, string[]> = {
    users: ['M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M20 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
    gold: ['M12 2v20', 'M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6'],
    rupee: ['M6 4h12', 'M6 8h12', 'M8 4c5 0 5 8 0 8h-2l8 8'],
    gem: ['m12 3 8 6-8 12L4 9l8-6Z', 'M4 9h16', 'm9 9 3 12 3-12', 'm8 3 4 6 4-6'],
    box: ['m21 8-9 5-9-5', 'm3 8 9-5 9 5v10l-9 5-9-5V8Z', 'M12 13v10'],
    layers: ['m12 2 9 5-9 5-9-5 9-5Z', 'm3 12 9 5 9-5', 'm3 17 9 5 9-5'],
    check: ['M20 6 9 17l-5-5', 'M22 12a10 10 0 1 1-5.8-9.1'],
    alert: ['M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z', 'M12 9v4', 'M12 17h.01'],
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {iconPaths[name].map(path => (
        <Path
          key={path}
          d={path}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export default Home;
