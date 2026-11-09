import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import PulseFab from '../Componets/PulseFab';
import CreateLoan from '../Loanmanegements/CreateLoan';

type Loan = Record<string, unknown> & {
  id: string | number;
  loan_number?: string;
  customer_name?: string;
  customer_code?: string;
  customer_mobile?: string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  interest_rate?: number | string;
  maturity_date?: string;
  loan_date?: string;
  loan_status?: string;
  release_status?: string;
  grace_period_days?: number | string;
  created_at?: string;
};

type StatusFilter =
  | 'All'
  | 'Active'
  | 'Suspended'
  | 'Awaiting Gold Release'
  | 'Inactive'
  | 'Completed'
  | 'Pending';

const PAGE_SIZE = 10;
const STATUS_FILTERS: StatusFilter[] = [
  'All',
  'Active',
  'Suspended',
  'Awaiting Gold Release',
  'Inactive',
  'Completed',
  'Pending',
];

const getNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown): string =>
  `₹${getNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '—';
  const datePart = value.slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(datePart)
    ? new Date(`${datePart}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDisplayStatus = (loan: Loan): string => {
  if (loan.release_status === 'Released') return 'Completed';
  if (
    loan.release_status === 'Pending Release' &&
    getNumber(loan.outstanding_principal ?? loan.principal_amount) === 0
  ) {
    return 'Awaiting Gold Release';
  }
  return loan.loan_status || 'Unknown';
};

