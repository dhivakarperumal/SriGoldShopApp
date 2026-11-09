import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';

type RecordValue = Record<string, unknown>;
type Product = RecordValue & {
  id: string | number;
  name: string;
  category?: string;
  purity?: string;
  metal_type?: string;
  status?: string;
  total_stock?: number | string;
  mrp?: number | string;
  offer_price?: number | string;
  final_selling_price?: number | string;
  gold_rate_per_gram?: number | string;
  rate_unit?: string;
};
type Customer = { name: string; phone: string; email: string; address: string };
type BillProduct = RecordValue & {
  product_id?: string | number;
  product_name?: string;
  price?: number | string;
  category?: string;
  purity?: string;
  images?: unknown;
};
type ExchangeItem = {
  product_name: string;
  category: string;
  metal_type: string;
  purity: string;
  weight: string;
  wastage_weight: string;
  rate_per_unit: string;
  rate_unit: string;
};
type Bill = RecordValue & {
  id: string | number;
  invoice_no?: string;
  customers?: unknown;
  products?: unknown;
  exchanges?: unknown;
  payment_type?: string;
  total_amount?: number | string;
  paid_amount?: number | string;
  balance_due?: number | string;
  sub_total?: number | string;
  gst_amount?: number | string;
  discount_amount?: number | string;
  created_at?: string;
};
type GoldRate = {
  metal_type: string;
  purity: string;
  rate_per_unit?: number | string;
  rate_per_gram?: number | string;
  rate_unit?: string;
};
type FundAccount = { id: string | number; name: string; is_active?: boolean };
type PaymentForm = {
  bill: Bill;
  payment_kind: 'PAYMENT' | 'REFUND';
  amount: string;
  account_id: string;
  payment_method: string;
  payment_date: string;
  reference_number: string;
};

const PAGE_SIZE = 100;
const EMPTY_CUSTOMER: Customer = { name: '', phone: '', email: '', address: '' };
const EMPTY_EXCHANGE: ExchangeItem = {
  product_name: '',
  category: '',
  metal_type: 'Gold',
  purity: '916',
  weight: '',
  wastage_weight: '',
  rate_per_unit: '',
  rate_unit: 'gram',
};
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'];
const inputClass =
  'mt-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
};

const getNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const currency = (value: unknown): string =>
  `₹${getNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const decodeArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const getProductPrice = (product: Product): number =>
  getNumber(product.final_selling_price || product.offer_price || product.mrp);

const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const localDateTime = (): string => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function Field({
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
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View className="flex-1">
      <Text className="text-xs font-bold text-slate-600">{label}</Text>
      <TextInput
        className={`${inputClass} ${multiline ? 'min-h-20' : ''}`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      className={`items-center justify-center rounded-xl px-4 py-3 ${
        secondary ? 'border border-slate-200 bg-white' : 'bg-primary'
      } ${disabled ? 'opacity-50' : ''}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text className={`text-sm font-bold ${secondary ? 'text-slate-700' : 'text-white'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Billing() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [accounts, setAccounts] = useState<FundAccount[]>([]);
  const [loadError, setLoadError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [ratesError, setRatesError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'FULL_PAYMENT' | 'EXCHANGE_GOLD'>('ALL');
  const [showForm, setShowForm] = useState(true);
  const [billStep, setBillStep] = useState<1 | 2 | 3>(1);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const [products, setProducts] = useState<BillProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [metalTypeFilter, setMetalTypeFilter] = useState('All metals');
  const [showProductPicker, setShowProductPicker] = useState(true);
  const [showProductPreview, setShowProductPreview] = useState(false);
  const [paymentType, setPaymentType] = useState<'FULL_PAYMENT' | 'EXCHANGE_GOLD'>('FULL_PAYMENT');
  const [exchanges, setExchanges] = useState<ExchangeItem[]>([]);
  const [gstRate, setGstRate] = useState('0');
  const [discount, setDiscount] = useState('');
  const [payment, setPayment] = useState<PaymentForm | null>(null);
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);
  const [paymentMethodIndex, setPaymentMethodIndex] = useState(0);

  const loadBills = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/billings');
      if (!Array.isArray(data)) throw new Error('The server returned an invalid bills list.');
      setBills(data as Bill[]);
    } catch (error) {
      console.error('Failed to load bills:', error);
      setLoadError(getErrorMessage(error, 'Could not load bills.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogError('');
    try {
      const firstResponse = await api.get('/products', {
        params: { page: 1, limit: PAGE_SIZE, status: 'All' },
      });
      const firstData = firstResponse.data as Product[] | {
        products?: Product[];
        pagination?: { totalPages?: number; total?: number };
      };
      const firstProducts = Array.isArray(firstData) ? firstData : firstData.products ?? [];
      const allProducts = [...firstProducts];
      const ids = new Set(allProducts.map(product => String(product.id)));
      const declaredPages = Array.isArray(firstData)
        ? 0
        : Math.max(
            getNumber(firstData.pagination?.totalPages),
            Math.ceil(getNumber(firstData.pagination?.total) / PAGE_SIZE),
          );
      for (let page = 2; page <= declaredPages; page += 1) {
        const { data } = await api.get('/products', {
          params: { page, limit: PAGE_SIZE, status: 'All' },
        });
        const pageProducts: Product[] = Array.isArray(data) ? data : data?.products ?? [];
        for (const product of pageProducts) {
          if (!ids.has(String(product.id))) {
            ids.add(String(product.id));
            allProducts.push(product);
          }
        }
        if (pageProducts.length === 0) break;
      }
      if (!declaredPages && firstProducts.length === PAGE_SIZE) {
        for (let page = 2; page <= 100; page += 1) {
          const { data } = await api.get('/products', {
            params: { page, limit: PAGE_SIZE, status: 'All' },
          });
          const pageProducts: Product[] = Array.isArray(data) ? data : data?.products ?? [];
          for (const product of pageProducts) {
            if (!ids.has(String(product.id))) {
              ids.add(String(product.id));
              allProducts.push(product);
            }
          }
          if (pageProducts.length < PAGE_SIZE) break;
        }
      }
      setCatalog(allProducts);
    } catch (error) {
      console.error('Failed to load billing product catalog:', error);
      setCatalogError(getErrorMessage(error, 'Could not load products.'));
    }
  }, []);

  const loadSupportingData = useCallback(async () => {
    try {
      const { data } = await api.get('/gold-rates/current');
      if (!Array.isArray(data?.rates)) throw new Error('The current rate list is invalid.');
      setRates(data.rates);
      setRatesError('');
    } catch (error) {
      console.error('Failed to load gold rates for billing:', error);
      setRatesError(getErrorMessage(error, 'Could not load current rates.'));
    }

    try {
      const { data } = await api.get('/funds/accounts');
      if (!Array.isArray(data)) throw new Error('The server returned an invalid account list.');
      setAccounts(data.filter((account: FundAccount) => account.is_active));
      setAccountError('');
    } catch (error) {
      console.error('Failed to load fund accounts for billing:', error);
      setAccounts([]);
      setAccountError(getErrorMessage(error, 'Could not load fund accounts.'));
    }
  }, []);

  useEffect(() => {
    loadBills();
    loadCatalog();
    loadSupportingData();
  }, [loadBills, loadCatalog, loadSupportingData]);

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bills.filter(bill => {
      if (paymentFilter !== 'ALL' && bill.payment_type !== paymentFilter) return false;
      if (!query) return true;
      const customers = decodeArray<RecordValue>(bill.customers);
      const billProducts = decodeArray<RecordValue>(bill.products);
      return [
        bill.invoice_no,
        ...customers.flatMap(item => [item.name, item.phone, item.email]),
        ...billProducts.flatMap(item => [item.product_name, item.category]),
      ].some(value => String(value ?? '').toLowerCase().includes(query));
    });
  }, [bills, paymentFilter, search]);

  const totalBilled = bills.reduce((sum, bill) => sum + getNumber(bill.total_amount), 0);
  const todayKey = new Date().toLocaleDateString('en-CA');
  const todayBilled = bills.reduce((sum, bill) => {
    if (!bill.created_at || new Date(bill.created_at).toLocaleDateString('en-CA') !== todayKey) {
      return sum;
    }
    return sum + getNumber(bill.total_amount);
  }, 0);

  const subtotal = products.reduce((sum, product) => sum + getNumber(product.price), 0);
  const exchangeCredit = exchanges.reduce((sum, exchange) => {
    const weight = getNumber(exchange.weight);
    const wastage = getNumber(exchange.wastage_weight);
    const rate = getNumber(exchange.rate_per_unit);
    return sum + Math.max(0, weight - wastage) * rate;
  }, 0);
  const discountAmount = discount.trim() ? Number(discount) : 0;
  const gstRateNumber = gstRate.trim() ? Number(gstRate) : 0;
  const validDiscount =
    Number.isFinite(discountAmount) &&
    discountAmount >= 0 &&
    discountAmount + exchangeCredit <= subtotal;
  const validGst =
    Number.isFinite(gstRateNumber) && gstRateNumber >= 0 && gstRateNumber <= 100;
  const gst = validDiscount && validGst
    ? Math.round(Math.max(0, subtotal - discountAmount - exchangeCredit) * gstRateNumber) / 100
    : 0;
  const total = Math.round((subtotal - discountAmount - exchangeCredit + gst) * 100) / 100;
  const visibleProducts = catalog.filter(product => {
    const query = productSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      `${product.name} ${product.category ?? ''} ${product.purity ?? ''} ${product.product_code ?? ''}`
        .toLowerCase()
        .includes(query);
    const matchesCategory =
      categoryFilter === 'All categories' ||
      String(product.category ?? '').toLowerCase() === categoryFilter.toLowerCase();
    const matchesMetalType =
      metalTypeFilter === 'All metals' ||
      String(product.metal_type ?? 'Gold').toLowerCase() === metalTypeFilter.toLowerCase();
    return (
      matchesSearch &&
      matchesCategory &&
      matchesMetalType &&
      String(product.status ?? 'Active').toLowerCase() === 'active'
    );
  });

  const categoryOptions = useMemo(
    () => [
      'All categories',
      ...Array.from(new Set(catalog.map(product => String(product.category || '').trim()).filter(Boolean))),
    ],
    [catalog],
  );
  const metalTypeOptions = useMemo(
    () => [
      'All metals',
      ...Array.from(new Set(catalog.map(product => String(product.metal_type || 'Gold').trim()).filter(Boolean))),
    ],
    [catalog],
  );

  const resetForm = () => {
    setBillStep(1);
    setEditingBill(null);
    setCustomer(EMPTY_CUSTOMER);
    setProducts([]);
    setExchanges([]);
    setPaymentType('FULL_PAYMENT');
    setGstRate('0');
    setDiscount('');
    setProductSearch('');
    setCategoryFilter('All categories');
    setMetalTypeFilter('All metals');
    setShowProductPicker(true);
  };

  const openNewBill = () => {
    resetForm();
    setShowForm(true);
    setShowProductPicker(true);
  };

  const openEditBill = (bill: Bill) => {
    if (getNumber(bill.paid_amount) > 0) {
      Alert.alert('Cannot edit bill', 'Bills with payments recorded cannot be edited.');
      return;
    }
    const savedCustomers = decodeArray<Customer>(bill.customers);
    const savedProducts = decodeArray<BillProduct>(bill.products);
    const savedExchanges = decodeArray<RecordValue>(bill.exchanges);
    setEditingBill(bill);
    setCustomer(savedCustomers[0] ?? EMPTY_CUSTOMER);
    setProducts(
      savedProducts.map(product => ({
        ...product,
        product_id: String(product.product_id ?? ''),
      })),
    );
    const savedPaymentType =
      bill.payment_type === 'EXCHANGE_GOLD' ? 'EXCHANGE_GOLD' : 'FULL_PAYMENT';
    setPaymentType(savedPaymentType);
    setExchanges(savedPaymentType === 'EXCHANGE_GOLD' ? (
      savedExchanges.map(item => ({
        ...EMPTY_EXCHANGE,
        ...item,
        weight: String(item.weight ?? ''),
        wastage_weight: String(item.wastage_weight ?? ''),
        rate_per_unit: String(item.rate_per_unit ?? ''),
      })) as ExchangeItem[]
    ) : []);
    const subtotalAmount = getNumber(bill.sub_total);
    const taxable = Math.max(
      0,
      subtotalAmount - getNumber(bill.discount_amount) -
        savedExchanges.reduce((sum, item) => sum + getNumber(item.credit_amount), 0),
    );
    setGstRate(
      taxable > 0 ? String(Math.round((getNumber(bill.gst_amount) / taxable) * 10000) / 100) : '0',
    );
    setDiscount(getNumber(bill.discount_amount) ? String(bill.discount_amount) : '');
    setBillStep(3);
    setShowForm(true);
  };

  const addProduct = (product: Product) => {
    const price = getProductPrice(product);
    if (price <= 0) {
      Alert.alert('Price unavailable', `${product.name} has no valid selling price.`);
      return;
    }
    setProducts(current => [
      ...current,
      {
        product_id: String(product.id),
        product_name: product.name,
        category: product.category,
        purity: product.purity,
        metal_type: product.metal_type || 'Gold',
        images: product.images,
        rate_per_gram: product.gold_rate_per_gram,
        rate_unit: product.rate_unit || 'gram',
        price,
      },
    ]);
  };

  const addExchange = () => {
    const firstRate = rates.find(rate => rate.metal_type.toLowerCase() === 'gold') ?? rates[0];
    setExchanges(current => [
      ...current,
      {
        ...EMPTY_EXCHANGE,
        metal_type: firstRate?.metal_type ?? 'Gold',
        purity: firstRate?.purity ?? '916',
        rate_unit: firstRate?.rate_unit ?? 'gram',
        rate_per_unit: String(firstRate?.rate_per_unit ?? firstRate?.rate_per_gram ?? ''),
      },
    ]);
  };

  const updateExchange = (index: number, field: keyof ExchangeItem, value: string) => {
    setExchanges(current =>
      current.map((exchange, itemIndex) =>
        itemIndex === index ? { ...exchange, [field]: value } : exchange,
      ),
    );
  };

  const selectPaymentType = (type: 'FULL_PAYMENT' | 'EXCHANGE_GOLD') => {
    setPaymentType(type);
    if (type === 'FULL_PAYMENT') {
      setExchanges([]);
      return;
    }
    if (!exchanges.length) addExchange();
  };

  const saveBill = async () => {
    if (!customer.name.trim() || !customer.phone.trim()) {
      Alert.alert('Customer details required', 'Enter the customer name and phone number.');
      return;
    }
    if (!products.length) {
      Alert.alert('Products required', 'Add at least one product to this bill.');
      return;
    }
    if (paymentType === 'EXCHANGE_GOLD' && !exchanges.length) {
      Alert.alert('Exchange item required', 'Add at least one exchange item.');
      return;
    }
    if (
      paymentType === 'EXCHANGE_GOLD' &&
      exchanges.some(item =>
        !item.category.trim() ||
        !item.metal_type.trim() ||
        !item.purity.trim() ||
        !Number.isFinite(Number(item.weight)) ||
        Number(item.weight) <= 0 ||
        !Number.isFinite(Number(item.wastage_weight || 0)) ||
        Number(item.wastage_weight || 0) < 0 ||
        Number(item.wastage_weight || 0) > Number(item.weight) ||
        !Number.isFinite(Number(item.rate_per_unit)) ||
        Number(item.rate_per_unit) <= 0,
      )
    ) {
      Alert.alert('Invalid exchange details', 'Check each exchange item’s weight, wastage, and rate.');
      return;
    }
    if (!validDiscount) {
      Alert.alert('Invalid discount', 'Discount and exchange credit cannot exceed the product subtotal.');
      return;
    }
    if (!validGst) {
      Alert.alert('Invalid GST', 'Enter a GST percentage between 0 and 100.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        customers: [customer],
        products: products.map(product => ({ product_id: Number(product.product_id) })),
        exchanges:
          paymentType === 'EXCHANGE_GOLD'
            ? exchanges.map(item => ({
                product_name:
                  item.product_name.trim() ||
                  `${item.metal_type} ${item.purity} exchange item`.trim(),
                category: item.category,
                metal_type: item.metal_type,
                purity: item.purity,
                weight: Number(item.weight),
                wastage_weight: Number(item.wastage_weight || 0),
                rate_per_unit: Number(item.rate_per_unit),
              }))
            : [],
        payment_type: paymentType,
        gst_rate: gstRateNumber,
        discount_amount: discountAmount,
      };
      if (editingBill) {
        await api.put(`/billings/${editingBill.id}`, payload);
        Alert.alert('Bill updated', 'The bill has been updated successfully.');
      } else {
        await api.post('/billings', payload);
        Alert.alert('Bill saved', 'The new bill has been created successfully.');
      }
      setShowForm(false);
      resetForm();
      await loadBills();
    } catch (error) {
      console.error('Failed to save bill:', error);
      Alert.alert('Could not save bill', getErrorMessage(error, 'Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBill = (bill: Bill) => {
    Alert.alert('Delete bill?', `Delete ${bill.invoice_no || 'this bill'}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/billings/${bill.id}`);
            setBills(current => current.filter(item => item.id !== bill.id));
          } catch (error) {
            console.error('Failed to delete bill:', error);
            Alert.alert('Delete failed', getErrorMessage(error, 'Could not delete the bill.'));
          }
        },
      },
    ]);
  };

  const openPayment = (bill: Bill, paymentKind: 'PAYMENT' | 'REFUND' = 'PAYMENT') => {
    if (!accounts.length) {
      Alert.alert(
        accountError ? 'Could not load fund accounts' : 'No fund accounts',
        accountError || 'Add and activate a fund account before recording payments.',
      );
      return;
    }
    setPaymentMethodIndex(0);
    setPayment({
      bill,
      payment_kind: paymentKind,
      amount: String(
        paymentKind === 'PAYMENT'
          ? getNumber(bill.balance_due)
          : getNumber(bill.paid_amount),
      ),
      account_id: String(accounts[0].id),
      payment_method: PAYMENT_METHODS[0],
      payment_date: localDateTime(),
      reference_number: '',
    });
  };

  const savePayment = async () => {
    if (!payment || !Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid payment amount.');
      return;
    }
    if (!payment.account_id) {
      Alert.alert('Account required', 'Select a fund account.');
      return;
    }
    setIsPaymentSaving(true);
    try {
      const { bill, ...paymentPayload } = payment;
      const { data } = await api.post(`/billings/${bill.id}/payments`, {
        ...paymentPayload,
        amount: Number(paymentPayload.amount),
        account_id: Number(paymentPayload.account_id),
        idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      setBills(current => current.map(item => (item.id === data.id ? data : item)));
      setPayment(null);
      Alert.alert(
        payment.payment_kind === 'PAYMENT' ? 'Payment recorded' : 'Refund recorded',
        'The bill and fund ledger have been updated.',
      );
    } catch (error) {
      console.error('Failed to record bill payment:', error);
      Alert.alert('Payment failed', getErrorMessage(error, 'Could not record this payment.'));
    } finally {
      setIsPaymentSaving(false);
    }
  };

  const updateCustomer = (field: keyof Customer, value: string) => {
    setCustomer(current => ({ ...current, [field]: value }));
  };

  if (payment) {
    return (
      <View className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-4" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => setPayment(null)}
              className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
              accessibilityRole="button"
              accessibilityLabel="Back to bills"
            >
              <Text className="text-xl text-slate-700">‹</Text>
            </Pressable>
            <View>
              <Text className="text-xs font-semibold text-slate-500">
                {payment.payment_kind === 'PAYMENT' ? 'Collect payment' : 'Refund payment'}
              </Text>
              <Text className="text-lg font-extrabold text-slate-900">
                {payment.bill.invoice_no || 'Bill'}
              </Text>
            </View>
          </View>
          <View className="gap-4 rounded-2xl border border-slate-100 bg-white p-4">
            <Text className="text-sm text-slate-600">
              Paid {currency(payment.bill.paid_amount)} · Due {currency(payment.bill.balance_due)}
            </Text>
            <Field
              label="Amount (₹)"
              value={payment.amount}
              onChangeText={value => setPayment(current => current && { ...current, amount: value })}
              keyboardType="decimal-pad"
            />
            <Text className="text-xs font-bold text-slate-600">Fund account</Text>
            {accounts.map(account => (
              <Pressable
                key={account.id}
                onPress={() =>
                  setPayment(current =>
                    current && { ...current, account_id: String(account.id) },
                  )
                }
                className={`rounded-xl border px-3 py-3 ${
                  payment.account_id === String(account.id)
                    ? 'border-primary bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Text className="text-sm font-semibold text-slate-800">{account.name}</Text>
              </Pressable>
            ))}
            <Text className="text-xs font-bold text-slate-600">Payment method</Text>
            <View className="flex-row flex-wrap gap-2">
              {PAYMENT_METHODS.map((method, index) => (
                <Pressable
                  key={method}
                  onPress={() => {
                    setPaymentMethodIndex(index);
                    setPayment(current => current && { ...current, payment_method: method });
                  }}
                  className={`rounded-full border px-3 py-2 ${
                    paymentMethodIndex === index
                      ? 'border-primary bg-primary'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      paymentMethodIndex === index ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {method}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field
              label="Date and time"
              value={payment.payment_date}
              onChangeText={value =>
                setPayment(current => current && { ...current, payment_date: value })
              }
            />
            <Field
              label="Reference number / transaction ID"
              value={payment.reference_number}
              onChangeText={value =>
                setPayment(current => current && { ...current, reference_number: value })
              }
            />
            <ActionButton
              label={isPaymentSaving ? 'Saving payment…' : 'Confirm payment'}
              onPress={savePayment}
              disabled={isPaymentSaving}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (showForm) {
    return (
      <View className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName={`gap-4 px-4 pt-4 ${billStep === 1 ? 'pb-4' : 'pb-8'}`}
          keyboardShouldPersistTaps="handled"
        >
          <View className="-mx-4 -mt-4 flex-row items-center gap-3 border-b border-[#00382E] bg-primary px-4 py-3">
            <Pressable
              onPress={() => {
                if (!isSaving) {
                  setShowForm(false);
                  resetForm();
                }
              }}
              className="h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
              accessibilityRole="button"
              accessibilityLabel="Back to bills"
            >
              <Text className="text-xl text-white">‹</Text>
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-white">
                {editingBill ? 'Edit Bill' : 'New Bill'}
              </Text>
              <Text className="text-[10px] font-medium text-emerald-200">
                Sri Golds Jewellery
              </Text>
            </View>
          </View>

          <View className="flex-row items-center rounded-xl bg-white px-2 py-3">
            {[1, 2, 3].map(step => (
              <View key={step} className="flex-1 items-center">
                <View className={`h-7 w-7 items-center justify-center rounded-full ${
                  billStep >= step ? 'bg-primary' : 'bg-slate-200'
                }`}>
                  <Text className={`text-xs font-bold ${billStep >= step ? 'text-white' : 'text-slate-500'}`}>
                    {step}
                  </Text>
                </View>
                <Text className="mt-1 text-[10px] font-semibold text-slate-600">
                  {step === 1 ? 'Products' : step === 2 ? 'Address' : 'Summary'}
                </Text>
              </View>
            ))}
          </View>

          {billStep === 1 ? (
          <View className="gap-3">
            {showProductPicker ? (
              <View className="gap-3 border-t border-slate-100 pt-3">
                <Text className="text-sm font-extrabold text-slate-900">Product catalog</Text>
                  <TextInput
                    className={inputClass}
                    value={productSearch}
                    onChangeText={setProductSearch}
                    placeholder="Search name, category, purity, or SKU"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => Alert.alert(
                        'Category',
                        'Select a category',
                        [
                          ...categoryOptions.map(option => ({
                            text: option,
                            onPress: () => setCategoryFilter(option),
                          })),
                          { text: 'Cancel', style: 'cancel' },
                        ],
                      )}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                      accessibilityRole="button"
                    >
                      <Text className="text-[10px] font-semibold text-slate-500">Category</Text>
                      <Text className="mt-1 text-xs font-bold text-slate-800" numberOfLines={1}>
                        {categoryFilter}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => Alert.alert(
                        'Metal type',
                        'Select a metal type',
                        [
                          ...metalTypeOptions.map(option => ({
                            text: option,
                            onPress: () => setMetalTypeFilter(option),
                          })),
                          { text: 'Cancel', style: 'cancel' },
                        ],
                      )}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                      accessibilityRole="button"
                    >
                      <Text className="text-[10px] font-semibold text-slate-500">Metal type</Text>
                      <Text className="mt-1 text-xs font-bold text-slate-800" numberOfLines={1}>
                        {metalTypeFilter}
                      </Text>
                    </Pressable>
                  </View>
                  <ScrollView className="mt-3" nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {catalogError ? (
                      <View className="gap-2 rounded-xl bg-rose-50 p-3">
                        <Text className="text-xs text-rose-700">{catalogError}</Text>
                        <ActionButton label="Retry loading products" onPress={() => { loadCatalog(); }} secondary />
                      </View>
                    ) : null}
                    {catalog.length === 0 && !catalogError ? (
                      <View className="items-center py-5">
                        <ActivityIndicator color="#004D40" />
                        <Text className="mt-2 text-xs text-slate-500">Loading products…</Text>
                      </View>
                    ) : visibleProducts.length ? (
                      <View className="flex-row flex-wrap">
                        {visibleProducts.map(product => {
                          const alreadyAdded = products.some(
                            item => String(item.product_id) === String(product.id),
                          );
                          const image = getProductImageUrl(product);
                          return (
                            <View key={product.id} className="w-1/2 px-1 pb-2">
                              <View className="min-h-52 rounded-xl border border-slate-100 bg-white p-2">
                                {image ? (
                                  <Image
                                    source={{ uri: image }}
                                    className="mb-2 h-24 w-full rounded-lg bg-slate-100"
                                    resizeMode="cover"
                                    accessibilityLabel={`${product.name} image`}
                                  />
                                ) : (
                                  <View className="mb-2 h-24 w-full items-center justify-center rounded-lg bg-slate-100">
                                    <Text className="text-2xl font-bold text-slate-300">◆</Text>
                                  </View>
                                )}
                                <Text className="text-sm font-bold text-slate-800" numberOfLines={2}>
                                  {product.name}
                                </Text>
                                <Text className="mt-1 text-xs text-slate-500" numberOfLines={1}>
                                  {[product.category, product.purity].filter(Boolean).join(' · ') || 'Uncategorized'}
                                </Text>
                                <Text className="mt-1 text-sm font-bold text-primary-dark" numberOfLines={1}>
                                  {currency(getProductPrice(product))}
                                </Text>
                                <Pressable
                                  onPress={() => addProduct(product)}
                                  className={`mt-2 items-center rounded-lg py-2 ${alreadyAdded ? 'bg-emerald-50' : 'bg-primary'}`}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Add ${product.name} to bill`}
                                >
                                  <Text className={`text-xs font-bold ${alreadyAdded ? 'text-emerald-700' : 'text-white'}`}>
                                    {alreadyAdded ? '+ Add again' : '+ Add'}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text className="py-4 text-center text-sm text-slate-500">
                        No active products match this search.
                      </Text>
                    )}
                  </ScrollView>
              </View>
            ) : null}

            <Modal
              visible={showProductPreview}
              transparent
              animationType="slide"
              onRequestClose={() => setShowProductPreview(false)}
            >
              <View className="flex-1 justify-end bg-black/50">
                <Pressable
                  className="flex-1"
                  onPress={() => setShowProductPreview(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close product preview"
                />
                <SafeAreaView
                  edges={['bottom', 'left', 'right']}
                  className="max-h-[75%] rounded-t-3xl bg-white px-4 pt-3"
                >
                  <View className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" />
                  <View className="mb-3 flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-extrabold text-slate-900">Products preview</Text>
                      <Text className="mt-1 text-xs text-slate-500">{products.length} item{products.length === 1 ? '' : 's'} selected</Text>
                    </View>
                    <Pressable
                      onPress={() => setShowProductPreview(false)}
                      className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                      accessibilityRole="button"
                      accessibilityLabel="Close product preview"
                    >
                      <Text className="text-lg font-bold text-slate-600">×</Text>
                    </Pressable>
                  </View>
                  <ScrollView nestedScrollEnabled>
                    {products.map((product, index) => (
                      <View key={`${product.product_id}-${index}`} className="mb-2 rounded-xl border border-slate-100 p-3">
                        <Text className="text-sm font-bold text-slate-800">{product.product_name || 'Product'}</Text>
                        <Text className="mt-1 text-xs text-slate-500">
                          {[product.category, product.purity].filter(Boolean).join(' · ') || '—'}
                        </Text>
                        <Text className="mt-2 text-sm font-extrabold text-primary-dark">{currency(product.price)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  <Pressable
                    onPress={() => setShowProductPreview(false)}
                    className="mt-3 items-center rounded-xl bg-primary py-3.5"
                    accessibilityRole="button"
                  >
                    <Text className="text-sm font-bold text-white">Close preview</Text>
                  </Pressable>
                </SafeAreaView>
              </View>
            </Modal>
          </View>
          ) : null}

          {billStep === 2 ? (
          <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            <Text className="text-base font-extrabold text-slate-900">Customer address</Text>
            <Field label="Customer name *" value={customer.name} onChangeText={value => updateCustomer('name', value)} placeholder="Enter customer name" />
            <Field label="Phone number *" value={customer.phone} onChangeText={value => updateCustomer('phone', value)} keyboardType="phone-pad" placeholder="Enter phone number" />
            <Field label="Email" value={customer.email} onChangeText={value => updateCustomer('email', value)} keyboardType="email-address" placeholder="Enter email" />
            <Field label="Address" value={customer.address} onChangeText={value => updateCustomer('address', value)} placeholder="Enter address" multiline />
            <ActionButton
              label="Continue to bill summary"
              onPress={() => {
                if (!customer.name.trim() || !customer.phone.trim()) {
                  Alert.alert('Customer details required', 'Enter the customer name and phone number.');
                  return;
                }
                setBillStep(3);
              }}
              secondary={!customer.name.trim() || !customer.phone.trim()}
            />
            <ActionButton label="Back to products" onPress={() => setBillStep(1)} secondary />
          </View>
          ) : null}

          {billStep === 3 ? (
          <>
          <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            <Text className="text-base font-extrabold text-slate-900">Payment method</Text>
            <View className="flex-row gap-2">
              {(['FULL_PAYMENT', 'EXCHANGE_GOLD'] as const).map(type => (
                <Pressable
                  key={type}
                  onPress={() => selectPaymentType(type)}
                  className={`flex-1 items-center rounded-xl border px-3 py-3 ${
                    paymentType === type ? 'border-primary bg-primary' : 'border-slate-200 bg-white'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: paymentType === type }}
                >
                  <Text className={`text-xs font-bold ${paymentType === type ? 'text-white' : 'text-slate-700'}`}>
                    {type === 'FULL_PAYMENT' ? 'Full payment' : 'Exchange gold'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {paymentType === 'EXCHANGE_GOLD' ? (
              <View className="gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-amber-900">Exchange items</Text>
                  <Pressable onPress={addExchange} className="rounded-lg bg-amber-100 px-3 py-2">
                    <Text className="text-xs font-bold text-amber-900">+ Add item</Text>
                  </Pressable>
                </View>
                {ratesError ? <Text className="text-xs text-rose-700">{ratesError}</Text> : null}
                {exchanges.map((exchange, index) => {
                  const selectedRate = rates.find(
                    rate =>
                      rate.metal_type.toLowerCase() === exchange.metal_type.toLowerCase() &&
                      rate.purity.toLowerCase() === exchange.purity.toLowerCase(),
                  );
                  const netWeight = Math.max(
                    0,
                    getNumber(exchange.weight) - getNumber(exchange.wastage_weight),
                  );
                  return (
                    <View key={`exchange-${index}`} className="gap-3 rounded-xl bg-white p-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-bold text-slate-700">Exchange item {index + 1}</Text>
                        <Pressable onPress={() => setExchanges(current => current.filter((_, i) => i !== index))}>
                          <Text className="font-bold text-rose-600">Remove</Text>
                        </Pressable>
                      </View>
                      <Field label="Category *" value={exchange.category} onChangeText={value => updateExchange(index, 'category', value)} placeholder="Enter category" />
                      <Field label="Metal type" value={exchange.metal_type} onChangeText={value => updateExchange(index, 'metal_type', value)} placeholder="Gold" />
                      <Field label="Purity" value={exchange.purity} onChangeText={value => updateExchange(index, 'purity', value)} placeholder="916" />
                      <View className="flex-row gap-3">
                        <Field label="Weight (g)" value={exchange.weight} onChangeText={value => updateExchange(index, 'weight', value)} keyboardType="decimal-pad" />
                        <Field label="Wastage (g)" value={exchange.wastage_weight} onChangeText={value => updateExchange(index, 'wastage_weight', value)} keyboardType="decimal-pad" />
                      </View>
                      <Field
                        label={`Rate (₹ / ${exchange.rate_unit || 'gram'})`}
                        value={exchange.rate_per_unit || String(selectedRate?.rate_per_unit ?? selectedRate?.rate_per_gram ?? '')}
                        onChangeText={value => updateExchange(index, 'rate_per_unit', value)}
                        keyboardType="decimal-pad"
                      />
                      <Text className="text-xs font-bold text-amber-800">
                        Net weight {netWeight.toFixed(3)} g · Credit {currency(netWeight * getNumber(exchange.rate_per_unit || selectedRate?.rate_per_unit || selectedRate?.rate_per_gram))}
                      </Text>
                    </View>
                  );
                })}
                {!exchanges.length ? (
                  <Text className="text-xs text-amber-800">Add an exchange item to continue.</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            <Text className="text-base font-extrabold text-slate-900">Bill summary</Text>
            <SummaryRow label="Products subtotal" value={currency(subtotal)} />
            <Field label="Discount (₹)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0.00" />
            {paymentType === 'EXCHANGE_GOLD' ? (
              <SummaryRow label="Exchange credit" value={`−${currency(exchangeCredit)}`} />
            ) : null}
            <Field label="GST rate (%)" value={gstRate} onChangeText={setGstRate} keyboardType="decimal-pad" placeholder="0" />
            <SummaryRow label={`GST (${gstRate || '0'}%)`} value={validGst ? currency(gst) : '—'} />
            {!validDiscount || !validGst ? (
              <Text className="text-xs font-semibold text-rose-600">
                Check discount, exchange credit, and GST values.
              </Text>
            ) : null}
            <View className="border-t border-slate-100 pt-3">
              <SummaryRow label="Total bill" value={validDiscount && validGst ? currency(total) : '—'} bold />
            </View>
            <ActionButton
              label={isSaving ? 'Saving bill…' : editingBill ? 'Update bill' : 'Save bill'}
              onPress={saveBill}
              disabled={isSaving || !validDiscount || !validGst}
            />
            <ActionButton label="Back to address" onPress={() => setBillStep(2)} secondary />
          </View>
          </>
          ) : null}
        </ScrollView>

        {billStep === 1 ? (
          <View className="border-t border-slate-200 bg-white px-4 py-3">
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowProductPreview(true)}
                disabled={!products.length}
                className={`flex-1 items-center rounded-xl border py-3 ${
                  products.length ? 'border-primary bg-white' : 'border-slate-200 bg-slate-100'
                }`}
                accessibilityRole="button"
              >
                <Text className={`text-sm font-bold ${products.length ? 'text-primary' : 'text-slate-400'}`}>
                  Preview
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!products.length) {
                    Alert.alert('Products required', 'Add at least one product to continue.');
                    return;
                  }
                  setShowProductPicker(false);
                  setBillStep(2);
                }}
                disabled={!products.length}
                className={`flex-1 items-center rounded-xl py-3 ${
                  products.length ? 'bg-primary' : 'bg-slate-300'
                }`}
                accessibilityRole="button"
              >
                <Text className="text-sm font-bold text-white">Next</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { loadBills(true); }}
            tintColor="#004D40"
            colors={['#004D40']}
          />
        }
      >
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-primary p-4">
            <Text className="text-xs font-semibold text-emerald-100">Total billed</Text>
            <Text className="mt-2 text-lg font-extrabold text-white">{currency(totalBilled)}</Text>
            <Text className="mt-1 text-xs text-emerald-100">{bills.length} bills</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-sky-800 p-4">
            <Text className="text-xs font-semibold text-sky-100">Today</Text>
            <Text className="mt-2 text-lg font-extrabold text-white">{currency(todayBilled)}</Text>
            <Text className="mt-1 text-xs text-sky-100">Today’s sales</Text>
          </View>
        </View>

        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <TextInput
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
            value={search}
            onChangeText={setSearch}
            placeholder="Search invoice, customer, phone..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
          <View className="flex-row flex-wrap gap-2">
            {(['ALL', 'FULL_PAYMENT', 'EXCHANGE_GOLD'] as const).map(filter => (
              <Pressable
                key={filter}
                onPress={() => setPaymentFilter(filter)}
                className={`rounded-full border px-3 py-2 ${
                  paymentFilter === filter ? 'border-primary bg-primary' : 'border-slate-200 bg-white'
                }`}
              >
                <Text className={`text-xs font-bold ${paymentFilter === filter ? 'text-white' : 'text-slate-700'}`}>
                  {filter === 'ALL' ? 'All bills' : filter === 'FULL_PAYMENT' ? 'Full payment' : 'Exchange'}
                </Text>
              </Pressable>
            ))}
          </View>
          <ActionButton label="+ New bill" onPress={openNewBill} />
        </View>

        {loadError ? (
          <View className="gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-semibold text-rose-800">{loadError}</Text>
            <ActionButton label="Retry" onPress={() => { loadBills(); }} secondary />
          </View>
        ) : null}

        {isLoading ? (
          <View className="items-center rounded-2xl bg-white py-12">
            <ActivityIndicator color="#004D40" />
            <Text className="mt-3 text-sm text-slate-500">Loading bills…</Text>
          </View>
        ) : filteredBills.length ? (
          <View className="gap-3">
            {filteredBills.map(bill => {
              const billCustomers = decodeArray<RecordValue>(bill.customers);
              const billProducts = decodeArray<RecordValue>(bill.products);
              const customerName = billCustomers.map(item => item.name).filter(Boolean).join(', ');
              return (
                <View key={bill.id} className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-xs font-semibold text-slate-500">
                        {formatDate(bill.created_at)}
                      </Text>
                      <Text className="mt-1 text-base font-extrabold text-primary-dark">
                        {bill.invoice_no || `Bill #${bill.id}`}
                      </Text>
                      <Text className="mt-1 text-sm text-slate-700" numberOfLines={1}>
                        {customerName || 'No customer details'}
                      </Text>
                    </View>
                    <View className={`rounded-full px-2.5 py-1 ${
                      bill.payment_type === 'EXCHANGE_GOLD' ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                      <Text className={`text-[10px] font-bold ${
                        bill.payment_type === 'EXCHANGE_GOLD' ? 'text-amber-800' : 'text-emerald-800'
                      }`}>
                        {bill.payment_type === 'EXCHANGE_GOLD' ? 'Exchange' : 'Full payment'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between border-t border-slate-100 pt-3">
                    <View>
                      <Text className="text-xs text-slate-500">
                        {billProducts.length} product{billProducts.length === 1 ? '' : 's'}
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">
                        Paid {currency(bill.paid_amount)} · Due {currency(bill.balance_due)}
                      </Text>
                    </View>
                    <Text className="text-lg font-extrabold text-slate-900">
                      {currency(bill.total_amount)}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap justify-end gap-2">
                    {getNumber(bill.balance_due) > 0 ? (
                      <SmallAction label="Collect" onPress={() => openPayment(bill)} color="emerald" />
                    ) : null}
                    {getNumber(bill.paid_amount) > 0 ? (
                      <SmallAction
                        label="Refund"
                        onPress={() => openPayment(bill, 'REFUND')}
                        color="rose"
                      />
                    ) : null}
                    {getNumber(bill.paid_amount) === 0 ? (
                      <SmallAction label="Edit" onPress={() => openEditBill(bill)} color="amber" />
                    ) : null}
                    <SmallAction label="Delete" onPress={() => deleteBill(bill)} color="rose" />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-slate-200 bg-white px-5 py-10">
            <Text className="text-base font-bold text-slate-800">
              {bills.length ? 'No bills match your search' : 'No bills yet'}
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">
              Create a bill to add catalog products and record a sale.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={`text-sm ${bold ? 'font-extrabold text-slate-900' : 'text-slate-600'}`}>
        {label}
      </Text>
      <Text className={`text-sm ${bold ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
        {value}
      </Text>
    </View>
  );
}

function SmallAction({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: 'emerald' | 'amber' | 'rose';
}) {
  const colorClass = {
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    rose: 'bg-rose-50 text-rose-700',
  }[color];
  const [background, foreground] = colorClass.split(' ');
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-lg px-3 py-2 ${background}`}
      accessibilityRole="button"
    >
      <Text className={`text-xs font-bold ${foreground}`}>{label}</Text>
    </Pressable>
  );
}
