import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import api from '../../api';
import type { CurrentRateSet, GoldRate } from '../DailyGoldRate/AllGoldRate';

type Customer = {
  id: string | number;
  customer_code?: string;
  full_name: string;
  mobile?: string;
  alternate_mobile?: string;
};
type InterestType = { type_key: string; name?: string; type_name?: string; enabled?: boolean };
type Option = { value: string; label: string };
type DatePickerTarget =
  | 'loan_date'
  | 'maturity_date'
  | 'interest_calculation_start_date';
type LoanForm = {
  jewellery_type: string;
  metal_type: string;
  gold_purity: string;
  gross_weight: string;
  stone_weight: string;
  interest_type: string;
  interest_rate: string;
  fixed_interest_amount: string;
  interest_frequency: string;
  custom_period_days: string;
  interest_calculation_start_date: string;
  compounding_frequency: string;
  day_count_convention: string;
  grace_period_days: string;
  late_payment_interest_rate: string;
  interest_free_days: string;
  minimum_interest_amount: string;
  maximum_interest_amount: string;
  processing_fee: string;
  other_charges: string;
  loan_date: string;
  maturity_date: string;
  payment_frequency: string;
  loan_status: string;
  notes: string;
  principal_amount: string;
};
type Props = { onCancel: () => void; onCreated: () => void };

const PRIMARY = '#004D40';
const FREQUENCIES: Option[] = [
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['quarterly', 'Quarterly'],
  ['half_yearly', 'Half-Yearly'],
  ['yearly', 'Yearly'],
  ['custom_period', 'Custom period'],
].map(([value, label]) => ({ value, label }));
const COMPOUND_FREQUENCIES = FREQUENCIES.filter(option => option.value !== 'custom_period');
const PAYMENT_FREQUENCIES = [
  ...COMPOUND_FREQUENCIES,
  { value: 'bullet', label: 'At maturity (bullet)' },
];
const JEWELLERY_TYPES: Option[] = [
  'Bangles',
  'Chains',
  'Necklaces',
  'Earrings',
  'Rings',
  'Bracelets',
  'Coins & Bars',
  'Other',
].map(value => ({ value, label: value }));

const localDate = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

