import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../../api';
import { LoanPaymentModal } from './LoanRenewal';

type Loan = Record<string, unknown> & {
  id: string | number;
  loan_number?: string;
  gold_pledge_number?: string;
  customer_id?: string | number;
  customer_code?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_alternate_mobile?: string;
  customer_email?: string;
  customer_address?: string;
  customer_city?: string;
  customer_district?: string;
  customer_occupation?: string;
  customer_gender?: string;
  customer_date_of_birth?: string;
  customer_kyc_status?: string;
  guarantor_name?: string;
  guarantor_mobile?: string;
  guarantor_email?: string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  interest_rate?: number | string;
  maturity_date?: string;
  loan_date?: string;
  created_at?: string;
  last_reviewed_at?: string;
  next_review_date?: string;
  loan_status?: string;
  release_status?: string;
  grace_period_days?: number | string;
};

type Props = {
  onBack: () => void;
};

type StatusFilter = 'All' | 'Active' | 'Suspended';

const getNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown) =>
  `₹${getNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (value: unknown) => {
  if (typeof value !== 'string' || !value) return '—';
  const datePart = value.slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(datePart)
    ? new Date(`${datePart}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getOverdueDays = (loan: Loan, today: Date) => {
  const datePart = String(loan.maturity_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return 0;
  const [year, month, day] = datePart.split('-').map(Number);
  const graceDays = Math.max(0, getNumber(loan.grace_period_days));
  const dueDate = Date.UTC(year, month - 1, day + graceDays);
  return Math.max(0, Math.floor((today.getTime() - dueDate) / 86400000));
};

const isOverdue = (loan: Loan, today: Date) =>
  ['active', 'suspended'].includes(String(loan.loan_status || '').toLowerCase()) &&
  String(loan.release_status || '').toLowerCase() !== 'released' &&
  getNumber(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
  getOverdueDays(loan, today) > 0;

const isReviewDue = (loan: Loan, today: Date) => {
  if (loan.next_review_date) {
    const datePart = String(loan.next_review_date).slice(0, 10);
    const dueDate = new Date(`${datePart}T00:00:00Z`);
    return !Number.isNaN(dueDate.getTime()) && dueDate <= today;
  }

  const reviewAnchor = loan.last_reviewed_at || loan.loan_date || loan.created_at;
  if (!reviewAnchor) return false;
  const datePart = String(reviewAnchor).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return false;
  const [year, month, day] = datePart.split('-').map(Number);
  const dueYear = year + Math.floor((month - 1 + 15) / 12);
  const dueMonth = (month - 1 + 15) % 12;
  const lastDayOfDueMonth = new Date(Date.UTC(dueYear, dueMonth + 1, 0)).getUTCDate();
  const reviewDueDate = new Date(Date.UTC(dueYear, dueMonth, Math.min(day, lastDayOfDueMonth)));
  return reviewDueDate <= today;
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Could not load overdue loans. Please try again.';
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <View className="min-w-[46%] flex-1 gap-2 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-xs font-semibold text-slate-500">{label}</Text>
      <Text className={`text-xl font-extrabold ${tone}`}>{value}</Text>
    </View>
  );
}

function LoanDetail({ label, value }: { label: string; value?: unknown }) {
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <View className="min-w-0 flex-1">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </Text>
      <Text className="mt-1 break-words text-xs font-medium text-slate-700">{text}</Text>
    </View>
  );
}

