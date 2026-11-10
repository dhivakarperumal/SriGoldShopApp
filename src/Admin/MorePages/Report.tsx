import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import type { ReactNode } from 'react';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import AdminStatCard from '../Components/AdminStatCard';

type DatePreset = 'all' | 'month' | 'week';

type DashboardStat = {
  id?: string;
  label?: string;
  value?: string | number;
  trend?: string;
};

type DashboardRecord = Record<string, unknown>;

type DashboardResponse = {
  stats?: DashboardStat[];
  totalLoansCount?: number;
  loanStatusCounts?: Record<string, number>;
  revenueTrends?: DashboardRecord[];
  recentLoans?: DashboardRecord[];
  topProducts?: DashboardRecord[];
};

type Props = {
  onBack: () => void;
};

const DATE_RANGES: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'month', label: 'This month' },
  { value: 'week', label: 'This week' },
];

const STAT_CARDS = [
  { id: 'total_customers', fallbackLabel: 'Total customers', icon: 'users', tone: 'green' },
  { id: 'active_gold_loans', fallbackLabel: 'Active gold loans', icon: 'loan', tone: 'blue' },
  { id: 'total_products', fallbackLabel: 'Total products', icon: 'box', tone: 'purple' },
  { id: 'gold_stock_value', fallbackLabel: 'Gold stock value', icon: 'gold', tone: 'wine' },
] as const;

const DISPLAYED_STATUSES = [
  { label: 'Active', color: '#059669' },
  { label: 'Processing', color: '#D97706' },
  { label: 'Pending', color: '#0284C7' },
  { label: 'Overdue', color: '#E11D48' },
] as const;

const getNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown): string =>
  `₹${getNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const getText = (record: DashboardRecord, keys: string[], fallback = '—'): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
  }
  return fallback;
};

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Could not load report data. Please try again.';
};

function Report({ onBack }: Props) {
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [reportsData, setReportsData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    const fetchReports = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await api.get<DashboardResponse>('/dashboard', {
          params: { datePreset },
          signal: controller.signal,
        });
        if (!data || !Array.isArray(data.stats)) {
          throw new Error('The server returned invalid report data.');
        }
        if (isCurrentRequest) {
          setReportsData(data);
        }
      } catch (fetchError) {
        if (!isCurrentRequest || (fetchError instanceof Error && fetchError.name === 'CanceledError')) {
          return;
        }
        console.error('Failed to load report data:', fetchError);
        setError(getErrorMessage(fetchError));
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchReports();
    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [datePreset, retryKey]);

  const statsById = useMemo(
    () => new Map((reportsData?.stats ?? []).map(stat => [stat.id, stat])),
    [reportsData?.stats],
  );
  const trends = reportsData?.revenueTrends ?? [];
  const largestRevenue = Math.max(1, ...trends.map(item => getNumber(item.revenue)));
  const loanStatuses = reportsData?.loanStatusCounts ?? {};
  const loans = reportsData?.recentLoans ?? [];
  const products = reportsData?.topProducts ?? [];

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRetryKey(key => key + 1);
  }, []);

  const handleShare = async () => {
    if (!reportsData) return;
    const summary = [
      'Gold Shop Report',
      DATE_RANGES.find(range => range.value === datePreset)?.label ?? datePreset,
      ...(reportsData.stats ?? []).map(
        stat => `${stat.label || 'Metric'}: ${stat.value ?? '—'}`,
      ),
      `Total loans: ${reportsData.totalLoansCount ?? 0}`,
    ].join('\n');
    try {
      await Share.share({ title: 'Gold Shop Report', message: summary });
    } catch (shareError) {
      console.error('Failed to share report:', shareError);
      Alert.alert('Share failed', 'Could not share the report.');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-slate-200 bg-white px-4 py-3">
        <Pressable
          onPress={onBack}
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="m15 18-6-6 6-6M9 12h12" stroke="#334155" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-extrabold text-slate-900">Reports</Text>
          <Text className="text-xs text-slate-500">Sales, inventory and loan activity</Text>
        </View>
        <Pressable
          onPress={handleShare}
          disabled={!reportsData || isLoading}
          className="rounded-xl bg-primary px-4 py-2.5 disabled:opacity-50"
          accessibilityRole="button"
          accessibilityLabel="Share report summary"
        >
          <Text className="text-xs font-bold text-white">Share</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-8 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#004D40"
            colors={['#004D40']}
          />
        }
      >
        <View className="rounded-2xl border border-slate-200 bg-white p-3">
          <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Report period
          </Text>
          <View className="flex-row gap-2">
            {DATE_RANGES.map(range => {
              const selected = datePreset === range.value;
              return (
                <Pressable
                  key={range.value}
                  onPress={() => setDatePreset(range.value)}
                  className={`flex-1 items-center rounded-xl border px-2 py-2.5 ${
                    selected ? 'border-primary bg-primary' : 'border-slate-200 bg-slate-50'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Report period ${range.label}`}
                >
                  <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-700'}`}>
                    {range.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <View className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-bold text-rose-800">Reports could not be loaded.</Text>
            <Text className="mt-1 text-xs leading-5 text-rose-700">{error}</Text>
            <Pressable
              onPress={() => setRetryKey(key => key + 1)}
              className="mt-3 self-start rounded-lg bg-rose-700 px-4 py-2"
              accessibilityRole="button"
            >
              <Text className="text-xs font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading && !reportsData ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-white py-12">
            <ActivityIndicator size="large" color="#004D40" />
            <Text className="mt-3 text-sm text-slate-500">Loading report data…</Text>
          </View>
        ) : (
          <>
            <View className="flex-row flex-wrap justify-between">
              {STAT_CARDS.map(card => {
                const stat = statsById.get(card.id);
                return (
                  <AdminStatCard
                    key={card.id}
                    label={stat?.label || card.fallbackLabel}
                    value={isLoading && !stat ? '—' : stat?.value ?? '—'}
                    icon={card.icon}
                    tone={card.tone}
                    detail={stat?.trend}
                  />
                );
              })}
            </View>

            <ReportSection title="Sales overview" subtitle="Revenue returned by the dashboard">
              <Text className="mb-3 text-lg font-extrabold text-primary-dark">
                {formatCurrency(trends.reduce((total, item) => total + getNumber(item.revenue), 0))}
              </Text>
              {trends.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="h-44 min-w-full flex-row items-end gap-3 border-b border-l border-slate-200 px-3 pb-2 pt-3">
                    {trends.map((item, index) => {
                      const revenue = getNumber(item.revenue);
                      const height = Math.max((revenue / largestRevenue) * 100, revenue > 0 ? 5 : 0);
                      return (
                        <View
                          key={`${getText(item, ['date', 'label'], 'period')}-${index}`}
                          className="h-full w-10 items-center justify-end"
                        >
                          <View
                            className="w-7 rounded-t-md bg-emerald-700"
                            style={{ height: `${height}%` }}
                          />
                          <Text className="mt-2 w-14 text-center text-[10px] text-slate-500" numberOfLines={1}>
                            {getText(item, ['label'], '')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <EmptyReport message="No sales trend data is available for this period." />
              )}
            </ReportSection>

            <ReportSection
              title="Gold loan report"
              subtitle="Loan counts from the selected dashboard period"
              trailing={`${reportsData?.totalLoansCount ?? 0} total`}
            >
              <View className="flex-row flex-wrap justify-between gap-y-2">
                {DISPLAYED_STATUSES.map(status => (
                  <View
                    key={status.label}
                    className="w-[48%] flex-row items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <Text className="text-xs font-semibold text-slate-600">{status.label}</Text>
                    <Text className="text-sm font-extrabold" style={{ color: status.color }}>
                      {loanStatuses[status.label] ?? 0}
                    </Text>
                  </View>
                ))}
              </View>
            </ReportSection>

            <ReportSection title="Recent loan activity" subtitle={`${loans.length} records`}>
              {loans.length ? (
                <View className="gap-2">
                  {loans.slice(0, 10).map((loan, index) => (
                    <View
                      key={getText(loan, ['rawId', 'id'], String(index))}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="flex-1 text-xs font-extrabold text-slate-800" numberOfLines={1}>
                          {getText(loan, ['id', 'loan_number'], 'Loan')}
                        </Text>
                        <Text className="text-xs font-bold text-primary">
                          {getText(loan, ['status'])}
                        </Text>
                      </View>
                      <Text className="mt-1 text-xs text-slate-600" numberOfLines={1}>
                        {getText(loan, ['customer'])} · {getText(loan, ['jewellery'])}
                      </Text>
                      <View className="mt-2 flex-row justify-between">
                        <Text className="text-xs font-bold text-slate-800">
                          {getText(loan, ['rawAmount', 'amount'])}
                        </Text>
                        <Text className="text-[10px] text-slate-500">
                          {getText(loan, ['date'])}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyReport message="No loan activity is available." />
              )}
            </ReportSection>

            <ReportSection title="Product price snapshot" subtitle="Top products from the dashboard">
              {products.length ? (
                <View className="divide-y divide-slate-100">
                  {products.slice(0, 5).map((product, index) => (
                    <View
                      key={getText(product, ['id', 'name'], String(index))}
                      className="flex-row items-center justify-between gap-3 py-3"
                    >
                      <View className="min-w-0 flex-1">
                        <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                          {getText(product, ['name'], 'Product')}
                        </Text>
                        <Text className="mt-1 text-[10px] text-slate-500" numberOfLines={1}>
                          {getText(product, ['cat', 'category'], 'Jewellery')}
                        </Text>
                      </View>
                      <Text className="text-xs font-extrabold text-slate-800">
                        {getText(product, ['amount', 'price'])}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyReport message="No product data is available." />
              )}
            </ReportSection>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ReportSection({
  title,
  subtitle,
  trailing,
  children,
}: {
  title: string;
  subtitle?: string;
  trailing?: string;
  children: ReactNode;
}) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="mb-3 flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-extrabold text-slate-900">{title}</Text>
          {subtitle ? <Text className="mt-1 text-xs text-slate-500">{subtitle}</Text> : null}
        </View>
        {trailing ? (
          <Text className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">
            {trailing}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function EmptyReport({ message }: { message: string }) {
  return (
    <View className="items-center rounded-xl bg-slate-50 px-3 py-6">
      <Text className="text-xs text-slate-500">{message}</Text>
    </View>
  );
}

export default Report;
