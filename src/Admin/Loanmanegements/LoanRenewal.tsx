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
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import api from '../../api';

type Loan = Record<string, unknown> & {
  id: string | number;
  loan_number?: string;
  customer_id?: string | number;
  customer_code?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_alternate_mobile?: string;
  customer_email?: string;
  customer_date_of_birth?: string;
  customer_gender?: string;
  customer_occupation?: string;
  customer_kyc_status?: string;
  customer_address?: string;
  customer_city?: string;
  customer_district?: string;
  customer_state?: string;
  customer_pincode?: string;
  guarantor_name?: string;
  guarantor_mobile?: string;
  guarantor_email?: string;
  guarantor_relationship?: string;
  guarantor_address?: string;
  gold_pledge_number?: string;
  jewellery_type?: string;
  metal_type?: string;
  gold_purity?: string;
  gross_weight?: number | string;
  stone_weight?: number | string;
  net_gold_weight?: number | string;
  gold_valuation?: number | string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  interest_type?: string;
  interest_rate?: number | string;
  interest_frequency?: string;
  interest_calculation_start_date?: string;
  loan_date?: string;
  maturity_date?: string;
  compounding_frequency?: string;
  payment_frequency?: string;
  custom_period_days?: number | string;
  grace_period_days?: number | string;
  interest_free_days?: number | string;
  late_payment_interest_rate?: number | string;
  fixed_interest_amount?: number | string;
  minimum_interest_amount?: number | string;
  maximum_interest_amount?: number | string;
  processing_fee?: number | string;
  other_charges?: number | string;
  notes?: string;
  loan_status?: string;
  release_status?: string;
  next_review_date?: string;
  last_reviewed_at?: string;
  created_at?: string;
};

type Preview = {
  current_principal: number;
  regular_interest: number;
  late_payment_fee: number;
  accrued_interest: number;
  total_due: number;
  minimum_payment: number;
  renewal_date?: string;
  next_maturity_date?: string;
  period_start_date?: string;
};

type ReviewAction = {
  id: string | number;
  action_type: string;
  notice_method?: string;
  customer_message?: string;
  notes?: string;
  created_at?: string;
};

type RenewalData = {
  loan: Loan;
  preview: Preview;
  reviewActions?: ReviewAction[];
};

type FundAccount = {
  id: string | number;
  name: string;
  is_active?: boolean;
};

type Props = {
  onBack: () => void;
};

type StatusFilter = 'All' | 'Active' | 'Suspended';
type NoticeMethod = 'sms' | 'whatsapp' | 'call' | 'letter' | 'in_person' | 'other';
type DatePickerTarget = 'startDate' | 'endDate';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'];
const NOTICE_METHODS: { value: NoticeMethod; label: string }[] = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Phone call' },
  { value: 'letter', label: 'Letter' },
  { value: 'in_person', label: 'In person' },
  { value: 'other', label: 'Other' },
];

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

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string) => {
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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    if ('response' in error) {
      const response = (error as { response?: { data?: { message?: unknown } } }).response;
      if (typeof response?.data?.message === 'string') return response.data.message;
    }
    if ('message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message) return message;
    }
  }
  return fallback;
};