function OverdueLoans({ onBack }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [compactView, setCompactView] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [dateDraft, setDateDraft] = useState({ startDate: '', endDate: '' });
  const [dateError, setDateError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);

  const loadLoans = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/loans', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      if (!Array.isArray(data)) throw new Error('The server returned an invalid loan list.');
      setLoans(data as Loan[]);
    } catch (loadError) {
      console.error('Failed to load overdue loans:', loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const overdueLoans = useMemo(
    () =>
      loans
        .filter(loan => isOverdue(loan, today))
        .map(loan => ({ ...loan, overdue_days: getOverdueDays(loan, today) }))
        .sort((first, second) => second.overdue_days - first.overdue_days),
    [loans, today],
  );

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return overdueLoans.filter(loan => {
      const matchesStatus =
        statusFilter === 'All' ||
        String(loan.loan_status || '').toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch =
        !query ||
        [
          loan.loan_number,
          loan.gold_pledge_number,
          loan.customer_code,
          loan.customer_name,
          loan.customer_mobile,
          loan.customer_alternate_mobile,
          loan.customer_email,
          loan.customer_address,
          loan.customer_city,
          loan.customer_district,
          loan.customer_occupation,
          loan.guarantor_name,
          loan.guarantor_mobile,
          loan.guarantor_email,
        ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [overdueLoans, search, statusFilter]);

  const outstandingTotal = overdueLoans.reduce(
    (total, loan) => total + getNumber(loan.outstanding_principal ?? loan.principal_amount),
    0,
  );
  const customerCount = new Set(
    overdueLoans.map(loan => loan.customer_id ?? loan.customer_code ?? loan.customer_name ?? loan.id),
  ).size;
  const reviewRequiredCount = overdueLoans.filter(loan => isReviewDue(loan, today)).length;

  const applyDateRange = () => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const { startDate, endDate } = dateDraft;
    const isCalendarDate = (value: string) => {
      if (!datePattern.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (
      (startDate && !isCalendarDate(startDate)) ||
      (endDate && !isCalendarDate(endDate)) ||
      (startDate && endDate && startDate > endDate)
    ) {
      setDateError('Use YYYY-MM-DD dates and make sure the start date is not after the end date.');
      return;
    }
    setDateError('');
    setDateRange(dateDraft);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="h-16 flex-row items-center justify-between border-b border-[#00382E] bg-primary px-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
            accessibilityRole="button"
            accessibilityLabel="Back to loans"
          >
            <Text className="text-2xl font-bold text-white">‹</Text>
          </Pressable>
          <View>
            <Text className="text-base font-extrabold text-white">Overdue Loans</Text>
            <Text className="mt-0.5 text-[10px] font-semibold text-accent-light">
              Loans past maturity and grace period
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setCompactView(value => !value)}
          className="rounded-xl border border-emerald-700/60 bg-emerald-900/40 px-3 py-2"
          accessibilityRole="button"
          accessibilityLabel={compactView ? 'Show loan cards' : 'Show compact loan list'}
        >
          <Text className="text-xs font-bold text-white">
            {compactView ? 'Cards' : 'Compact'}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { loadLoans(true); }}
            tintColor="#004D40"
            colors={['#004D40']}
          />
        }
      >
        <View className="flex-row flex-wrap gap-3">
          <SummaryCard
            label="Overdue loans"
            value={loading ? '—' : overdueLoans.length}
            tone="text-rose-700"
          />
          <SummaryCard
            label="Customers to follow up"
            value={loading ? '—' : customerCount}
            tone="text-amber-700"
          />
          <SummaryCard
            label="Outstanding principal"
            value={loading ? '—' : formatCurrency(outstandingTotal)}
            tone="text-primary"
          />
          <SummaryCard
            label="15-month reviews"
            value={loading ? '—' : reviewRequiredCount}
            tone="text-amber-700"
          />
        </View>

        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search loan, customer, mobile, guarantor..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
            accessibilityLabel="Search overdue loans"
          />
          <View className="flex-row items-center gap-2">
            <TextInput
              value={dateDraft.startDate}
              onChangeText={value => setDateDraft(current => ({ ...current, startDate: value }))}
              placeholder="Start date (YYYY-MM-DD)"
              placeholderTextColor="#94A3B8"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-800"
              accessibilityLabel="Overdue loans start date"
            />
            <TextInput
              value={dateDraft.endDate}
              onChangeText={value => setDateDraft(current => ({ ...current, endDate: value }))}
              placeholder="End date (YYYY-MM-DD)"
              placeholderTextColor="#94A3B8"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-800"
              accessibilityLabel="Overdue loans end date"
            />
            <Pressable
              onPress={applyDateRange}
              className="rounded-xl bg-primary px-3 py-3"
              accessibilityRole="button"
              accessibilityLabel="Apply overdue loan date range"
            >
              <Text className="text-xs font-bold text-white">Apply</Text>
            </Pressable>
          </View>
          {dateError ? (
            <Text className="text-xs font-medium text-rose-700">{dateError}</Text>
          ) : null}
          <View className="flex-row gap-2">
            {(['All', 'Active', 'Suspended'] as const).map(status => (
              <Pressable
                key={status}
                onPress={() => setStatusFilter(status)}
                className={`flex-1 items-center rounded-xl border px-3 py-2.5 ${
                  statusFilter === status
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: statusFilter === status }}
              >
                <Text
                  className={`text-xs font-bold ${
                    statusFilter === status ? 'text-primary' : 'text-slate-600'
                  }`}
                >
                  {status}
                </Text>
              </Pressable>
            ))}
          </View>
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

        {loading ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-white py-12">
            <ActivityIndicator size="large" color="#004D40" />
            <Text className="mt-3 text-sm text-slate-500">Loading overdue loans…</Text>
          </View>
        ) : filteredLoans.length ? (
          <View className="gap-3">
            {filteredLoans.map(loan => (
              <View
                key={loan.id}
                className={`gap-3 rounded-2xl border border-slate-200 bg-white p-4 ${
                  compactView ? 'py-3' : ''
                }`}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Loan / Pledge
                    </Text>
                    <Text className="mt-1 text-base font-extrabold text-primary-dark">
                      {loan.loan_number || `Loan #${loan.id}`}
                    </Text>
                    {loan.gold_pledge_number ? (
                      <Text className="mt-1 text-xs text-slate-500">
                        Pledge {loan.gold_pledge_number}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="rounded-full bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">
                    {loan.overdue_days} {loan.overdue_days === 1 ? 'day' : 'days'} overdue
                  </Text>
                </View>

                <View className="flex-row items-center justify-between border-t border-slate-100 pt-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-xs font-bold text-slate-800">
                      {loan.customer_name || 'Customer'}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {loan.customer_mobile || loan.customer_code || 'Contact unavailable'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] font-semibold text-slate-500">Outstanding</Text>
                    <Text className="mt-1 text-sm font-extrabold text-rose-700">
                      {formatCurrency(loan.outstanding_principal ?? loan.principal_amount)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-x-5 gap-y-3 border-t border-slate-100 pt-3">
                  <LoanDetail label="Loan amount" value={formatCurrency(loan.principal_amount)} />
                  <LoanDetail
                    label="Interest"
                    value={`${getNumber(loan.interest_rate).toFixed(2)}%`}
                  />
                  <LoanDetail label="Maturity" value={formatDate(loan.maturity_date)} />
                  <LoanDetail label="Grace period" value={`${getNumber(loan.grace_period_days)} days`} />
                  <LoanDetail label="Status" value={loan.loan_status} />
                  {!compactView ? (
                    <>
                      <LoanDetail label="Customer ID" value={loan.customer_code} />
                      <LoanDetail label="Date of birth" value={formatDate(loan.customer_date_of_birth)} />
                      <LoanDetail
                        label="Gender / occupation"
                        value={[loan.customer_gender, loan.customer_occupation].filter(Boolean).join(' · ')}
                      />
                      <LoanDetail label="KYC" value={loan.customer_kyc_status} />
                      <LoanDetail label="Guarantor" value={loan.guarantor_name} />
                      <LoanDetail label="Guarantor mobile" value={loan.guarantor_mobile} />
                    </>
                  ) : null}
                </View>
                {isReviewDue(loan, today) ? (
                  <Text className="self-start rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    15-month review
                  </Text>
                ) : null}
                <View className="flex-row justify-end border-t border-slate-100 pt-3">
                  {loan.loan_status?.toLowerCase() === 'active' ? (
                    <Pressable
                      onPress={() => setPaymentLoan(loan)}
                      className="min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2"
                      accessibilityRole="button"
                      accessibilityLabel={`Pay loan ${loan.loan_number || loan.id}`}
                    >
                      <Text className="text-xs font-bold text-white">Pay / Renew</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-slate-200 bg-white px-5 py-10">
            <Text className="text-base font-bold text-slate-800">
              {overdueLoans.length ? 'No overdue loans match your filters' : 'There are no overdue active loans'}
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">
              {overdueLoans.length
                ? 'Try another search or status.'
                : 'Loans with an outstanding balance past maturity will appear here.'}
            </Text>
          </View>
        )}
      </ScrollView>
      {paymentLoan ? (
        <LoanPaymentModal
          loan={paymentLoan}
          onClose={() => setPaymentLoan(null)}
          onLoanUpdated={updatedLoan => {
            setLoans(current => current.map(loan =>
              String(loan.id) === String(updatedLoan.id) ? { ...loan, ...updatedLoan } : loan,
            ));
          }}
        />
      ) : null}
    </View>
  );
}

export default OverdueLoans;