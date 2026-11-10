import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import AdminStatCard from '../Components/AdminStatCard';

type Props = {
  onBack: () => void;
};

type EntryType = 'FUND_ADDED' | 'DEBIT' | 'CREDIT';
type TransactionFilter = 'ALL' | EntryType | 'TRANSFER_IN' | 'TRANSFER_OUT';
type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';
type DatePickerTarget = 'startDate' | 'endDate' | 'transactionDate';

type FundAccount = {
  id: string | number;
  name: string;
  current_balance?: number | string;
  is_active?: boolean;
};

type FundSummary = {
  opening_balance?: number | string;
  fund_added?: number | string;
  total_debit?: number | string;
  total_credit?: number | string;
  loan_disbursed?: number | string;
  loan_repayment_received?: number | string;
  billing_collection?: number | string;
  current_balance?: number | string;
  closing_balance?: number | string;
};

type FundTransaction = {
  id: string | number;
  transaction_date?: string;
  transaction_type: string;
  account_name?: string;
  category?: string;
  party_name?: string;
  related_reference?: string;
  reference_number?: string;
  payment_method?: string;
  amount?: number | string;
  running_balance?: number | string;
  status?: string;
  description?: string;
  created_by?: string | number;
  receipt_url?: string;
};

type TransactionResponse = {
  transactions?: unknown;
  total?: unknown;
};

type FundEntry = {
  account_id: string;
  category: string;
  amount: string;
  transaction_date: string;
  payment_method: string;
  party_name: string;
  related_reference: string;
  reference_number: string;
  description: string;
};

const CATEGORIES: Record<EntryType, string[]> = {
  FUND_ADDED: ['Cash', 'Bank Account', 'UPI', 'Owner Investment', 'Business Capital', 'Other'],
  DEBIT: [
    'Customer Gold Loan Disbursement',
    'Supplier Payment',
    'Gold Purchase',
    'Shop Expenses',
    'Employee Salary',
    'Rent and Electricity',
    'Customer Refund',
    'Bank Withdrawal or Transfer',
    'Other Expenses',
  ],
  CREDIT: [
    'Customer Loan Repayment',
    'Gold Sales Billing Collection',
    'Interest Collection',
    'Making Charges Collection',
    'Customer Advance',
    'Owner Capital',
    'Supplier Refund',
    'Bank Deposit',
    'Other Income',
  ],
};

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'];
const TYPE_FILTERS: { label: string; value: TransactionFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Fund added', value: 'FUND_ADDED' },
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Credit', value: 'CREDIT' },
  { label: 'Transfers', value: 'TRANSFER_IN' },
];
const DATE_FILTERS: { label: string; value: DatePreset }[] = [
  { label: 'All time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'Custom range', value: 'custom' },
];
const PAGE_SIZE = 20;

const today = () => new Date().toLocaleDateString('en-CA');

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
};

const getCalendarWeeks = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
};

const getDateRange = (
  preset: DatePreset,
  customStartDate: string,
  customEndDate: string,
) => {
  const endDate = today();
  if (preset === 'all') return { startDate: '', endDate: '' };
  if (preset === 'custom') {
    return { startDate: customStartDate, endDate: customEndDate };
  }
  if (preset === 'today') return { startDate: endDate, endDate };
  const date = new Date();
  if (preset === 'week') {
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
  } else {
    date.setDate(1);
  }
  return { startDate: date.toLocaleDateString('en-CA'), endDate };
};