const addMonthsToDate = (value: string, months: number) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  const index = year * 12 + month - 1 + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(
    Math.min(day, lastDay),
  ).padStart(2, '0')}`;
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const createBlankForm = (): LoanForm => {
  const today = localDate();
  return {
    jewellery_type: '',
    metal_type: 'Gold',
    gold_purity: '',
    gross_weight: '',
    stone_weight: '0',
    interest_type: '',
    interest_rate: '',
    fixed_interest_amount: '',
    interest_frequency: 'monthly',
    custom_period_days: '30',
    interest_calculation_start_date: today,
    compounding_frequency: 'monthly',
    day_count_convention: 'actual_365',
    grace_period_days: '0',
    late_payment_interest_rate: '',
    interest_free_days: '0',
    minimum_interest_amount: '',
    maximum_interest_amount: '',
    processing_fee: '0',
    other_charges: '0',
    loan_date: today,
    maturity_date: addMonthsToDate(today, 11),
    payment_frequency: 'monthly',
    loan_status: 'Active',
    notes: '',
    principal_amount: '',
  };
};

const normalizePurity = (value: string) => {
  const text = value.toUpperCase().replace(/[\s/()_-]/g, '');
  const codes: Record<string, string> = {
    '24K': '999',
    '22K': '916',
    '20K': '833',
    '18K': '750',
    '14K': '585',
  };
  return codes[text] || text;
};

const getRate = (rates: GoldRate[], metal: string, purity: string) =>
  rates.find(
    rate =>
      rate.metal_type.toLowerCase() === metal.toLowerCase() &&
      normalizePurity(rate.purity) === normalizePurity(purity),
  );

const getPeriods = (days: number, frequency: string, convention: string, customDays: number) => {
  const yearDays = convention === 'actual_365' ? 365 : 360;
  const divisor: Record<string, number> = {
    daily: 1,
    weekly: 7,
    monthly: yearDays / 12,
    quarterly: yearDays / 4,
    half_yearly: yearDays / 2,
    yearly: yearDays,
    custom_period: Math.max(1, customDays || 30),
  };
  return days / (divisor[frequency] || yearDays / 12);
};

const calculateInterest = (form: LoanForm, principal: number): number | null => {
  if (
    !form.interest_type ||
    !form.interest_calculation_start_date ||
    !form.maturity_date ||
    form.maturity_date <= form.interest_calculation_start_date ||
    !(principal > 0)
  ) {
    return null;
  }
  if (!isValidDate(form.interest_calculation_start_date) || !isValidDate(form.maturity_date)) {
    return null;
  }
  const start = Date.parse(`${form.interest_calculation_start_date}T00:00:00Z`);
  const end = Date.parse(`${form.maturity_date}T00:00:00Z`);
  const days =
    form.day_count_convention === '30_360'
      ? (() => {
          const [fromYear, fromMonth, fromDay] = form.interest_calculation_start_date
            .split('-')
            .map(Number);
          const [toYear, toMonth, toDay] = form.maturity_date.split('-').map(Number);
          return Math.max(
            0,
            (toYear - fromYear) * 360 +
              (toMonth - fromMonth) * 30 +
              Math.min(toDay, 30) -
              Math.min(fromDay, 30),
          );
        })()
      : Math.max(0, (end - start) / 86400000);
  const eligible = Math.max(
    0,
    days - Number(form.interest_free_days || 0) - Number(form.grace_period_days || 0),
  );
  const customDays = Number(form.custom_period_days);
  const periods = getPeriods(eligible, form.interest_frequency, form.day_count_convention, customDays);
  const rate = Number(form.interest_rate) / 100;
  let interest: number;
  if (form.interest_type === 'fixed') {
    interest = Number(form.fixed_interest_amount || 0) * periods;
  } else if (form.interest_type === 'compound') {
    const compounds = getPeriods(
      eligible,
      form.compounding_frequency,
      form.day_count_convention,
      customDays,
    );
    const periodRate = rate * (periods / Math.max(compounds, Number.EPSILON));
    interest = principal * ((1 + periodRate) ** compounds - 1);
  } else if (form.interest_type === 'reducing_balance') {
    const payPeriods =
      form.payment_frequency === 'bullet'
        ? 1
        : Math.max(
            1,
            getPeriods(eligible, form.payment_frequency, form.day_count_convention, customDays),
          );
    const perPeriod = principal / payPeriods;
    interest = 0;
    for (let index = 0; index < payPeriods; index += 1) {
      interest += Math.max(0, principal - perPeriod * index) * rate * (periods / payPeriods);
    }
  } else {
    interest = principal * rate * periods;
  }
  if (Number(form.minimum_interest_amount) > 0) {
    interest = Math.max(interest, Number(form.minimum_interest_amount));
  }
  if (Number(form.maximum_interest_amount) > 0) {
    interest = Math.min(interest, Number(form.maximum_interest_amount));
  }
  return Math.round(interest * 100) / 100;
};

const currency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const createLoanRequestKey = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const randomNibble = Math.floor(Math.random() * 16);
    const value = character === 'x' ? randomNibble : (randomNibble % 4) + 8;
    return value.toString(16);
  });

const errorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

function CreateLoan({ onCancel, onCreated }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interestTypes, setInterestTypes] = useState<InterestType[]>([]);
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [availableFunds, setAvailableFunds] = useState<number | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerLoanCount, setCustomerLoanCount] = useState(0);
  const [customerModal, setCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [picker, setPicker] = useState<{ title: string; options: Option[]; field: keyof LoanForm } | null>(
    null,
  );
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [draftDate, setDraftDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [form, setForm] = useState<LoanForm>(createBlankForm);
  const [otherJewelleryType, setOtherJewelleryType] = useState('');
  const [manualAmount, setManualAmount] = useState(false);
  const [image, setImage] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const requestKey = useRef<string | null>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [customerResponse, interestResponse, fundResponse, rateResponse] = await Promise.all([
        api.get('/customers'),
        api.get('/loans/interest-types'),
        api.get('/funds/accounts'),
        api.get<CurrentRateSet>('/gold-rates/current'),
      ]);
      if (!Array.isArray(customerResponse.data)) {
        throw new Error('The server returned an invalid customer list.');
      }
      if (!Array.isArray(interestResponse.data)) {
        throw new Error('The server returned invalid interest methods.');
      }
      if (!Array.isArray(fundResponse.data)) {
        throw new Error('The server returned an invalid fund account list.');
      }
      if (!Array.isArray(rateResponse.data?.rates)) {
        throw new Error('The server returned invalid current gold rates.');
      }
      const balance = fundResponse.data.reduce(
        (sum: number, account: { current_balance?: unknown }) => {
          const value = Number(account.current_balance);
          if (!Number.isFinite(value)) throw new Error('A fund account has an invalid balance.');
          return sum + value;
        },
        0,
      );
      const enabled = (interestResponse.data as InterestType[]).filter(type => type.enabled);
      setCustomers(customerResponse.data as Customer[]);
      setInterestTypes(enabled);
      setAvailableFunds(balance);
      setRates(rateResponse.data.rates);
      setForm(current => ({
        ...current,
        interest_type: current.interest_type || enabled[0]?.type_key || '',
      }));
    } catch (error) {
      console.error('Failed to load loan creation options:', error);
      setLoadError(errorMessage(error, 'Could not load loan form options.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const updateForm = (field: keyof LoanForm, value: string) => {
    setForm(current => {
      if (field === 'loan_date') {
        return {
          ...current,
          loan_date: value,
          maturity_date: addMonthsToDate(value, 11),
          interest_calculation_start_date:
            current.interest_calculation_start_date === current.loan_date
              ? value
              : current.interest_calculation_start_date,
        };
      }
      return field === 'metal_type'
        ? { ...current, metal_type: value, gold_purity: '' }
        : { ...current, [field]: value };
    });
  };

  const openDatePicker = (target: DatePickerTarget) => {
    const date = parseLocalDate(form[target]);
    setDraftDate(date);
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setDatePickerTarget(target);
  };

  const applyDateSelection = () => {
    if (!datePickerTarget) return;
    updateForm(datePickerTarget, formatLocalDate(draftDate));
    setDatePickerTarget(null);
  };

  const purityOptions = useMemo(
    () =>
      rates
        .filter(
          rate =>
            rate.metal_type.toLowerCase() === form.metal_type.toLowerCase() &&
            Number(rate.rate_per_unit ?? rate.rate_per_gram) > 0,
        )
        .map(rate => {
          const labels: Record<string, string> = {
            '999': '24K (999)',
            '916': '22K (916)',
            '833': '20K (833)',
            '750': '18K (750)',
            '585': '14K (585)',
          };
          return { value: rate.purity, label: labels[normalizePurity(rate.purity)] || rate.purity };
        }),
    [form.metal_type, rates],
  );
  const activeRate = getRate(rates, form.metal_type, form.gold_purity);
  const ratePerUnit = Number(activeRate?.rate_per_unit ?? activeRate?.rate_per_gram) || 0;
  const weightUnit = activeRate?.rate_unit === 'carat' ? 'ct' : 'g';
  const netWeight = Math.max(0, Number(form.gross_weight || 0) - Number(form.stone_weight || 0));
  const valuation = netWeight * ratePerUnit;
  const autoAmount = valuation > 0 ? (Math.round(valuation * 50) / 100).toFixed(2) : '';
  const principal = Number(manualAmount ? form.principal_amount : autoAmount);
  const interestEstimate = calculateInterest(form, principal);
  const otherCharges = Number(form.processing_fee || 0) + Number(form.other_charges || 0);
  const totalEstimate = principal + (interestEstimate || 0) + otherCharges;
  const filteredCustomers = customers.filter(item => {
    const search = customerSearch.trim().toLowerCase();
    return (
      !search ||
      [item.id, item.customer_code, item.full_name, item.mobile, item.alternate_mobile].some(value =>
        String(value || '').toLowerCase().includes(search),
      )
    );
  });

  const selectCustomer = async (item: Customer) => {
    setCustomerModal(false);
    try {
      const [detailResponse, loansResponse] = await Promise.all([
        api.get(`/customers/${item.id}`),
        api.get(`/customers/${item.id}/loans`),
      ]);
      if (!Array.isArray(loansResponse.data)) {
        throw new Error('The server returned invalid customer loan history.');
      }
      setCustomer(detailResponse.data as Customer);
      setCustomerLoanCount(loansResponse.data.length);
    } catch (error) {
      console.error('Failed to load selected customer:', error);
      setCustomer(null);
      Alert.alert('Customer unavailable', errorMessage(error, 'Could not load customer details.'));
    }
  };

  const selectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Could not choose an image.');
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      if (asset.type && !['image/png', 'image/jpeg'].includes(asset.type)) {
        Alert.alert('Unsupported image', 'Choose a PNG or JPG pledged-gold image.');
        return;
      }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Image too large', 'Gold image must be 5 MB or smaller.');
        return;
      }
      setImage(asset);
    } catch (error) {
      console.error('Failed to select pledged gold image:', error);
      Alert.alert('Image selection failed', errorMessage(error, 'Could not choose an image.'));
    }
  };

  const refreshFunds = async () => {
    const { data } = await api.get('/funds/accounts');
    if (!Array.isArray(data)) throw new Error('The server returned an invalid fund account list.');
    return data.reduce((sum: number, account: { current_balance?: unknown }) => {
      const value = Number(account.current_balance);
      if (!Number.isFinite(value)) throw new Error('A fund account has an invalid balance.');
      return sum + value;
    }, 0);
  };

  const submitLoan = async () => {
    if (saving) return;
    if (!customer) {
      Alert.alert('Customer required', 'Select a registered customer before saving the loan.');
      return;
    }
    const gross = Number(form.gross_weight);
    const stone = Number(form.stone_weight || 0);
    if (!(gross > 0) || stone < 0 || stone >= gross) {
      Alert.alert('Check weights', 'Net pledged-gold weight must be greater than zero.');
      return;
    }
    if (!form.jewellery_type || (form.jewellery_type === 'Other' && !otherJewelleryType.trim())) {
      Alert.alert('Jewellery type required', 'Select a type or enter the jewellery description.');
      return;
    }
    if (!form.gold_purity || !(ratePerUnit > 0)) {
      Alert.alert('Current rate required', 'Select a metal purity with an active rate.');
      return;
    }
    if (!form.interest_type || !(Number(form.interest_rate) >= 0)) {
      Alert.alert('Interest details required', 'Choose an interest method and enter its rate.');
      return;
    }
    if (
      !isValidDate(form.loan_date) ||
      !isValidDate(form.maturity_date) ||
      form.maturity_date <= form.loan_date
    ) {
      Alert.alert('Check loan dates', 'Enter valid dates; maturity must be later than the loan date.');
      return;
    }
    if (!isValidDate(form.interest_calculation_start_date)) {
      Alert.alert('Start date required', 'Enter a valid interest calculation start date.');
      return;
    }
    if (!(principal > 0)) {
      Alert.alert('Loan amount required', 'Enter a loan amount greater than zero.');
      return;
    }
    setSaving(true);
    try {
      const refreshedBalance = await refreshFunds();
      setAvailableFunds(refreshedBalance);
      if (principal > refreshedBalance) {
        Alert.alert(
          'Insufficient funds',
          `Requested ${currency(principal)}; available balance is ${currency(refreshedBalance)}.`,
        );
        return;
      }
      const payload = {
        ...form,
        jewellery_type:
          form.jewellery_type === 'Other' ? otherJewelleryType.trim() : form.jewellery_type,
        customer_id: customer.id,
        gross_weight: gross,
        stone_weight: stone,
        net_gold_weight: netWeight,
        gold_valuation: valuation,
        principal_amount: principal,
        loan_amount_mode: manualAmount ? 'manual' : 'auto',
        idempotency_key:
          requestKey.current ||
          (requestKey.current = createLoanRequestKey()),
      };
      if (image?.uri) {
        const body = new FormData();
        Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)));
        body.append(
          'gold_image',
          {
            uri: image.uri,
            name: image.fileName || `pledged-gold-${Date.now()}.jpg`,
            type: image.type || 'image/jpeg',
          } as unknown as Blob,
        );
        await api.post('/loans', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/loans', payload);
      }
      Alert.alert('Loan created', 'The loan has been saved successfully.');
      onCreated();
    } catch (error) {
      console.error('Failed to create loan:', error);
      const message = errorMessage(error, 'Could not create this loan.');
      if (message.toLowerCase().includes('loan request key is invalid')) {
        requestKey.current = null;
      }
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
        <StatusBar barStyle="light-content" />
        <LoanHeader onCancel={onCancel} />
        <View className="flex-1 items-center justify-center bg-background px-6">
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text className="mt-3 text-sm font-semibold text-slate-600">Loading loan form…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (loadError) {
    return (
      <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
        <StatusBar barStyle="light-content" />
        <LoanHeader onCancel={onCancel} />
        <View className="flex-1 items-center justify-center bg-background px-6">
          <View className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <Text className="text-base font-extrabold text-rose-900">Could not load loan options</Text>
            <Text className="mt-2 text-sm leading-5 text-rose-800">{loadError}</Text>
            <View className="mt-4 flex-row gap-3">
              <ActionButton label="Back" onPress={onCancel} secondary />
              <ActionButton label="Try again" onPress={loadOptions} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const selectedCustomer = customer
    ? `${customer.customer_code || customer.id} · ${customer.full_name}`
    : 'Select a registered customer';
  const openPicker = (title: string, options: Option[], field: keyof LoanForm) =>
    setPicker({ title, options, field });
  const pickFrequency = (field: keyof LoanForm, title: string, options: Option[]) =>
    openPicker(title, options, field);

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <LoanHeader onCancel={onCancel} disabled={saving} />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 py-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-2xl bg-primary p-4">
            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Available lending funds
            </Text>
            <Text className="mt-1 text-2xl font-extrabold text-white">
              {currency(availableFunds || 0)}
            </Text>
            <Text className="mt-1 text-[11px] text-emerald-100">Refreshed again before saving.</Text>
          </View>

          <FormSection title="Customer">
            <Pressable
              onPress={() => setCustomerModal(true)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3.5"
              accessibilityRole="button"
              accessibilityLabel={customer ? `Selected customer ${customer.full_name}` : 'Select a registered customer'}
            >
              <Text className={`text-sm font-semibold ${customer ? 'text-slate-800' : 'text-slate-400'}`}>
                {selectedCustomer}
              </Text>
            </Pressable>
            {customer ? (
              <View className="rounded-xl bg-emerald-50 px-3.5 py-3">
                <Text className="text-xs font-bold text-emerald-900">
                  {customer.mobile || 'No mobile number'}
                </Text>
                <Text className="mt-1 text-[11px] text-emerald-800">
                  Existing loans: {customerLoanCount}
                </Text>
              </View>
            ) : null}
          </FormSection>

          <FormSection title="Pledged jewellery">
            <SelectField
              label="Jewellery type"
              value={form.jewellery_type}
              onPress={() => openPicker('Jewellery type', JEWELLERY_TYPES, 'jewellery_type')}
            />
            {form.jewellery_type === 'Other' ? (
              <InputField
                label="Jewellery description"
                value={otherJewelleryType}
                onChangeText={setOtherJewelleryType}
              />
            ) : null}
            <SelectField
              label="Metal"
              value={form.metal_type}
              onPress={() =>
                openPicker(
                  'Metal',
                  ['Gold', 'Silver', 'Platinum', 'Diamond'].map(value => ({ value, label: value })),
                  'metal_type',
                )
              }
            />
            <SelectField
              label="Purity"
              value={purityOptions.find(option => option.value === form.gold_purity)?.label || ''}
              placeholder="Select purity"
              onPress={() => openPicker('Purity', purityOptions, 'gold_purity')}
            />
            {activeRate ? (
              <View className="rounded-xl bg-slate-50 p-3">
                <Text className="text-xs font-bold text-slate-700">
                  Current rate: {currency(ratePerUnit)} / {weightUnit}
                </Text>
              </View>
            ) : null}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <InputField
                  label={`Gross weight (${weightUnit})`}
                  value={form.gross_weight}
                  onChangeText={value => updateForm('gross_weight', value)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <InputField
                  label={`Stone weight (${weightUnit})`}
                  value={form.stone_weight}
                  onChangeText={value => updateForm('stone_weight', value)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View className="gap-2 rounded-xl bg-emerald-50 p-3">
              <MetricRow label="Net weight" value={`${netWeight.toFixed(3)} ${weightUnit}`} />
              <MetricRow label="Estimated valuation" value={currency(valuation)} />
            </View>
            <Pressable
              onPress={selectImage}
              className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"
              accessibilityRole="button"
            >
              <Text className="text-xs font-bold text-slate-700">
                {image ? 'Change pledged-gold image' : 'Add pledged-gold image (optional)'}
              </Text>
              {image?.uri ? (
                <Image source={{ uri: image.uri }} className="mt-3 h-40 w-full rounded-lg" resizeMode="cover" />
              ) : null}
            </Pressable>
          </FormSection>

          <FormSection title="Loan amount">
            <View className="flex-row gap-2">
              <ChoicePill
                label="Auto · 50% valuation"
                selected={!manualAmount}
                onPress={() => setManualAmount(false)}
              />
              <ChoicePill
                label="Manual amount"
                selected={manualAmount}
                onPress={() => {
                  setManualAmount(true);
                  updateForm('principal_amount', form.principal_amount || autoAmount);
                }}
              />
            </View>
            <InputField
              label="Principal amount (₹)"
              value={manualAmount ? form.principal_amount : autoAmount}
              onChangeText={value => updateForm('principal_amount', value)}
              keyboardType="decimal-pad"
              editable={manualAmount}
            />
            {manualAmount ? (
              <Text className="text-[11px] text-slate-500">
                Available funds: {currency(availableFunds || 0)}
              </Text>
            ) : null}
          </FormSection>

          <FormSection title="Interest and repayment">
            <SelectField
              label="Interest method"
              value={
                interestTypes.find(type => type.type_key === form.interest_type)?.name ||
                interestTypes.find(type => type.type_key === form.interest_type)?.type_name ||
                form.interest_type
              }
              placeholder="Select interest method"
              onPress={() =>
                openPicker(
                  'Interest method',
                  interestTypes.map(type => ({
                    value: type.type_key,
                    label: type.name || type.type_name || type.type_key,
                  })),
                  'interest_type',
                )
              }
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <InputField
                  label="Rate (%)"
                  value={form.interest_rate}
                  onChangeText={value => updateForm('interest_rate', value)}
                  keyboardType="decimal-pad"
                />
              </View>
              {form.interest_type === 'fixed' ? (
                <View className="flex-1">
                  <InputField
                    label="Fixed amount / period (₹)"
                    value={form.fixed_interest_amount}
                    onChangeText={value => updateForm('fixed_interest_amount', value)}
                    keyboardType="decimal-pad"
                  />
                </View>
              ) : null}
            </View>
            <SelectField
              label="Interest frequency"
              value={optionLabel(FREQUENCIES, form.interest_frequency)}
              onPress={() => pickFrequency('interest_frequency', 'Interest frequency', FREQUENCIES)}
            />
            {form.interest_frequency === 'custom_period' ? (
              <InputField
                label="Custom period (days)"
                value={form.custom_period_days}
                onChangeText={value => updateForm('custom_period_days', value)}
                keyboardType="number-pad"
              />
            ) : null}
            {form.interest_type === 'compound' ? (
              <SelectField
                label="Compounding frequency"
                value={optionLabel(COMPOUND_FREQUENCIES, form.compounding_frequency)}
                onPress={() =>
                  pickFrequency('compounding_frequency', 'Compounding frequency', COMPOUND_FREQUENCIES)
                }
              />
            ) : null}
            <SelectField
              label="Payment frequency"
              value={optionLabel(PAYMENT_FREQUENCIES, form.payment_frequency)}
              onPress={() => pickFrequency('payment_frequency', 'Payment frequency', PAYMENT_FREQUENCIES)}
            />
            <SelectField
              label="Day-count convention"
              value={form.day_count_convention === '30_360' ? '30 / 360' : 'Actual / 365'}
              onPress={() =>
                openPicker(
                  'Day-count convention',
                  [
                    { value: 'actual_365', label: 'Actual / 365' },
                    { value: '30_360', label: '30 / 360' },
                  ],
                  'day_count_convention',
                )
              }
            />
            <SelectField
              label="Loan status"
              value={form.loan_status}
              onPress={() =>
                openPicker(
                  'Loan status',
                  ['Active', 'Suspended', 'Inactive'].map(value => ({ value, label: value })),
                  'loan_status',
                )
              }
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <DateField
                  label="Loan date"
                  value={form.loan_date}
                  accessibilityLabel="Select loan date"
                  onPress={() => openDatePicker('loan_date')}
                />
              </View>
              <View className="flex-1">
                <DateField
                  label="Maturity date"
                  value={form.maturity_date}
                  accessibilityLabel="Select maturity date"
                  onPress={() => openDatePicker('maturity_date')}
                />
              </View>
            </View>
            <DateField
              label="Interest start date"
              value={form.interest_calculation_start_date}
              accessibilityLabel="Select interest start date"
              onPress={() => openDatePicker('interest_calculation_start_date')}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <InputField
                  label="Grace period (days)"
                  value={form.grace_period_days}
                  onChangeText={value => updateForm('grace_period_days', value)}
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <InputField
                  label="Interest-free days"
                  value={form.interest_free_days}
                  onChangeText={value => updateForm('interest_free_days', value)}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <InputField
                  label="Late interest rate (%)"
                  value={form.late_payment_interest_rate}
                  onChangeText={value => updateForm('late_payment_interest_rate', value)}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                />
              </View>
              <View className="flex-1">
                <InputField
                  label="Minimum interest (₹)"
                  value={form.minimum_interest_amount}
                  onChangeText={value => updateForm('minimum_interest_amount', value)}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                />
              </View>
            </View>
            <InputField
              label="Maximum interest (₹)"
              value={form.maximum_interest_amount}
              onChangeText={value => updateForm('maximum_interest_amount', value)}
              keyboardType="decimal-pad"
              placeholder="Optional"
            />
          </FormSection>

          <FormSection title="Fees, charges and notes">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <InputField
                  label="Processing fee (₹)"
                  value={form.processing_fee}
                  onChangeText={value => updateForm('processing_fee', value)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <InputField
                  label="Other charges (₹)"
                  value={form.other_charges}
                  onChangeText={value => updateForm('other_charges', value)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <InputField
              label="Notes"
              value={form.notes}
              onChangeText={value => updateForm('notes', value)}
              multiline
              placeholder="Add important loan notes"
            />
          </FormSection>

          <FormSection title="Estimated maturity summary">
            <MetricRow label="Principal" value={currency(principal || 0)} />
            <MetricRow
              label="Estimated interest"
              value={interestEstimate === null ? 'Enter loan terms' : currency(interestEstimate)}
            />
            <MetricRow label="Fees and charges" value={currency(otherCharges)} />
            <View className="mt-2 border-t border-slate-200 pt-3">
              <MetricRow label="Estimated total" value={currency(totalEstimate || 0)} strong />
            </View>
            <Text className="text-[10px] leading-4 text-slate-500">
              Estimate only. Final interest is subject to the selected loan terms.
            </Text>
          </FormSection>
        </ScrollView>
        <View className="flex-row gap-3 border-t border-slate-200 bg-white px-4 py-3">
          <ActionButton label="Cancel" onPress={onCancel} secondary disabled={saving} />
          <ActionButton
            label={saving ? 'Saving loan…' : 'Create loan'}
            onPress={submitLoan}
            loading={saving}
            disabled={saving || interestTypes.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={customerModal} transparent animationType="slide" onRequestClose={() => setCustomerModal(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[80%] rounded-t-3xl bg-white px-4 pb-8 pt-5">
            <ModalHeading title="Choose customer" onClose={() => setCustomerModal(false)} />
            <TextInput
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholder="Search name, code, or phone"
              placeholderTextColor="#94A3B8"
              className="mb-3 rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-800"
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredCustomers.map(item => (
                <Pressable
                  key={String(item.id)}
                  onPress={() => selectCustomer(item)}
                  className="border-b border-slate-100 py-3"
                  accessibilityRole="button"
                  accessibilityLabel={`Choose customer ${item.full_name}`}
                >
                  <Text className="text-sm font-bold text-slate-800">{item.full_name}</Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    {item.customer_code || item.id}{item.mobile ? ` · ${item.mobile}` : ''}
                  </Text>
                </Pressable>
              ))}
              {filteredCustomers.length === 0 ? (
                <Text className="py-8 text-center text-sm text-slate-500">No matching customers.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={Boolean(picker)} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[70%] rounded-t-3xl bg-white px-4 pb-8 pt-5">
            <ModalHeading title={picker?.title || ''} onClose={() => setPicker(null)} />
            <ScrollView>
              {(picker?.options || []).map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    if (picker) updateForm(picker.field, option.value);
                    setPicker(null);
                  }}
                  className="border-b border-slate-100 py-3.5"
                >
                  <Text className="text-sm font-semibold text-slate-800">{option.label}</Text>
                </Pressable>
              ))}
              {picker?.options.length === 0 ? (
                <Text className="py-8 text-center text-sm text-slate-500">No active options.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
                {datePickerTarget === 'loan_date'
                  ? 'Loan date'
                  : datePickerTarget === 'maturity_date'
                    ? 'Maturity date'
                    : 'Interest start date'}
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
                  const selected = dateValue === formatLocalDate(draftDate);
                  const beforeLoanDate =
                    datePickerTarget === 'maturity_date' && dateValue < form.loan_date;
                  return (
                    <Pressable
                      key={dateValue || `empty-${weekIndex}-${dayIndex}`}
                      disabled={!date || beforeLoanDate}
                      onPress={() => date && setDraftDate(date)}
                      accessibilityRole="button"
                      accessibilityLabel={date ? dateValue : undefined}
                      accessibilityState={{ selected, disabled: !date || beforeLoanDate }}
                      className={`m-0.5 h-10 flex-1 items-center justify-center rounded-full ${
                        selected
                          ? 'bg-primary'
                          : date && !beforeLoanDate
                            ? 'active:bg-emerald-50'
                            : ''
                      }`}
                    >
                      {date ? (
                        <Text
                          className={`text-sm ${
                            selected
                              ? 'font-bold text-white'
                              : beforeLoanDate
                                ? 'text-slate-300'
                                : 'text-slate-700'
                          }`}
                        >
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
              <Text className="text-sm font-bold text-white">Apply date</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LoanHeader({
  onCancel,
  disabled = false,
}: {
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <View className="h-14 flex-row items-center border-b border-[#00382E] bg-primary px-3">
      <Pressable
        onPress={onCancel}
        disabled={disabled}
        className="mr-2 h-9 w-9 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
        accessibilityRole="button"
        accessibilityLabel="Back to loans"
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="m15 18-6-6 6-6"
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <View className="flex-1">
        <Text className="text-base font-extrabold tracking-wide text-white" numberOfLines={1}>
          Create Loan
        </Text>
        <View className="flex-row items-center">
          <Text className="text-[10px] font-medium text-emerald-200" numberOfLines={1}>
            Sri Golds Jewellery
          </Text>
          <Text className="mx-1.5 text-[8px] text-emerald-400">◆</Text>
          <View className="rounded bg-emerald-950/60 px-1.5 py-0.5">
            <Text className="text-[9px] font-bold tracking-wider text-accent-light">NEW LOAN</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function optionLabel(options: Option[], value: string) {
  return options.find(option => option.value === value)?.label || value;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-sm font-extrabold text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-800 ${
          multiline ? 'min-h-24' : ''
        } ${!editable ? 'bg-slate-50 text-slate-500' : ''}`}
      />
    </View>
  );
}