const isReviewDue = (loan: Loan) => {
  const reviewDate = loan.next_review_date || loan.last_reviewed_at || loan.loan_date || loan.created_at;
  if (!reviewDate) return false;
  const datePart = String(reviewDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return false;
  const [year, month, day] = datePart.split('-').map(Number);
  const reviewDueDate = new Date(Date.UTC(year, month - 1, day));
  if (!loan.next_review_date) {
    const dueMonthIndex = month - 1 + 15;
    const dueYear = year + Math.floor(dueMonthIndex / 12);
    const dueMonth = dueMonthIndex % 12;
    const lastDay = new Date(Date.UTC(dueYear, dueMonth + 1, 0)).getUTCDate();
    reviewDueDate.setTime(Date.UTC(dueYear, dueMonth, Math.min(day, lastDay)));
  }
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return reviewDueDate.getTime() <= today;
};

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <View className="h-16 flex-row items-center gap-3 border-b border-[#00382E] bg-primary px-4">
      <Pressable
        onPress={onBack}
        className="h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
        accessibilityRole="button"
        accessibilityLabel="Back to loans"
      >
        <Text className="text-2xl font-bold text-white">‹</Text>
      </Pressable>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-white">{title}</Text>
        <Text className="mt-0.5 text-[10px] font-semibold text-accent-light">{subtitle}</Text>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  maxLength?: number;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-bold text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 ${
          multiline ? 'min-h-20 py-3' : 'min-h-11 py-2'
        }`}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  options,
  onSelect,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(option => option.value === value)?.label || 'Select';
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-bold text-slate-700">{label}</Text>
      <Pressable
        onPress={() => setIsOpen(open => !open)}
        disabled={disabled}
        className="min-h-11 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 disabled:bg-slate-100"
        accessibilityRole="button"
        accessibilityLabel={`Select ${label.toLowerCase()}`}
      >
        <Text className="text-sm font-medium text-slate-700">{selectedLabel}</Text>
        <Text className="text-base font-bold text-slate-400">⌄</Text>
      </Pressable>
      {isOpen ? (
        <View className="max-h-52 rounded-xl border border-slate-200 bg-white p-2">
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.map(option => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
                className={`mb-1 rounded-lg border px-3 py-2.5 ${
                  option.value === value
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-100 bg-white'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Option ${option.label}`}
                accessibilityState={{ selected: option.value === value }}
              >
                <Text className="text-sm font-semibold text-slate-800">{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function Info({ label, value }: { label: string; value?: unknown }) {
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <View className="min-w-[45%] flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-slate-800">{text}</Text>
    </View>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-xs font-semibold text-slate-500">{label}</Text>
      <Text className={`mt-2 text-xl font-extrabold ${tone}`}>{value}</Text>
    </View>
  );
}

export function LoanPaymentModal({
  loan: loanRow,
  onClose,
  onLoanUpdated,
}: {
  loan: Loan;
  onClose: () => void;
  onLoanUpdated: (loan: Loan) => void;
}) {
  const [renewalData, setRenewalData] = useState<RenewalData | null>(null);
  const [fundAccounts, setFundAccounts] = useState<FundAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get(`/loans/${loanRow.id}/renewal`),
      api.get('/funds/accounts'),
    ])
      .then(([renewalResponse, accountsResponse]) => {
        if (!Array.isArray(accountsResponse.data)) {
          throw new Error('The server returned an invalid fund account list.');
        }
        if (!active) return;
        const activeAccounts = (accountsResponse.data as FundAccount[]).filter(account => account.is_active);
        setRenewalData(renewalResponse.data as RenewalData);
        setFundAccounts(activeAccounts);
        setAccountId(String(activeAccounts[0]?.id || ''));
        setLoadError('');
      })
      .catch(error => {
        console.error('Failed to load loan payment details:', error);
        if (active) setLoadError(getErrorMessage(error, 'Could not load payment and renewal details.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [loanRow.id]);

  const loan = renewalData?.loan;
  const preview = renewalData?.preview;
  const amount = Number(paymentAmount);
  const principalReduction = preview && Number.isFinite(amount)
    ? Math.max(0, Math.min(preview.current_principal, amount - preview.accrued_interest))
    : 0;
  const canPay = Boolean(
    loan &&
    preview &&
    loan.loan_status === 'Active' &&
    preview.current_principal > 0 &&
    accountId &&
    Number.isFinite(amount) &&
    amount > 0 &&
    amount + 0.001 >= preview.minimum_payment &&
    amount <= preview.total_due + 0.001,
  );

  const submitPayment = async () => {
    if (!canPay || saving || !preview) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/loans/${loanRow.id}/renewal`, {
        payment_amount: amount,
        account_id: accountId,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        idempotency_key: `loan-payment-${loanRow.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      const updatedData = data as RenewalData;
      setRenewalData(updatedData);
      setPaymentAmount('');
      setReferenceNumber('');
      onLoanUpdated(updatedData.loan);
      Alert.alert(
        'Payment recorded',
        updatedData.preview.current_principal === 0
          ? 'Loan paid in full. Complete and record the gold release.'
          : `Payment recorded. Loan renewed through ${formatDate(updatedData.loan.maturity_date)}.`,
      );
    } catch (error) {
      console.error('Failed to record loan payment:', error);
      Alert.alert('Payment failed', getErrorMessage(error, 'Could not record this payment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[92%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-4">
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                Payment and renewal
              </Text>
              <Text className="mt-1 text-base font-extrabold text-slate-900" numberOfLines={1}>
                {loanRow.loan_number || `Loan #${loanRow.id}`} · {loanRow.customer_name || 'Customer'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
              className="ml-3 rounded-full bg-slate-100 px-3 py-2"
              accessibilityRole="button"
              accessibilityLabel="Close payment details"
            >
              <Text className="text-xs font-bold text-slate-700">Close</Text>
            </Pressable>
          </View>
          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#004D40" />
              <Text className="mt-3 text-sm text-slate-500">Loading payment details…</Text>
            </View>
          ) : !loan || !preview ? (
            <View className="p-5">
              <Text className="text-sm font-medium text-rose-700">
                {loadError || 'Payment details are unavailable.'}
              </Text>
            </View>
          ) : (
            <ScrollView
              className="px-4"
              contentContainerClassName="gap-4 pb-8 pt-4"
              keyboardShouldPersistTaps="handled"
            >
              <View className="gap-3 rounded-2xl bg-slate-50 p-4">
                <Text className="text-sm font-extrabold text-slate-800">
                  Payment and renewal
                </Text>
                <Text className="text-xs text-slate-500">
                  Renewal date: {formatDate(preview.renewal_date)}
                </Text>
                {[
                  ['Current principal', formatCurrency(preview.current_principal)],
                  ['Maturity date', formatDate(loan.maturity_date)],
                  ['Regular interest accrued', formatCurrency(preview.regular_interest)],
                  ['Overdue extra interest / late fee', formatCurrency(preview.late_payment_fee)],
                  ['Total interest and late fee', formatCurrency(preview.accrued_interest)],
                  ['Total due', formatCurrency(preview.total_due)],
                ].map(([label, value]) => (
                  <View key={label} className="flex-row justify-between gap-3">
                    <Text className="flex-1 text-xs text-slate-600">{label}</Text>
                    <Text className="text-right text-xs font-bold text-slate-800">{value}</Text>
                  </View>
                ))}
                <Text className="text-[10px] leading-4 text-slate-500">
                  Overdue charges use the saved late-payment rate. Processing and other charges are not included.
                </Text>
              </View>

              {preview.current_principal > 0 ? (
                <>
                  <Field
                    label="Payable amount"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder="Enter amount received"
                    keyboardType="decimal-pad"
                  />
                  <SelectField
                    label="Deposit account"
                    value={accountId}
                    options={[
                      { value: '', label: 'Select account' },
                      ...fundAccounts.map(account => ({ value: String(account.id), label: account.name })),
                    ]}
                    onSelect={setAccountId}
                    disabled={saving || !fundAccounts.length}
                  />
                  <SelectField
                    label="Payment method"
                    value={paymentMethod}
                    options={PAYMENT_METHODS.map(method => ({ value: method, label: method }))}
                    onSelect={setPaymentMethod}
                    disabled={saving}
                  />
                  <Field
                    label="Reference number (optional)"
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                    maxLength={100}
                  />
                  {!fundAccounts.length ? (
                    <Text className="text-xs font-medium text-rose-600">
                      No active fund accounts are available. Add or activate one before recording a payment.
                    </Text>
                  ) : null}
                  <View className="gap-1 rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <Text className="text-xs leading-5 text-amber-900">
                      Minimum interest payment: {formatCurrency(preview.minimum_payment)}. Any extra payment reduces principal; the remaining balance earns interest at the saved rate for the next 11 months.
                    </Text>
                  </View>
                  {paymentAmount && Number.isFinite(amount) && amount > 0 ? (
                    <View className="gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <AmountLine label="Interest covered" value={formatCurrency(Math.min(amount, preview.accrued_interest))} />
                      <AmountLine label="Principal reduction" value={formatCurrency(principalReduction)} />
                      <AmountLine
                        label="Principal after payment"
                        value={formatCurrency(preview.current_principal - principalReduction)}
                        strong
                      />
                    </View>
                  ) : null}
                  {loan.loan_status !== 'Active' ? (
                    <Text className="text-center text-xs font-semibold text-slate-500">
                      This loan is not active and cannot be renewed.
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={submitPayment}
                    disabled={!canPay || saving}
                    className="min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 disabled:opacity-50"
                    accessibilityRole="button"
                    accessibilityLabel="Record payment and renew loan"
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-sm font-extrabold text-white">Record Payment & Renew</Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <View className="gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <Text className="text-sm font-bold text-emerald-900">This loan is paid in full.</Text>
                  <Text className="text-xs leading-5 text-emerald-800">
                    Complete and record the gold release before closing this loan.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function AmountLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row justify-between gap-2">
      <Text className={`text-xs ${strong ? 'font-extrabold text-primary-dark' : 'text-slate-600'}`}>
        {label}
      </Text>
      <Text className={`text-xs ${strong ? 'font-extrabold text-primary-dark' : 'font-bold text-slate-700'}`}>
        {value}
      </Text>
    </View>
  );
}

function LoanRenewal({ onBack }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string | number | null>(null);
  const [renewalData, setRenewalData] = useState<RenewalData | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [dateDraft, setDateDraft] = useState({ startDate: '', endDate: '' });
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [dateError, setDateError] = useState('');
  const [noticeMethod, setNoticeMethod] = useState<NoticeMethod>('sms');
  const [customerMessage, setCustomerMessage] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewActionNotes, setReviewActionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingReview, setSavingReview] = useState(false);
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
      setLoans(
        (data as Loan[]).filter(loan =>
          ['Active', 'Suspended'].includes(String(loan.loan_status)) &&
          String(loan.release_status || '') !== 'Released' &&
          getNumber(loan.outstanding_principal ?? loan.principal_amount) > 0,
        ),
      );
    } catch (loadError) {
      console.error('Failed to load loan renewal data:', loadError);
      setError(getErrorMessage(loadError, 'Could not load loan renewal data.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  useEffect(() => {
    if (selectedLoanId === null) {
      setRenewalData(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setError('');
    api.get(`/loans/${selectedLoanId}/renewal`)
      .then(({ data }) => {
        if (!active) return;
        const details = data as RenewalData;
        setRenewalData(details);
        const loan = details.loan;
        setCustomerMessage(
          `Your loan ${loan.loan_number || ''} has reached its 15-month review date. Please contact Sri Golds to discuss payment or renewal options. Any further action will follow your loan agreement and applicable process.`,
        );
      })
      .catch(loadError => {
        console.error('Failed to load loan renewal details:', loadError);
        if (active) setError(getErrorMessage(loadError, 'Could not load loan renewal details.'));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => { active = false; };
  }, [selectedLoanId]);

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return loans.filter(loan => {
      const matchesSearch = !query || [
        loan.loan_number,
        loan.customer_name,
        loan.customer_code,
        loan.customer_mobile,
      ].some(value => String(value || '').toLowerCase().includes(query));
      const matchesStatus =
        statusFilter === 'All' ||
        String(loan.loan_status || '').toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [loans, search, statusFilter]);

  const applyDateRange = () => {
    const isValidDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (
      (dateDraft.startDate && !isValidDate(dateDraft.startDate)) ||
      (dateDraft.endDate && !isValidDate(dateDraft.endDate)) ||
      (dateDraft.startDate && dateDraft.endDate && dateDraft.startDate > dateDraft.endDate)
    ) {
      setDateError('Use valid YYYY-MM-DD dates and make sure the start date is not after the end date.');
      return;
    }
    setDateError('');
    setDateRange(dateDraft);
  };

  const openDatePicker = (target: DatePickerTarget) => {
    const date = parseLocalDate(dateDraft[target]);
    setSelectedCalendarDate(date);
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setDatePickerTarget(target);
  };

  const applyDateSelection = () => {
    if (!datePickerTarget) return;
    setDateDraft(current => ({
      ...current,
      [datePickerTarget]: formatLocalDate(selectedCalendarDate),
    }));
    setDateError('');
    setDatePickerTarget(null);
  };

  const handleReviewAction = async (action: 'notice_sent' | 'suspend' | 'reinstate') => {
    const loan = renewalData?.loan;
    if (!loan || !isReviewDue(loan) || savingReview) return;
    if (action === 'notice_sent' && (!customerMessage.trim() || !reviewNotes.trim())) {
      Alert.alert('Required information', 'Enter the customer message and contact notes.');
      return;
    }
    if (action !== 'notice_sent' && !reviewActionNotes.trim()) {
      Alert.alert('Notes required', 'Enter notes before changing the renewal status.');
      return;
    }
    if (action === 'suspend' && !renewalData.reviewActions?.some(item => item.action_type === 'notice_sent')) {
      Alert.alert('Customer notice required', 'Record that the customer notice was sent before suspending renewal.');
      return;
    }
    setSavingReview(true);
    try {
      const payload = action === 'notice_sent'
        ? { action, notice_method: noticeMethod, customer_message: customerMessage, notes: reviewNotes }
        : { action, notes: reviewActionNotes };
      const { data } = await api.post(`/loans/${loan.id}/review-action`, payload);
      setRenewalData(current => current
        ? { ...current, loan: data.loan as Loan, reviewActions: data.reviewActions as ReviewAction[] }
        : current);
      setReviewNotes('');
      setReviewActionNotes('');
      Alert.alert(
        'Review updated',
        action === 'notice_sent'
          ? 'Customer notice recorded. This app does not send SMS or WhatsApp automatically.'
          : action === 'suspend'
            ? 'Renewal suspended. No collateral action was taken.'
            : 'Renewal access reinstated.',
      );
    } catch (reviewError) {
      console.error('Failed to update loan review:', reviewError);
      Alert.alert('Review update failed', getErrorMessage(reviewError, 'Could not update the loan review.'));
    } finally {
      setSavingReview(false);
    }
  };

  const goBack = () => {
    if (selectedLoanId !== null) {
      setSelectedLoanId(null);
      setRenewalData(null);
      setError('');
      return;
    }
    onBack();
  };

  const recordLoanUpdated = (updatedLoan: Loan) => {
    setLoans(current => current.map(loan =>
      String(loan.id) === String(updatedLoan.id) ? { ...loan, ...updatedLoan } : loan,
    ));
    if (renewalData && String(renewalData.loan.id) === String(updatedLoan.id)) {
      setRenewalData(current => current ? { ...current, loan: updatedLoan } : current);
    }
  };

  if (selectedLoanId !== null) {
    const loan = renewalData?.loan;
    const preview = renewalData?.preview;
    const address = [loan?.customer_address, loan?.customer_city, loan?.customer_district, loan?.customer_state, loan?.customer_pincode]
      .filter(Boolean)
      .join(', ');
    const manualReviewDue = loan ? isReviewDue(loan) : false;
    return (
      <View className="flex-1 bg-background">
        <Header
          title={loan?.loan_number || 'Loan renewal'}
          subtitle={loan ? `${loan.customer_name || 'Customer'} · ${loan.customer_mobile || 'No mobile'}` : 'Renewal details'}
          onBack={goBack}
        />
        {detailLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#004D40" />
            <Text className="mt-3 text-sm text-slate-500">Loading renewal details…</Text>
          </View>
        ) : error || !loan || !preview ? (
          <ScrollView contentContainerClassName="gap-3 p-4">
            {error ? <Text className="text-sm text-rose-700">{error}</Text> : null}
            <Pressable onPress={() => setSelectedLoanId(null)} className="self-start rounded-xl bg-primary px-4 py-3">
              <Text className="text-sm font-bold text-white">Back to renewal loans</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 px-4 pb-8 pt-4"
            keyboardShouldPersistTaps="handled"
          >
            {manualReviewDue ? (
              <View className="gap-1 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <Text className="text-sm font-extrabold text-amber-900">15-month account review required</Text>
                <Text className="text-xs leading-5 text-amber-800">
                  Refer this loan for authorized manual review. This flag does not authorize automatic collateral seizure or forfeiture.
                </Text>
              </View>
            ) : null}

            <Section title="Customer and pledged item">
              <Info label="Customer ID" value={loan.customer_code || loan.customer_id} />
              <Info label="Customer name" value={loan.customer_name} />
              <Info label="Mobile" value={loan.customer_mobile} />
              <Info label="Alternate mobile" value={loan.customer_alternate_mobile} />
              <Info label="Email" value={loan.customer_email} />
              <Info label="Date of birth" value={formatDate(loan.customer_date_of_birth)} />
              <Info label="Gender" value={loan.customer_gender} />
              <Info label="Occupation" value={loan.customer_occupation} />
              <Info label="KYC status" value={loan.customer_kyc_status} />
              <Info label="Address" value={address} />
              <Info label="Guarantor" value={loan.guarantor_name} />
              <Info label="Guarantor mobile" value={loan.guarantor_mobile} />
              <Info label="Guarantor email" value={loan.guarantor_email} />
              <Info label="Guarantor relationship" value={loan.guarantor_relationship} />
              <Info label="Guarantor address" value={loan.guarantor_address} />
              <Info label="Pledge number" value={loan.gold_pledge_number} />
              <Info label="Jewellery" value={[loan.jewellery_type, loan.metal_type || 'Gold'].filter(Boolean).join(' · ')} />
              <Info label="Purity" value={loan.gold_purity} />
              <Info label="Gross weight" value={`${loan.gross_weight ?? '—'} ${loan.rate_unit === 'carat' ? 'ct' : 'g'}`} />
              <Info label="Stone weight" value={`${loan.stone_weight ?? 0} ${loan.rate_unit === 'carat' ? 'ct' : 'g'}`} />
              <Info label="Net weight" value={`${loan.net_gold_weight ?? '—'} ${loan.rate_unit === 'carat' ? 'ct' : 'g'}`} />
              <Info label="Gold valuation" value={formatCurrency(loan.gold_valuation)} />
            </Section>

            <Section title="Saved loan terms">
              <Info label="Original loan amount" value={formatCurrency(loan.principal_amount)} />
              <Info label="Current principal balance" value={formatCurrency(preview.current_principal)} />
              <Info label="Interest type" value={loan.interest_type} />
              <Info label="Interest rate" value={`${loan.interest_rate ?? '—'} per ${loan.interest_frequency || 'period'}`} />
              <Info label="Interest period starts" value={formatDate(preview.period_start_date || loan.interest_calculation_start_date)} />
              <Info label="Loan date" value={formatDate(loan.loan_date)} />
              <Info label="Current maturity" value={formatDate(loan.maturity_date)} />
              <Info label="Renewal date" value={formatDate(preview.renewal_date)} />
              <Info label="Next maturity after renewal" value={formatDate(preview.next_maturity_date)} />
              <Info label="Compounding frequency" value={loan.compounding_frequency} />
              <Info label="Payment frequency" value={loan.payment_frequency} />
              <Info label="Grace period" value={`${loan.grace_period_days || 0} days`} />
              <Info label="Late-payment rate" value={loan.late_payment_interest_rate == null ? 'Not set' : `${loan.late_payment_interest_rate}%`} />
              <Info label="Processing fee" value={formatCurrency(loan.processing_fee)} />
              <Info label="Other charges" value={formatCurrency(loan.other_charges)} />
              <Info label="Notes" value={loan.notes} />
            </Section>

            <Section title="Payment and renewal">
              <AmountLine label="Current principal" value={formatCurrency(preview.current_principal)} />
              <AmountLine label="Regular interest accrued" value={formatCurrency(preview.regular_interest)} />
              <AmountLine label="Late payment fee" value={formatCurrency(preview.late_payment_fee)} />
              <AmountLine label="Total interest and late fee" value={formatCurrency(preview.accrued_interest)} />
              <AmountLine label="Total due" value={formatCurrency(preview.total_due)} strong />
              <Text className="text-[10px] leading-4 text-slate-500">
                Total due is current principal plus accrued interest. Processing and other charges are not included.
              </Text>
              {preview.current_principal > 0 ? (
                <Pressable
                  onPress={() => setPaymentLoan(loan)}
                  disabled={loan.loan_status !== 'Active'}
                  className="mt-2 min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 disabled:opacity-50"
                  accessibilityRole="button"
                  accessibilityLabel="Open loan payment"
                >
                  <Text className="text-sm font-extrabold text-white">Record Payment & Renew</Text>
                </Pressable>
              ) : (
                <Text className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-900">
                  This loan is paid in full. Complete and record the gold release before closing this loan.
                </Text>
              )}
            </Section>

            {manualReviewDue ? (
              <Section title="Customer notice and renewal status">
                <Text className="text-xs leading-5 text-slate-600">
                  Send the notice using the selected channel, then record it here. This app does not send messages automatically or decide ownership or return of pledged gold.
                </Text>
                <SelectField
                  label="Notice channel"
                  value={noticeMethod}
                  options={NOTICE_METHODS}
                  onSelect={value => setNoticeMethod(value as NoticeMethod)}
                  disabled={savingReview}
                />
                <Field
                  label="Customer message"
                  value={customerMessage}
                  onChangeText={setCustomerMessage}
                  multiline
                  maxLength={4000}
                />
                <Field
                  label="Internal contact notes"
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  placeholder="Record who was contacted and any response"
                  multiline
                  maxLength={2000}
                />
                <Pressable
                  onPress={() => handleReviewAction('notice_sent')}
                  disabled={savingReview || !customerMessage.trim() || !reviewNotes.trim()}
                  className="min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-3 disabled:opacity-50"
                  accessibilityRole="button"
                >
                  <Text className="text-xs font-bold text-white">
                    {savingReview ? 'Saving…' : 'Confirm notice sent & save record'}
                  </Text>
                </Pressable>

                {loan.loan_status === 'Suspended' ? (
                  <>
                    <Text className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                      Renewal is suspended. No collateral action has been taken.
                    </Text>
                    <Field
                      label="Reinstatement notes"
                      value={reviewActionNotes}
                      onChangeText={setReviewActionNotes}
                      placeholder="Reason for reinstating renewal access"
                      multiline
                      maxLength={2000}
                    />
                    <Pressable
                      onPress={() => handleReviewAction('reinstate')}
                      disabled={savingReview || !reviewActionNotes.trim()}
                      className="min-h-11 items-center justify-center rounded-xl border border-emerald-700 px-4 py-3 disabled:opacity-50"
                      accessibilityRole="button"
                    >
                      <Text className="text-xs font-bold text-primary">Reinstate renewal</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text className="text-xs leading-5 text-slate-600">
                      {renewalData?.reviewActions?.some(item => item.action_type === 'notice_sent')
                        ? 'A customer notice is recorded. An administrator may suspend renewal if required by the approved policy.'
                        : 'Record a customer notice before suspending renewal.'}
                    </Text>
                    <Field
                      label="Suspension notes"
                      value={reviewActionNotes}
                      onChangeText={setReviewActionNotes}
                      placeholder="Reason for suspending renewal access"
                      multiline
                      maxLength={2000}
                    />
                    <Pressable
                      onPress={() => handleReviewAction('suspend')}
                      disabled={
                        savingReview ||
                        !renewalData?.reviewActions?.some(item => item.action_type === 'notice_sent') ||
                        !reviewActionNotes.trim()
                      }
                      className="min-h-11 items-center justify-center rounded-xl bg-amber-700 px-4 py-3 disabled:opacity-50"
                      accessibilityRole="button"
                    >
                      <Text className="text-xs font-bold text-white">Suspend renewal</Text>
                    </Pressable>
                  </>
                )}
                {renewalData?.reviewActions?.length ? (
                  <View className="gap-2 border-t border-slate-100 pt-3">
                    <Text className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                      Review action history
                    </Text>
                    {renewalData.reviewActions.map(action => (
                      <View key={action.id} className="gap-1 rounded-xl bg-slate-50 p-3">
                        <Text className="text-xs font-bold text-slate-700">
                          {action.action_type.replaceAll('_', ' ')} · {formatDate(action.created_at)}
                          {action.notice_method ? ` · ${action.notice_method}` : ''}
                        </Text>
                        {action.customer_message ? (
                          <Text className="text-xs leading-5 text-slate-600">{action.customer_message}</Text>
                        ) : null}
                        {action.notes ? <Text className="text-xs leading-5 text-slate-500">{action.notes}</Text> : null}
                      </View>
                    ))}
                  </View>
                ) : null}
              </Section>
            ) : null}
          </ScrollView>
        )}
        {paymentLoan ? (
          <LoanPaymentModal
            loan={paymentLoan}
            onClose={() => setPaymentLoan(null)}
            onLoanUpdated={updatedLoan => {
              recordLoanUpdated(updatedLoan);
              setRenewalData(current => current ? { ...current, loan: updatedLoan } : current);
            }}
          />
        ) : null}
      </View>
    );
  }

  const todayKey = new Date().toLocaleDateString('en-CA');
  const maturingToday = loans.filter(loan => String(loan.maturity_date || '').slice(0, 10) === todayKey).length;
  const pastMaturity = loans.filter(loan => {
    const maturity = String(loan.maturity_date || '').slice(0, 10);
    return Boolean(maturity) && maturity < todayKey;
  }).length;
  const reviewCount = loans.filter(isReviewDue).length;

  return (
    <View className="flex-1 bg-background">
      <Header title="Loan Renewal" subtitle="Review balances, payments, and renewal options" onBack={onBack} />
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
          <SummaryCard label="Total loans" value={loading ? '—' : loans.length} tone="text-primary" />
          <SummaryCard label="Maturing today" value={loading ? '—' : maturingToday} tone="text-amber-700" />
          <SummaryCard label="Past maturity" value={loading ? '—' : pastMaturity} tone="text-rose-700" />
          <SummaryCard label="15-month reviews" value={loading ? '—' : reviewCount} tone="text-emerald-700" />
        </View>

        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <Field
            label="Search loans"
            value={search}
            onChangeText={setSearch}
            placeholder="Search number, customer, mobile..."
          />
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => openDatePicker('startDate')}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              accessibilityRole="button"
              accessibilityLabel="Renewal start date"
            >
              <Text className={`text-xs ${dateDraft.startDate ? 'text-slate-800' : 'text-slate-400'}`}>
                {dateDraft.startDate || 'Start YYYY-MM-DD'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openDatePicker('endDate')}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              accessibilityRole="button"
              accessibilityLabel="Renewal end date"
            >
              <Text className={`text-xs ${dateDraft.endDate ? 'text-slate-800' : 'text-slate-400'}`}>
                {dateDraft.endDate || 'End YYYY-MM-DD'}
              </Text>
            </Pressable>
            <Pressable
              onPress={applyDateRange}
              className="items-center justify-center rounded-xl bg-primary px-3"
              accessibilityRole="button"
              accessibilityLabel="Apply renewal date range"
            >
              <Text className="text-xs font-bold text-white">Apply</Text>
            </Pressable>
          </View>
          {dateError ? <Text className="text-xs font-medium text-rose-700">{dateError}</Text> : null}
          <View className="flex-row gap-2">
            {(['All', 'Active', 'Suspended'] as const).map(status => (
              <Pressable
                key={status}
                onPress={() => setStatusFilter(status)}
                className={`flex-1 items-center rounded-xl border px-3 py-2.5 ${
                  statusFilter === status ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: statusFilter === status }}
              >
                <Text className={`text-xs font-bold ${statusFilter === status ? 'text-primary' : 'text-slate-600'}`}>
                  {status}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? (
          <View className="gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-semibold text-rose-800">{error}</Text>
            <Pressable onPress={() => { loadLoans(); }} className="items-center rounded-xl bg-primary px-4 py-3">
              <Text className="text-sm font-bold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-white py-12">
            <ActivityIndicator size="large" color="#004D40" />
            <Text className="mt-3 text-sm text-slate-500">Loading renewal loans…</Text>
          </View>
        ) : filteredLoans.length ? (
          <View className="gap-3">
            {filteredLoans.map(loan => (
              <View key={loan.id} className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <Pressable
                  onPress={() => setSelectedLoanId(loan.id)}
                  className="flex-row items-start justify-between gap-3"
                  accessibilityRole="button"
                  accessibilityLabel={`View renewal details for ${loan.loan_number || loan.id}`}
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-xs font-semibold text-slate-500">{formatDate(loan.loan_date)}</Text>
                    <Text className="mt-1 text-base font-extrabold text-primary-dark">
                      {loan.loan_number || `Loan #${loan.id}`}
                    </Text>
                    <Text className="mt-1 text-sm font-semibold text-slate-800">
                      {loan.customer_name || 'Customer'}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {loan.customer_mobile || loan.customer_code || 'Contact unavailable'}
                    </Text>
                  </View>
                  <Text className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    loan.loan_status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                  }`}>
                    {loan.loan_status}
                  </Text>
                </Pressable>
                <View className="flex-row flex-wrap gap-3 border-t border-slate-100 pt-3">
                  <Info label="Principal" value={formatCurrency(loan.principal_amount)} />
                  <Info label="Balance" value={formatCurrency(loan.outstanding_principal ?? loan.principal_amount)} />
                  <Info label="Interest rate" value={`${getNumber(loan.interest_rate).toFixed(2)}%`} />
                  <Info label="Maturity" value={formatDate(loan.maturity_date)} />
                </View>
                <View className="flex-row gap-2">
                  {loan.loan_status === 'Active' ? (
                    <Pressable
                      onPress={() => setPaymentLoan(loan)}
                      className="min-h-10 flex-1 items-center justify-center rounded-xl bg-primary px-3 py-2"
                      accessibilityRole="button"
                      accessibilityLabel={`Pay loan ${loan.loan_number || loan.id}`}
                    >
                      <Text className="text-xs font-bold text-white">Pay</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => setSelectedLoanId(loan.id)}
                    className="min-h-10 flex-1 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"
                    accessibilityRole="button"
                    accessibilityLabel={`Review loan ${loan.loan_number || loan.id}`}
                  >
                    <Text className="text-xs font-bold text-primary">Review / Renew</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-slate-200 bg-white px-5 py-10">
            <Text className="text-base font-bold text-slate-800">
              {loans.length ? 'No loans match your filters' : 'No active loans are available for renewal'}
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">
              {loans.length ? 'Try another search or status.' : 'Eligible active and suspended loans will appear here.'}
            </Text>
          </View>
        )}
      </ScrollView>
      <Modal
        visible={datePickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerTarget(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white px-5 pb-6 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-slate-900">
                {datePickerTarget === 'startDate' ? 'Start date' : 'End date'}
              </Text>
              <Pressable
                onPress={() => setDatePickerTarget(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel date selection"
                className="px-2 py-1"
              >
                <Text className="text-sm font-bold text-slate-500">Cancel</Text>
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
                  const dateValue = date ? formatLocalDate(date) : '';
                  const selected = dateValue === formatLocalDate(selectedCalendarDate);
                  return (
                    <Pressable
                      key={dateValue || `empty-${weekIndex}-${dayIndex}`}
                      disabled={!date}
                      onPress={() => date && setSelectedCalendarDate(date)}
                      accessibilityRole="button"
                      accessibilityLabel={date ? dateValue : undefined}
                      accessibilityState={{ selected, disabled: !date }}
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
              onPress={applyDateSelection}
              accessibilityRole="button"
              accessibilityLabel="Apply date"
              className="mt-4 items-center rounded-xl bg-primary px-4 py-3"
            >
              <Text className="text-sm font-bold text-white">Select date</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {paymentLoan ? (
        <LoanPaymentModal
          loan={paymentLoan}
          onClose={() => setPaymentLoan(null)}
          onLoanUpdated={recordLoanUpdated}
        />
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-base font-extrabold text-slate-800">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

export default LoanRenewal;