const asNumber = (value: unknown) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const formatMoney = (value: unknown) =>
  `₹${asNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const getErrorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

const TYPE_LABELS: Record<string, string> = {
  FUND_ADDED: 'Fund Added',
  DEBIT: 'Debit',
  CREDIT: 'Credit',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
};

const EMPTY_ENTRY = (accountId = ''): FundEntry => ({
  account_id: accountId,
  category: '',
  amount: '',
  transaction_date: today(),
  payment_method: 'Cash',
  party_name: '',
  related_reference: '',
  reference_number: '',
  description: '',
});

const normalizeTransactions = (value: unknown): FundTransaction[] => {
  if (!Array.isArray(value)) {
    throw new Error('The server returned an invalid transaction list.');
  }
  return value.flatMap(record => {
    if (typeof record !== 'object' || record === null) return [];
    const item = record as Record<string, unknown>;
    const id = item.id;
    if ((typeof id !== 'string' && typeof id !== 'number') || typeof item.transaction_type !== 'string') {
      return [];
    }
    return [{
      ...item,
      id,
      transaction_type: item.transaction_type,
    } as FundTransaction];
  });
};

function FundManagement({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<FundAccount[]>([]);
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return formatDate(date);
  });
  const [customEndDate, setCustomEndDate] = useState(today);
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [draftDate, setDraftDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [entryType, setEntryType] = useState<EntryType | null>(null);
  const [entry, setEntry] = useState<FundEntry>(EMPTY_ENTRY());
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FundTransaction | null>(null);

  const activeAccounts = useMemo(
    () => accounts.filter(account => account.is_active !== false),
    [accounts],
  );
  const dateRange = useMemo(
    () => getDateRange(datePreset, customStartDate, customEndDate),
    [datePreset, customEndDate, customStartDate],
  );
  const pageCount = Math.max(1, Math.ceil(totalTransactions / PAGE_SIZE));

  const fetchData = useCallback(async (refresh = false) => {
    setLoadError('');
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const params = {
        ...dateRange,
        page,
        page_size: PAGE_SIZE,
        transaction_type: transactionFilter,
        search: search.trim(),
      };
      const [accountsResponse, summaryResponse, transactionResponse] = await Promise.all([
        api.get('/funds/accounts'),
        api.get('/funds/summary', { params: dateRange }),
        api.get<TransactionResponse>('/funds/transactions', { params }),
      ]);
      if (!Array.isArray(accountsResponse.data)) {
        throw new Error('The server returned an invalid fund account list.');
      }
      if (!transactionResponse.data || !Array.isArray(transactionResponse.data.transactions)) {
        throw new Error('The server returned an invalid transaction response.');
      }
      setAccounts(accountsResponse.data as FundAccount[]);
      setSummary(summaryResponse.data as FundSummary);
      setTransactions(normalizeTransactions(transactionResponse.data.transactions));
      setTotalTransactions(asNumber(transactionResponse.data.total));
    } catch (error) {
      console.error('Error loading fund management data:', error);
      setLoadError(getErrorMessage(error, 'Fund management data could not be loaded.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange, page, search, transactionFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyDateSelection = (target: DatePickerTarget, date: Date) => {
    const selectedDate = formatDate(date);
    if (target === 'transactionDate') {
      setEntry(current => ({ ...current, transaction_date: selectedDate }));
    } else if (target === 'startDate') {
      setCustomStartDate(selectedDate);
      if (selectedDate > customEndDate) setCustomEndDate(selectedDate);
    } else {
      setCustomEndDate(selectedDate);
      if (selectedDate < customStartDate) setCustomStartDate(selectedDate);
    }
    setPage(1);
    setDatePickerTarget(null);
  };

  const openDatePicker = (target: DatePickerTarget) => {
    const currentValue =
      target === 'startDate'
        ? customStartDate
        : target === 'endDate'
          ? customEndDate
          : entry.transaction_date;
    const value = parseDate(currentValue);
    setDraftDate(value);
    setCalendarMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    setDatePickerTarget(target);
  };

  const openEntry = (type: EntryType) => {
    const accountId = activeAccounts[0] ? String(activeAccounts[0].id) : '';
    setEntryType(type);
    setEntry({
      ...EMPTY_ENTRY(accountId),
      category: CATEGORIES[type][0],
    });
  };

  const saveEntry = async () => {
    if (!entryType || isSaving) return;
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }
    if (entryType !== 'FUND_ADDED' && !entry.account_id) {
      Alert.alert('Account required', 'Select a fund account for this transaction.');
      return;
    }
    if (!entry.category.trim()) {
      Alert.alert('Category required', 'Select a transaction category.');
      return;
    }

    setIsSaving(true);
    try {
      const endpoint =
        entryType === 'FUND_ADDED' ? 'fund-added' : entryType.toLowerCase();
      await api.post(`/funds/transactions/${endpoint}`, {
        ...entry,
        amount,
        idempotency_key: `fund-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      setEntryType(null);
      await fetchData(true);
    } catch (error) {
      console.error('Failed to save fund transaction:', error);
      Alert.alert('Save failed', getErrorMessage(error, 'The transaction could not be saved.'));
    } finally {
      setIsSaving(false);
    }
  };

  const statCards = [
    { label: 'Opening Balance', value: summary?.opening_balance, icon: 'fund', tone: 'green' },
    { label: 'Total Fund Added', value: summary?.fund_added, icon: 'credit', tone: 'blue' },
    { label: 'Total Debit', value: summary?.total_debit, icon: 'debit', tone: 'purple' },
    { label: 'Total Credit', value: summary?.total_credit, icon: 'credit', tone: 'wine' },
    { label: 'Loan Disbursed', value: summary?.loan_disbursed, icon: 'loan', tone: 'teal' },
    { label: 'Loan Repayment', value: summary?.loan_repayment_received, icon: 'fund', tone: 'green' },
    { label: 'Billing Collection', value: summary?.billing_collection, icon: 'credit', tone: 'blue' },
    { label: 'Available Balance', value: summary?.current_balance, icon: 'fund', tone: 'purple' },
  ] as const;

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
        >
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-extrabold text-white">Fund Management</Text>
          <Text className="text-[10px] text-emerald-200">Cash flow, accounts and transactions</Text>
        </View>
        <Pressable
          onPress={() => fetchData(true)}
          accessibilityRole="button"
          accessibilityLabel="Refresh fund data"
          className="h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M20 7v5h-5M4 17v-5h5m-4.1-3A8 8 0 0 1 18 6l2 6M4 12l2 6a8 8 0 0 0 13.1-3" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>

      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchData(true)}
              tintColor="#004D40"
            />
          }
        >
          <View className="mb-1 flex-row flex-wrap justify-between">
            {statCards.map(card => (
              <AdminStatCard
                key={card.label}
                label={card.label}
                value={isLoading && card.value == null ? '—' : formatMoney(card.value)}
                icon={card.icon}
                tone={card.tone}
                detail={
                  card.label === 'Available Balance' && summary
                    ? `Period close: ${formatMoney(summary.closing_balance)}`
                    : undefined
                }
              />
            ))}
          </View>

          <View className="mb-4 flex-row gap-2">
            <EntryButton label="Add Fund" onPress={() => openEntry('FUND_ADDED')} />
            <EntryButton label="Debit" onPress={() => openEntry('DEBIT')} tone="rose" />
            <EntryButton label="Credit" onPress={() => openEntry('CREDIT')} tone="emerald" />
          </View>

          {loadError ? (
            <View className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <Text className="text-xs leading-5 text-rose-800">{loadError}</Text>
              <Pressable onPress={() => fetchData()} className="mt-2 self-start" accessibilityRole="button">
                <Text className="text-xs font-bold text-rose-800 underline">Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <TextInput
            value={search}
            onChangeText={value => {
              setPage(1);
              setSearch(value);
            }}
            placeholder="Search customer, reference or category"
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search transactions"
            className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-2">
              {TYPE_FILTERS.map(filter => (
                <FilterChip
                  key={filter.value}
                  label={filter.label}
                  selected={transactionFilter === filter.value}
                  onPress={() => {
                    setPage(1);
                    setTransactionFilter(filter.value);
                  }}
                />
              ))}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              {DATE_FILTERS.map(filter => (
                <FilterChip
                  key={filter.value}
                  label={filter.label}
                  selected={datePreset === filter.value}
                  onPress={() => {
                    setPage(1);
                    setDatePreset(filter.value);
                  }}
                />
              ))}
            </View>
          </ScrollView>

          {datePreset === 'custom' ? (
            <View className="mb-4 flex-row gap-3">
              <DateButton
                label="From"
                value={customStartDate}
                onPress={() => openDatePicker('startDate')}
              />
              <DateButton
                label="To"
                value={customEndDate}
                onPress={() => openDatePicker('endDate')}
              />
            </View>
          ) : null}

          {isLoading && transactions.length === 0 ? (
            <View className="items-center py-14">
              <ActivityIndicator size="large" color="#004D40" />
              <Text className="mt-3 text-sm text-slate-500">Loading transactions…</Text>
            </View>
          ) : transactions.length ? (
            transactions.map(transaction => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onPress={() => setSelectedTransaction(transaction)}
              />
            ))
          ) : !loadError ? (
            <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10">
              <Text className="text-base font-bold text-slate-800">No transactions found</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                Try another filter or record a new transaction.
              </Text>
            </View>
          ) : null}

          {pageCount > 1 ? (
            <View className="mt-2 flex-row items-center justify-between rounded-xl bg-white px-3 py-3">
              <Text className="text-xs text-slate-500">Page {page} of {pageCount}</Text>
              <View className="flex-row gap-2">
                <PageButton label="Previous" disabled={page <= 1} onPress={() => setPage(current => current - 1)} />
                <PageButton label="Next" disabled={page >= pageCount} onPress={() => setPage(current => current + 1)} />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={datePickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerTarget(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-white px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-slate-900">
                {datePickerTarget === 'transactionDate'
                  ? 'Transaction date'
                  : datePickerTarget === 'startDate'
                    ? 'Start date'
                    : 'End date'}
              </Text>
              <Pressable
                onPress={() => setDatePickerTarget(null)}
                accessibilityRole="button"
                accessibilityLabel="Close date selection"
                className="px-2 py-1"
              >
                <Text className="text-sm font-bold text-slate-500">Close</Text>
              </Pressable>
            </View>
            <View className="mb-3 flex-row items-center justify-between">
              <Pressable
                onPress={() =>
                  setCalendarMonth(current =>
                    new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <Text className="text-lg font-bold text-slate-700">‹</Text>
              </Pressable>
              <Text className="text-sm font-bold text-slate-800">
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                onPress={() =>
                  setCalendarMonth(current =>
                    new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Next month"
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <Text className="text-lg font-bold text-slate-700">›</Text>
              </Pressable>
            </View>
            <View className="mb-1 flex-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} className="flex-1 py-2 text-center text-xs font-semibold text-slate-400">
                  {day}
                </Text>
              ))}
            </View>
            {getCalendarWeeks(calendarMonth).map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} className="flex-row">
                {week.map((date, dayIndex) => {
                  const selected = date?.toDateString() === draftDate.toDateString();
                  return (
                    <Pressable
                      key={date?.toISOString() || `empty-${weekIndex}-${dayIndex}`}
                      disabled={!date}
                      onPress={() => date && setDraftDate(date)}
                      accessibilityRole="button"
                      accessibilityLabel={date ? formatDate(date) : undefined}
                      accessibilityState={{ selected }}
                      className={`m-0.5 h-10 flex-1 items-center justify-center rounded-full ${
                        selected ? 'bg-primary' : date ? 'active:bg-emerald-50' : ''
                      }`}
                    >
                      {date ? (
                        <Text className={`text-sm ${selected ? 'font-bold text-white' : 'text-slate-700'}`}>
                          {date.getDate()}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <Pressable
              onPress={() => {
                if (datePickerTarget) applyDateSelection(datePickerTarget, draftDate);
              }}
              accessibilityRole="button"
              className="mt-4 items-center rounded-xl bg-primary px-4 py-3"
            >
              <Text className="text-sm font-bold text-white">Apply date</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={entryType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEntryType(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="max-h-[92%] rounded-t-3xl bg-white px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Text className="text-lg font-extrabold text-slate-900">
              {entryType === 'FUND_ADDED' ? 'Add Fund' : entryType === 'DEBIT' ? 'Record Debit' : 'Record Credit'}
            </Text>
            <Text className="mt-1 text-xs text-slate-500">
              Enter transaction details below.
            </Text>
            <ScrollView className="mt-4" keyboardShouldPersistTaps="handled">
              {entryType && entryType !== 'FUND_ADDED' ? (
                <FormChoice
                  label="Fund account"
                  value={entry.account_id}
                  placeholder="Select account"
                  options={activeAccounts.map(account => ({
                    label: `${account.name} · ${formatMoney(account.current_balance)}`,
                    value: String(account.id),
                  }))}
                  onSelect={value => setEntry(current => ({ ...current, account_id: value }))}
                />
              ) : null}
              {entryType ? (
                <FormChoice
                  label={entryType === 'FUND_ADDED' ? 'Fund source' : 'Category'}
                  value={entry.category}
                  placeholder="Select category"
                  options={CATEGORIES[entryType].map(value => ({ label: value, value }))}
                  onSelect={value => setEntry(current => ({ ...current, category: value }))}
                />
              ) : null}
              <DateButton
                label="Transaction date"
                value={entry.transaction_date}
                onPress={() => openDatePicker('transactionDate')}
              />
              <FormInput
                label="Amount (₹)"
                value={entry.amount}
                onChangeText={value => setEntry(current => ({ ...current, amount: value }))}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
              />
              <FormChoice
                label="Payment method"
                value={entry.payment_method}
                placeholder="Select payment method"
                options={PAYMENT_METHODS.map(value => ({ label: value, value }))}
                onSelect={value => setEntry(current => ({ ...current, payment_method: value }))}
              />
              {entryType !== 'FUND_ADDED' ? (
                <>
                  <FormInput
                    label={entryType === 'DEBIT' ? 'Customer / supplier' : 'Customer name'}
                    value={entry.party_name}
                    onChangeText={value => setEntry(current => ({ ...current, party_name: value }))}
                    placeholder="Enter name"
                  />
                  <FormInput
                    label="Related loan ID / bill number"
                    value={entry.related_reference}
                    onChangeText={value => setEntry(current => ({ ...current, related_reference: value }))}
                    placeholder="Optional"
                  />
                  <FormInput
                    label="Reference number / transaction ID"
                    value={entry.reference_number}
                    onChangeText={value => setEntry(current => ({ ...current, reference_number: value }))}
                    placeholder="Optional"
                  />
                </>
              ) : null}
              <FormInput
                label="Description / notes"
                value={entry.description}
                onChangeText={value => setEntry(current => ({ ...current, description: value }))}
                placeholder="Optional transaction notes"
                multiline
              />
              {!activeAccounts.length ? (
                <Text className="mb-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  No active fund accounts are available. Create or activate an account before recording transactions.
                </Text>
              ) : null}
            </ScrollView>
            <View className="mt-3 flex-row justify-end gap-2">
              <Pressable
                onPress={() => setEntryType(null)}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 px-4 py-3"
                accessibilityRole="button"
              >
                <Text className="text-sm font-bold text-slate-600">Close</Text>
              </Pressable>
              <Pressable
                onPress={() => saveEntry()}
                disabled={isSaving || !activeAccounts.length}
                className="rounded-xl bg-primary px-5 py-3 disabled:opacity-50"
                accessibilityRole="button"
              >
                <Text className="text-sm font-bold text-white">
                  {isSaving ? 'Saving…' : 'Save transaction'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedTransaction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTransaction(null)}
      >
        <Pressable
          onPress={() => setSelectedTransaction(null)}
          accessibilityRole="button"
          accessibilityLabel="Close transaction details"
          className="flex-1 justify-center bg-black/50 px-4"
        >
          <View className="rounded-2xl bg-white p-5">
            <Text className="text-xs font-bold uppercase tracking-wide text-primary">
              Transaction #{selectedTransaction?.id}
            </Text>
            <Text className="mt-1 text-lg font-extrabold text-slate-900">
              {selectedTransaction?.category}
            </Text>
            <ScrollView className="mt-4 max-h-[60%]">
              <Detail label="Type" value={TYPE_LABELS[selectedTransaction?.transaction_type || '']} />
              <Detail label="Date" value={selectedTransaction?.transaction_date} />
              <Detail label="Account" value={selectedTransaction?.account_name} />
              <Detail label="Amount" value={formatMoney(selectedTransaction?.amount)} />
              <Detail label="Running balance" value={formatMoney(selectedTransaction?.running_balance)} />
              <Detail label="Party" value={selectedTransaction?.party_name} />
              <Detail label="Payment method" value={selectedTransaction?.payment_method} />
              <Detail label="Reference" value={selectedTransaction?.reference_number} />
              <Detail label="Related record" value={selectedTransaction?.related_reference} />
              <Detail label="Status" value={selectedTransaction?.status} />
              <Detail label="Notes" value={selectedTransaction?.description} />
              <Detail label="Created by" value={selectedTransaction?.created_by} />
            </ScrollView>
            <Pressable
              onPress={() => setSelectedTransaction(null)}
              className="mt-4 self-end rounded-xl bg-primary px-5 py-3"
              accessibilityRole="button"
            >
              <Text className="text-sm font-bold text-white">Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function EntryButton({
  label,
  onPress,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'rose' | 'emerald';
}) {
  const color =
    tone === 'rose'
      ? 'bg-rose-700'
      : tone === 'emerald'
        ? 'bg-emerald-700'
        : 'bg-primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`min-h-11 flex-1 flex-row items-center justify-center rounded-xl px-2 ${color}`}
    >
      <Text className="mr-1 text-base font-bold text-white">+</Text>
      <Text className="text-[11px] font-extrabold text-white">{label}</Text>
    </Pressable>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full border px-3 py-2 ${
        selected ? 'border-primary bg-primary' : 'border-slate-200 bg-white'
      }`}
    >
      <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-600'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function TransactionCard({
  transaction,
  onPress,
}: {
  transaction: FundTransaction;
  onPress: () => void;
}) {
  const isDebit = ['DEBIT', 'TRANSFER_OUT'].includes(transaction.transaction_type);
  const isCredit = ['CREDIT', 'FUND_ADDED', 'TRANSFER_IN'].includes(transaction.transaction_type);
  const amountColor = isDebit ? 'text-rose-700' : 'text-emerald-700';
  const amountPrefix = isDebit ? '−' : isCredit ? '+' : '';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View transaction ${transaction.id}, ${transaction.category}`}
      className="mb-3 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            #{transaction.id} · {TYPE_LABELS[transaction.transaction_type] || transaction.transaction_type}
          </Text>
          <Text className="mt-1 text-sm font-extrabold text-slate-900" numberOfLines={1}>
            {transaction.category || 'Transaction'}
          </Text>
          <Text className="mt-1 text-[10px] text-slate-500" numberOfLines={1}>
            {transaction.transaction_date || 'Date unavailable'}
          </Text>
        </View>
        <Text className={`text-sm font-extrabold ${amountColor}`} numberOfLines={1}>
          {amountPrefix}{formatMoney(transaction.amount)}
        </Text>
      </View>
      <View className="mt-3 flex-row justify-between border-t border-slate-100 pt-3">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[10px] text-slate-500">Account · Party</Text>
          <Text className="mt-0.5 text-xs font-semibold text-slate-700" numberOfLines={1}>
            {[transaction.account_name, transaction.party_name].filter(Boolean).join(' · ') || '—'}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] text-slate-500">Running balance</Text>
          <Text className="mt-0.5 text-xs font-extrabold text-slate-800">
            {formatMoney(transaction.running_balance)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function PageButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40"
    >
      <Text className="text-[10px] font-bold text-slate-700">{label}</Text>
    </Pressable>
  );
}

function DateButton({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View className="min-w-0 flex-1">
      <Text className="mb-1.5 text-xs font-semibold text-slate-600">{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. Choose date`}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3"
      >
        <Text className="text-sm font-semibold text-slate-800">{value}</Text>
        <Text className="ml-2 text-xs text-primary">Choose</Text>
      </Pressable>
    </View>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold text-slate-600">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800${multiline ? ' min-h-20' : ''}`}
      />
    </View>
  );
}

function FormChoice({
  label,
  value,
  placeholder,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(option => option.value === value)?.label || placeholder;
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold text-slate-600">{label}</Text>
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel}`}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
      >
        <Text className={`flex-1 text-sm ${value ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedLabel}
        </Text>
        <Text className="ml-2 text-xs text-slate-500">▼</Text>
      </Pressable>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable
          onPress={() => setIsOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close options"
          className="flex-1 justify-end bg-black/50"
        >
          <View
            className="max-h-[70%] rounded-t-3xl bg-white px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Text className="mb-3 text-lg font-extrabold text-slate-900">{label}</Text>
            <ScrollView>
              {options.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.value === value }}
                  className={`mb-2 rounded-xl px-4 py-3 ${
                    option.value === value ? 'bg-emerald-50' : 'bg-slate-50'
                  }`}
                >
                  <Text className="text-sm font-semibold text-slate-700">{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View className="mb-3">
      <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="mt-0.5 text-sm text-slate-700">{String(value)}</Text>
    </View>
  );
}

export default FundManagement;