import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import ProductCard from '../../Components/ProductCard';
import { getProductImageUrl } from '../../utils/productImage';
import type { AuthenticatedUser } from '../Auth/Login';
import type { AdminRoute } from '../Navigations/TopHeader';

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

type HomeProps = {
  user: AuthenticatedUser;
  onNavigate?: (route: AdminRoute) => void;
};

const STAT_CARDS = [
  { id: 'today_collection', fallbackLabel: "Today's Collection", icon: 'rupee', color: '#F97316', backgroundColor: '#FFF7ED' },
  { id: 'total_customers', fallbackLabel: 'Total Customers', icon: 'users', color: '#1685E8', backgroundColor: '#EFF6FF' },
  { id: 'active_gold_loans', fallbackLabel: 'Active Gold Loans', icon: 'gold', color: '#8B27C8', backgroundColor: '#FAF5FF' },
  { id: 'gold_stock_value', fallbackLabel: 'Gold Stock Value', icon: 'gem', color: '#9A3412', backgroundColor: '#FEF2F2' },
  { id: 'total_products', fallbackLabel: 'Total Products', icon: 'box', color: '#0F766E', backgroundColor: '#F0FDFA' },
  { id: 'total_categories', fallbackLabel: 'Total Categories', icon: 'layers', color: '#6D28D9', backgroundColor: '#F5F3FF' },
  { id: 'completed_loans', fallbackLabel: 'Completed Loans', icon: 'check', color: '#0F766E', backgroundColor: '#ECFDF5' },
  { id: 'low_stock_products', fallbackLabel: 'Low Stock Products', icon: 'alert', color: '#BE123C', backgroundColor: '#FFF1F2' },
] as const;

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

const getDisplayName = (record: DashboardRecord, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
  }
  return fallback;
};

function Home({ user, onNavigate }: HomeProps) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [products, setProducts] = useState<DashboardRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<(typeof FILTERS)[number]['value']>('all');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    setIsLoading(true);
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
          datePreset: selectedFilter,
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

      <View className="mb-4 flex-row rounded-xl bg-slate-200/70 p-1">
        {FILTERS.map(filter => {
          const isSelected = selectedFilter === filter.value;
          return (
            <Pressable
              key={filter.value}
              onPress={() => setSelectedFilter(filter.value)}
              className={`flex-1 items-center rounded-lg px-2 py-2 ${
                isSelected ? 'bg-white shadow-sm' : ''
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                className={`text-xs font-semibold ${
                  isSelected ? 'text-primary-dark' : 'text-slate-500'
                }`}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
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
              className="mb-3 min-h-[120px] w-[48.5%] overflow-hidden rounded-xl border px-3 py-2 shadow-sm"
              style={{
                backgroundColor: card.backgroundColor,
                borderColor: `${card.color}35`,
              }}
              accessibilityLabel={`${stat?.label || card.fallbackLabel}: ${value}${stat?.trend ? `. ${stat.trend}` : ''}`}
              accessible
            >
              <DashboardCardArtwork color={card.color} />
              <View className="z-10 flex-row items-center">
                <View
                  className="mr-2.5 h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
                  style={{ backgroundColor: card.color }}
                >
                  <DashboardIcon
                    name={card.icon}
                    color="#FFFFFF"
                    size={card.icon === 'check' ? 16 : 20}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[13px] font-bold leading-[17px] text-slate-900"
                    numberOfLines={2}
                  >
                    {stat?.label || card.fallbackLabel}
                  </Text>
                </View>
              </View>
              <Text
                className="z-10 mt-1 text-[24px] font-extrabold tracking-tight text-slate-950"
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
