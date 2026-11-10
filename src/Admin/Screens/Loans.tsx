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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
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

type LoanListFilter =
  | 'All Loans'
  | 'Overdue Loans'
  | 'Loan Renewal'
  | 'Gold Release'
  | 'Complete Loan'
  | 'Active'
  | 'Suspended'
  | 'Inactive'
  | 'Pending';

const PAGE_SIZE = 10;
const styles = StyleSheet.create({
  iconBadge: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 5,
  },
});

const LOAN_LIST_FILTERS: LoanListFilter[] = [
  'All Loans',
  'Overdue Loans',
  'Loan Renewal',
  'Gold Release',
  'Complete Loan',
  'Active',
  'Suspended',
  'Inactive',
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

const getLoanReferenceId = (value: unknown): string | null => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return null;
};

const isRenewalLoan = (loan: Loan) => {
  if (loan.is_renewal === true) return true;
  const type = String(loan.loan_type ?? loan.renewal_type ?? '').toLowerCase();
  return type.includes('renewal');
};

const isLinkedToPreviousLoan = (loan: Loan) =>
  [
    loan.renewed_from_loan_id,
    loan.renewal_of_loan_id,
    loan.original_loan_id,
    loan.parent_loan_id,
    loan.previous_loan_id,
    loan.renewed_from,
    loan.renewal_of,
  ].some(value => getLoanReferenceId(value) !== null);