function DateField({
  label,
  value,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  value: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-slate-700">{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3"
      >
        <Text className="text-sm font-medium text-slate-800">{value}</Text>
        <Text className="text-slate-400">▦</Text>
      </Pressable>
    </View>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-slate-700">{label}</Text>
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3"
        accessibilityRole="button"
      >
        <Text className={`text-sm font-medium ${value ? 'text-slate-800' : 'text-slate-400'}`}>
          {value || placeholder || `Select ${label.toLowerCase()}`}
        </Text>
        <Text className="text-slate-400">⌄</Text>
      </Pressable>
    </View>
  );
}

function MetricRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className={`text-xs ${strong ? 'font-extrabold text-slate-900' : 'text-slate-600'}`}>
        {label}
      </Text>
      <Text className={`text-right text-xs ${strong ? 'font-extrabold text-primary' : 'font-bold text-slate-800'}`}>
        {value}
      </Text>
    </View>
  );
}

function ChoicePill({
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
      className={`flex-1 items-center rounded-xl border px-3 py-3 ${
        selected ? 'border-primary bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text className={`text-center text-[11px] font-bold ${selected ? 'text-primary' : 'text-slate-600'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  secondary = false,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-3 ${
        secondary ? 'border border-slate-300 bg-white' : 'bg-primary'
      } ${disabled ? 'opacity-60' : ''}`}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
      <Text className={`text-center text-sm font-bold ${secondary ? 'text-slate-700' : 'text-white'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function ModalHeading({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <Text className="text-lg font-extrabold text-slate-900">{title}</Text>
      <Pressable onPress={onClose}>
        <Text className="font-bold text-primary">Close</Text>
      </Pressable>
    </View>
  );
}

export default CreateLoan;