const getOverdueDays = (loan: Loan, today: Date): number => {
  const datePart = String(loan.maturity_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return 0;
  const [year, month, day] = datePart.split('-').map(Number);
  const gracePeriod = Math.max(0, getNumber(loan.grace_period_days));
  const dueDate = Date.UTC(year, month - 1, day + gracePeriod);
  return Math.max(0, Math.floor((today.getTime() - dueDate) / 86400000));
};

const isOverdueActiveLoan = (loan: Loan, today: Date): boolean =>
  ['active', 'suspended'].includes(String(loan.loan_status || '').toLowerCase()) &&
  loan.release_status !== 'Released' &&
  getNumber(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
  getOverdueDays(loan, today) > 0;

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Could not load loans. Please try again.';
};

function Loans({
  onFormVisibilityChange,
  onCreateCustomer,
}: {
  onFormVisibilityChange?: (visible: boolean) => void;
  onCreateCustomer?: () => void;
}) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deletingLoanId, setDeletingLoanId] = useState<string | number | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  useEffect(() => {
    onFormVisibilityChange?.(isCreateOpen);
    return () => onFormVisibilityChange?.(false);
  }, [isCreateOpen, onFormVisibilityChange]);

  const loadLoans = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/loans');
      if (!Array.isArray(data)) {
        throw new Error('The server returned an invalid loan list.');
      }
      setLoans(data as Loan[]);
    } catch (loadError) {
      console.error('Failed to load loans:', loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const loanCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0, completed: 0, overdue: 0 };
    loans.forEach(loan => {
      const status = String(loan.loan_status || '').trim().toLowerCase();
      const awaitingRelease =
        loan.release_status === 'Pending Release' &&
        getNumber(loan.outstanding_principal ?? loan.principal_amount) === 0;
      if (status === 'active' && !awaitingRelease) counts.active += 1;
      if (status === 'inactive') counts.inactive += 1;
      if (status === 'completed' || loan.release_status === 'Released') counts.completed += 1;
      if (isOverdueActiveLoan(loan, today)) counts.overdue += 1;
    });
    return counts;
  }, [loans, today]);

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return loans.filter(loan => {
      const matchesSearch =
        !query ||
        [
          loan.loan_number,
          loan.customer_name,
          loan.customer_code,
          loan.customer_mobile,
        ].some(value => String(value ?? '').toLowerCase().includes(query));
      const matchesStatus =
        statusFilter === 'All' ||
        getDisplayStatus(loan).toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [loans, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedLoans = filteredLoans.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );

  const changeSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const selectStatusFilter = () => {
    Alert.alert('Filter loans', 'Select a loan status', [
      ...STATUS_FILTERS.map(status => ({
        text: status === 'All' ? 'All statuses' : status,
        onPress: () => {
          setStatusFilter(status);
          setCurrentPage(1);
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const deleteLoan = (loan: Loan) => {
    Alert.alert(
      'Delete loan?',
      `Permanently delete loan ${loan.loan_number || ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingLoanId(loan.id);
            try {
              await api.delete(`/loans/${loan.id}`);
              setLoans(current => current.filter(item => item.id !== loan.id));
              setExpandedLoanId(current => current === loan.id ? null : current);
              Alert.alert('Loan deleted', `Loan ${loan.loan_number || ''} was deleted.`);
            } catch (deleteError) {
              console.error('Failed to delete loan:', deleteError);
              Alert.alert('Delete failed', getErrorMessage(deleteError));
            } finally {
              setDeletingLoanId(null);
            }
          },
        },
      ],
    );
  };

  const statusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800';
      case 'inactive':
        return 'bg-amber-100 text-amber-800';
      case 'suspended':
        return 'bg-rose-100 text-rose-800';
      case 'awaiting gold release':
        return 'bg-amber-100 text-amber-900';
      case 'completed':
        return 'bg-slate-100 text-slate-700';
      case 'pending':
        return 'bg-sky-100 text-sky-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (isCreateOpen) {
    return (
      <CreateLoan
        onCancel={() => setIsCreateOpen(false)}
        onCreated={() => {
          setIsCreateOpen(false);
          loadLoans(true);
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-24 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { loadLoans(true); }}
            tintColor="#004D40"
            colors={['#004D40']}
          />
        }
      >
        <View className="flex-row flex-wrap gap-3">
          <SummaryCard label="Total loans" value={loans.length} color="bg-primary" />
          <SummaryCard label="Active" value={loanCounts.active} color="bg-emerald-700" />
          <SummaryCard label="Inactive" value={loanCounts.inactive} color="bg-amber-700" />
          <SummaryCard label="Completed" value={loanCounts.completed} color="bg-slate-700" />
          <SummaryCard label="Overdue" value={loanCounts.overdue} color="bg-rose-700" />
        </View>

        {!isLoading && loanCounts.overdue > 0 ? (
          <View className="gap-1 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-extrabold text-rose-800">
              {loanCounts.overdue} overdue loan{loanCounts.overdue === 1 ? '' : 's'}
            </Text>
            <Text className="text-xs leading-5 text-rose-700">
              Maturity date and grace period have passed for active loans with an outstanding balance.
            </Text>
          </View>
        ) : null}

        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <TextInput
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
            value={search}
            onChangeText={changeSearch}
            placeholder="Search loan number, customer, phone..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            accessibilityLabel="Search loans"
          />
          <Pressable
            onPress={selectStatusFilter}
            className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            accessibilityRole="button"
            accessibilityLabel={`Filter by status, current filter ${statusFilter}`}
          >
            <View>
              <Text className="text-[10px] font-semibold text-slate-500">Status</Text>
              <Text className="mt-1 text-sm font-bold text-slate-800">
                {statusFilter === 'All' ? 'All statuses' : statusFilter}
              </Text>
            </View>
            <Text className="text-base font-bold text-slate-500">⌄</Text>
          </Pressable>
        </View>

        {error ? (
          <View className="gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-semibold text-rose-800">{error}</Text>
            <Pressable
              onPress={() => { loadLoans(); }}
              className="items-center rounded-xl bg-primary px-4 py-3"
              accessibilityRole="button"
            >
              <Text className="text-sm font-bold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-white py-12">
            <ActivityIndicator size="large" color="#004D40" />
            <Text className="mt-3 text-sm text-slate-500">Loading loans…</Text>
          </View>
        ) : paginatedLoans.length ? (
          <View className="gap-3">
            {paginatedLoans.map(loan => {
              const status = String(getDisplayStatus(loan));
              const overdue = isOverdueActiveLoan(loan, today);
              const expanded = expandedLoanId === loan.id;
              const outstanding = loan.outstanding_principal ?? loan.principal_amount;
              return (
                <View
                  key={loan.id}
                  className="gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-slate-500">
                        {formatDate(loan.loan_date || loan.created_at)}
                      </Text>
                      <Text className="mt-1 text-base font-extrabold text-primary-dark">
                        {loan.loan_number || `Loan #${loan.id}`}
                      </Text>
                    </View>
                    <Text className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(status)}`}>
                      {status}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                      <Text className="text-sm font-extrabold text-primary">
                        {String(loan.customer_name || '?').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                        {loan.customer_name || 'Customer'}
                      </Text>
                      <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                        {loan.customer_code || loan.customer_mobile || 'Customer details unavailable'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between border-t border-slate-100 pt-3">
                    <View className="flex-1">
                      <Text className="text-xs text-slate-500">Outstanding balance</Text>
                      <Text className="mt-1 text-base font-extrabold text-primary-dark">
                        {formatCurrency(outstanding)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-slate-500">Interest</Text>
                      <Text className="mt-1 text-sm font-bold text-slate-800">
                        {getNumber(loan.interest_rate).toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className={`text-xs font-semibold ${overdue ? 'text-rose-700' : 'text-slate-500'}`}>
                      Maturity: {formatDate(loan.maturity_date)}
                      {overdue ? ` · ${getOverdueDays(loan, today)} days overdue` : ''}
                    </Text>
                    <Pressable
                      onPress={() => setExpandedLoanId(expanded ? null : loan.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${expanded ? 'Hide' : 'View'} details for ${loan.loan_number || 'loan'}`}
                    >
                      <Text className="text-xs font-bold text-primary">
                        {expanded ? 'Hide details' : 'View details'}
                      </Text>
                    </Pressable>
                  </View>

                  {expanded ? (
                    <View className="gap-2 rounded-xl bg-slate-50 p-3">
                      <LoanDetail label="Customer code" value={loan.customer_code} />
                      <LoanDetail label="Mobile" value={loan.customer_mobile} />
                      <LoanDetail label="Principal amount" value={formatCurrency(loan.principal_amount)} />
                      <LoanDetail label="Loan status" value={loan.loan_status} />
                      <LoanDetail label="Release status" value={loan.release_status} />
                    </View>
                  ) : null}

                  <Pressable
                    onPress={() => deleteLoan(loan)}
                    disabled={deletingLoanId === loan.id}
                    className="items-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5"
                    accessibilityRole="button"
                    accessibilityLabel={`Delete loan ${loan.loan_number || loan.id}`}
                  >
                    {deletingLoanId === loan.id ? (
                      <ActivityIndicator size="small" color="#BE123C" />
                    ) : (
                      <Text className="text-sm font-bold text-rose-700">Delete loan</Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-slate-200 bg-white px-5 py-10">
            <Text className="text-base font-bold text-slate-800">
              {loans.length ? 'No loans match your filters' : 'No loans created yet'}
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">
              {loans.length
                ? 'Try another search or status.'
                : 'Loans will appear here after they are created.'}
            </Text>
          </View>
        )}

        {!isLoading && filteredLoans.length > PAGE_SIZE ? (
          <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
            <Pressable
              onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={activePage === 1}
              className={`rounded-lg px-4 py-2 ${activePage === 1 ? 'bg-slate-100' : 'bg-primary'}`}
              accessibilityRole="button"
              accessibilityLabel="Previous loan page"
            >
              <Text className={`text-xs font-bold ${activePage === 1 ? 'text-slate-400' : 'text-white'}`}>
                Previous
              </Text>
            </Pressable>
            <Text className="text-xs font-semibold text-slate-600">
              Page {activePage} of {totalPages}
            </Text>
            <Pressable
              onPress={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={activePage === totalPages}
              className={`rounded-lg px-4 py-2 ${activePage === totalPages ? 'bg-slate-100' : 'bg-primary'}`}
              accessibilityRole="button"
              accessibilityLabel="Next loan page"
            >
              <Text className={`text-xs font-bold ${activePage === totalPages ? 'text-slate-400' : 'text-white'}`}>
                Next
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      <View className="absolute bottom-4 right-5 z-20">
        {isFabOpen ? (
          <View className="mb-3 gap-2">
            <LoanFabAction
              label="Create customer"
              icon="customer"
              onPress={() => {
                setIsFabOpen(false);
                onCreateCustomer?.();
              }}
            />
            <LoanFabAction
              label="Create loan"
              icon="loan"
              onPress={() => {
                setIsFabOpen(false);
                setIsCreateOpen(true);
              }}
            />
          </View>
        ) : null}
        <PulseFab
          accessibilityLabel={isFabOpen ? 'Close create options' : 'Show create options'}
          expanded={isFabOpen}
          onPress={() => setIsFabOpen(open => !open)}
        />
      </View>
    </View>
  );
}

function LoanFabAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: 'customer' | 'loan';
  onPress: () => void;
}) {
  const paths =
    icon === 'customer'
      ? ['M20 21a8 8 0 0 0-16 0', 'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z']
      : ['M3 7h18v13H3z', 'M7 7V4h10v3', 'M8 12h8', 'M8 16h5'];
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center self-end rounded-full border border-slate-200 bg-white py-2 pl-3 pr-2 shadow-md"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className="mr-3 text-xs font-bold text-slate-800">{label}</Text>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          {paths.map(path => (
            <Path
              key={path}
              d={path}
              stroke="#FFFFFF"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
    </Pressable>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className={`min-w-[30%] flex-1 rounded-2xl p-4 ${color}`}>
      <Text className="text-xs font-semibold text-white/80">{label}</Text>
      <Text className="mt-2 text-2xl font-extrabold text-white">{value}</Text>
    </View>
  );
}

function LoanDetail({ label, value }: { label: string; value: unknown }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="flex-1 text-right text-xs font-semibold text-slate-700">
        {value == null || value === '' ? '—' : String(value)}
      </Text>
    </View>
  );
}

export default Loans;