const hasRenewal = (loan: Loan, allLoans: Loan[]) => {
  if (isRenewalLoan(loan)) return true;
  const status = String(loan.renewal_status ?? '').toLowerCase();
  if (['renewed', 'created', 'completed'].includes(status)) return true;
  if (loan.renewal_id || loan.renewed_loan_id) return true;
  return allLoans.some(candidate => {
    if (
      String(candidate.id) === String(loan.id) ||
      (!isRenewalLoan(candidate) && !isLinkedToPreviousLoan(candidate))
    ) {
      return false;
    }
    return [
      candidate.renewed_from_loan_id,
      candidate.renewal_of_loan_id,
      candidate.original_loan_id,
      candidate.parent_loan_id,
      candidate.previous_loan_id,
      candidate.renewed_from,
      candidate.renewal_of,
    ].some(value => getLoanReferenceId(value) === String(loan.id));
  });
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
  String(loan.release_status || '').toLowerCase() !== 'released' &&
  getNumber(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
  getOverdueDays(loan, today) > 0;

const isAwaitingGoldRelease = (loan: Loan) =>
  String(loan.release_status || '').toLowerCase() === 'pending release' &&
  getNumber(loan.outstanding_principal ?? loan.principal_amount) <= 0;

const isRenewalEligible = (loan: Loan, allLoans: Loan[]) =>
  ['active', 'suspended'].includes(String(loan.loan_status || '').toLowerCase()) &&
  loan.release_status !== 'Released' &&
  getNumber(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
  !hasRenewal(loan, allLoans);

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
  onOpenOverdueLoans,
  onOpenLoanRenewal,
  onOpenGoldRelease,
  onOpenCompleteLoan,
  onOpenLoanDetails,
}: {
  onFormVisibilityChange?: (visible: boolean) => void;
  onCreateCustomer?: () => void;
  onOpenOverdueLoans?: () => void;
  onOpenLoanRenewal?: () => void;
  onOpenGoldRelease?: () => void;
  onOpenCompleteLoan?: () => void;
  onOpenLoanDetails?: (loanId: string | number) => void;
}) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [loanListFilter, setLoanListFilter] = useState<LoanListFilter>('All Loans');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deletingLoanId, setDeletingLoanId] = useState<string | number | null>(null);
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
      const awaitingRelease = isAwaitingGoldRelease(loan);
      if (status === 'active' && !awaitingRelease) counts.active += 1;
      if (status === 'inactive') counts.inactive += 1;
      if (status === 'completed') counts.completed += 1;
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
      const matchesFilter = (() => {
        switch (loanListFilter) {
          case 'All Loans':
            return true;
          case 'Overdue Loans':
            return isOverdueActiveLoan(loan, today);
          case 'Loan Renewal':
            return isRenewalEligible(loan, loans);
          case 'Gold Release':
            return isAwaitingGoldRelease(loan);
          case 'Complete Loan':
            return String(loan.loan_status || '').toLowerCase() === 'completed';
          default:
            return getDisplayStatus(loan).toLowerCase() === loanListFilter.toLowerCase();
        }
      })();
      return matchesSearch && matchesFilter;
    });
  }, [loans, loanListFilter, search, today]);

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
      case 'gold release':
        return 'bg-amber-100 text-amber-900';
      case 'completed':
      case 'complete loan':
        return 'bg-slate-100 text-slate-700';
      case 'pending':
        return 'bg-sky-100 text-sky-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const summaryCards = [
    { label: 'Total loans', value: loans.length, color: '#E6BF5A', backgroundColor: '#063D32' },
    { label: 'Active', value: loanCounts.active, color: '#E6BF5A', backgroundColor: '#0A3768' },
    { label: 'Inactive', value: loanCounts.inactive, color: '#E6BF5A', backgroundColor: '#4B164E' },
    { label: 'Completed', value: loanCounts.completed, color: '#E6BF5A', backgroundColor: '#123E57' },
    { label: 'Overdue', value: loanCounts.overdue, color: '#E6BF5A', backgroundColor: '#571E38' },
  ];

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
        <View className="gap-1">
          {[summaryCards.slice(0, 2), summaryCards.slice(2)].map((row, rowIndex) => (
            <View
              key={rowIndex}
              className="flex-row justify-between"
            >
              {row.map(card => (
                <SummaryCard
                  key={card.label}
                  {...card}
                  widthClass={rowIndex === 0 ? 'w-[48.5%]' : 'w-[31.5%]'}
                />
              ))}
            </View>
          ))}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="flex-row gap-2"
            nestedScrollEnabled
            accessibilityLabel="Loan filters"
          >
            {LOAN_LIST_FILTERS.map(filter => {
              const selected = loanListFilter === filter;
              const count = loans.filter(loan => {
                switch (filter) {
                  case 'All Loans':
                    return true;
                  case 'Overdue Loans':
                    return isOverdueActiveLoan(loan, today);
                  case 'Loan Renewal':
                    return isRenewalEligible(loan, loans);
                  case 'Gold Release':
                    return isAwaitingGoldRelease(loan);
                  case 'Complete Loan':
                    return String(loan.loan_status || '').toLowerCase() === 'completed';
                  default:
                    return getDisplayStatus(loan).toLowerCase() === filter.toLowerCase();
                }
              }).length;
              return (
                <Pressable
                  key={filter}
                  onPress={() => {
                    if (filter === 'Overdue Loans' && onOpenOverdueLoans) {
                      onOpenOverdueLoans();
                      return;
                    }
                    if (filter === 'Loan Renewal' && onOpenLoanRenewal) {
                      onOpenLoanRenewal();
                      return;
                    }
                    if (filter === 'Gold Release' && onOpenGoldRelease) {
                      onOpenGoldRelease();
                      return;
                    }
                    if (filter === 'Complete Loan' && onOpenCompleteLoan) {
                      onOpenCompleteLoan();
                      return;
                    }
                    setLoanListFilter(filter);
                    setCurrentPage(1);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Loan list filter ${filter}`}
                  accessibilityHint={`${count} loans`}
                  accessibilityState={{ selected }}
                  className={`shrink-0 flex-row items-center rounded-full border px-3 py-2 ${
                    selected
                      ? 'border-primary bg-primary'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {filter}
                  </Text>
                  <Text
                    className={`ml-1.5 text-[10px] font-extrabold ${
                      selected ? 'text-white/80' : 'text-slate-500'
                    }`}
                  >
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
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

                  <View className="flex-row items-center gap-2">
                    <Text className={`min-w-0 flex-1 text-xs font-semibold ${overdue ? 'text-rose-700' : 'text-slate-500'}`}>
                      Maturity: {formatDate(loan.maturity_date)}
                      {overdue ? ` · ${getOverdueDays(loan, today)} days overdue` : ''}
                    </Text>
                    <Pressable
                      onPress={() => onOpenLoanDetails?.(loan.id)}
                      className="h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50"
                      accessibilityRole="button"
                      accessibilityLabel={`Open full details for ${loan.loan_number || loan.id}`}
                    >
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
                          stroke="#004D40"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <Path
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          stroke="#004D40"
                          strokeWidth={1.8}
                        />
                      </Svg>
                    </Pressable>
                    <Pressable
                      onPress={() => deleteLoan(loan)}
                      disabled={deletingLoanId === loan.id}
                      className="h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50"
                      accessibilityRole="button"
                      accessibilityLabel={`Delete loan ${loan.loan_number || loan.id}`}
                    >
                      {deletingLoanId === loan.id ? (
                        <ActivityIndicator size="small" color="#BE123C" />
                      ) : (
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v6m4-6v6"
                            stroke="#BE123C"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      )}
                    </Pressable>
                  </View>

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
  backgroundColor,
  widthClass,
}: {
  label: string;
  value: number;
  color: string;
  backgroundColor: string;
  widthClass: 'w-[31.5%]' | 'w-[48.5%]';
}) {
  const iconPaths: Record<string, string[]> = {
    'Total loans': ['M3 7h18l-2 12H5L3 7Z', 'M3 7 2 4H1', 'M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', 'M17 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'],
    Active: ['M12 8v4l3 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
    Inactive: ['M12 8v4', 'M12 16h.01', 'M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z'],
    Completed: ['M20 6 9 17l-5-5', 'M22 12a10 10 0 1 1-5.8-9.1'],
    Overdue: ['M12 8v4l3 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  };

  return (
    <View
      className={`relative mb-3 min-h-[108px] ${widthClass} overflow-hidden rounded-[18px] border-2 px-2.5 pb-1.5 pt-2 shadow-lg`}
      style={{ backgroundColor, borderColor: color }}
      accessibilityLabel={`${label}: ${value}`}
      accessible
    >
      <View className="absolute -left-3 -right-3 bottom-0 h-24" pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 300 96" preserveAspectRatio="none">
          <Path d="M0 64 C52 48 85 80 143 66 C210 49 245 22 300 18 V96 H0Z" fill={color} opacity={0.1} />
          <Path d="M0 78 C58 60 93 92 157 76 C213 62 258 39 300 36 V96 H0Z" fill={color} opacity={0.18} />
          <Path d="M0 90 C72 76 106 98 174 86 C224 76 265 55 300 52 V96 H0Z" fill={color} opacity={0.34} />
        </Svg>
      </View>
      <View className="z-10 min-h-10 flex-row items-center">
        <View className="mr-1.5 h-6 w-1 rounded-full" style={{ backgroundColor: color }} />
        <Text
          className="min-w-0 flex-1 pr-1 text-[11px] font-bold leading-[14px] text-white"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {label}
        </Text>
        <View
          className="h-10 w-10 shrink-0 items-center justify-center"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            className="h-7 w-7 items-center justify-center rounded-lg border"
            style={[
              styles.iconBadge,
              {
                borderColor: color,
                backgroundColor: `${color}35`,
                transform: [{ rotate: '45deg' }],
                shadowColor: color,
              },
            ]}
          >
            <View style={{ transform: [{ rotate: '-45deg' }] }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                {(iconPaths[label] || []).map(path => (
                  <Path
                    key={path}
                    d={path}
                    stroke={color}
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </Svg>
            </View>
          </View>
          <Svg width={10} height={10} viewBox="0 0 24 24" className="absolute right-1 top-0">
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
        minimumFontScale={0.7}
      >
        {value.toLocaleString('en-IN')}
      </Text>
    </View>
  );
}

export default Loans;
