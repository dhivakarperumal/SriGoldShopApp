import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';

export type EnquiryRecord = {
  id: string | number;
  customer_name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  enquiry_type?: string;
  product_category?: string;
  product_id?: string | number | null;
  product_name?: string;
  metal_type?: string;
  purity?: string;
  quantity?: number | string;
  weight?: number | string;
  approx_budget?: number | string;
  preferred_design?: string;
  message?: string;
  status?: string;
  follow_up_date?: string;
  follow_up_time?: string;
  assigned_to?: string;
  source?: string;
  priority?: string;
  whatsapp_confirmation?: boolean;
  created_at?: string;
  daily_rate?: number | string;
  rate_unit?: string;
  rate_date?: string;
};

type Props = {
  enquiry?: EnquiryRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

type EnquiryForm = {
  customer_name: string;
  phone: string;
  alternate_phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  enquiry_type: string;
  product_category: string;
  product_id: string;
  product_name: string;
  metal_type: string;
  purity: string;
  quantity: string;
  weight: string;
  approx_budget: string;
  preferred_design: string;
  message: string;
  status: string;
  follow_up_date: string;
  follow_up_time: string;
  assigned_to: string;
  source: string;
  priority: string;
  whatsapp_confirmation: boolean;
};

type Product = {
  id: string | number;
  name?: string;
  category?: string;
  product_code?: string;
  metal_type?: string;
  purity?: string;
  gross_weight?: string | number;
  offer_price?: string | number;
  final_selling_price?: string | number;
  mrp?: string | number;
  status?: string;
};

type Category = {
  name: string;
  status?: string;
};

type GoldRate = {
  metal_type: string;
  purity: string;
  rate_per_unit?: number | string;
  rate_per_gram?: number | string;
  rate_unit?: string;
};

type RateResponse = {
  rates?: GoldRate[];
  rate_date?: string;
};

const EMPTY_FORM: EnquiryForm = {
  customer_name: '',
  phone: '',
  alternate_phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  enquiry_type: 'Gold Jewellery',
  product_category: '',
  product_id: '',
  product_name: '',
  metal_type: 'Gold',
  purity: '',
  quantity: '1',
  weight: '',
  approx_budget: '',
  preferred_design: '',
  message: '',
  status: 'New Enquiry',
  follow_up_date: '',
  follow_up_time: '',
  assigned_to: '',
  source: '',
  priority: 'Medium',
  whatsapp_confirmation: true,
};

const ENQUIRY_TYPES = [
  'Gold Jewellery',
  'Gold Coin / Bar',
  'Gold Loan',
  'Old Gold Exchange',
  'Other',
];
const STATUSES = [
  'New Enquiry',
  'In Progress',
  'Quotation Sent',
  'Converted',
  'Closed',
  'Not Interested',
];
const DESIGNS = ['Traditional', 'Modern', 'Antique', 'Custom', 'Not specified'];
const SOURCES = ['Walk-in', 'Phone', 'WhatsApp', 'Website', 'Social Media', 'Referral', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const getErrorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

const formatPurity = (purity: string, metalType: string) => {
  if (metalType !== 'Gold') return purity;
  const karatByPurity: Record<string, string> = {
    '999': '24K',
    '916': '22K',
    '833': '20K',
    '750': '18K',
    '585': '14K',
  };
  return karatByPurity[purity] || purity;
};

const createInitialForm = (enquiry?: EnquiryRecord | null): EnquiryForm => {
  if (!enquiry) return { ...EMPTY_FORM };
  return {
    ...EMPTY_FORM,
    ...enquiry,
    customer_name: enquiry.customer_name || '',
    phone: enquiry.phone || '',
    alternate_phone: enquiry.alternate_phone || '',
    email: enquiry.email || '',
    address: enquiry.address || '',
    city: enquiry.city || '',
    state: enquiry.state || '',
    pincode: enquiry.pincode || '',
    product_id: enquiry.product_id == null ? '' : String(enquiry.product_id),
    quantity: enquiry.quantity == null ? '' : String(enquiry.quantity),
    weight: enquiry.weight == null ? '' : String(enquiry.weight),
    approx_budget: enquiry.approx_budget == null ? '' : String(enquiry.approx_budget),
    follow_up_date: enquiry.follow_up_date?.slice(0, 10) || '',
    follow_up_time: enquiry.follow_up_time?.slice(0, 5) || '',
  };
};

function AddEnquries({ enquiry, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<EnquiryForm>(() => createInitialForm(enquiry));
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [rateDate, setRateDate] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      setOptionsError('');
      try {
        const [categoryResult, productResult, rateResult] = await Promise.allSettled([
          api.get('/categories'),
          api.get('/products', { params: { page: 1, limit: 100, status: 'Active' } }),
          api.get<RateResponse>('/gold-rates/current'),
        ]);
        if (categoryResult.status === 'rejected') throw categoryResult.reason;
        if (productResult.status === 'rejected') throw productResult.reason;
        const categoryResponse = categoryResult.value;
        const productResponse = productResult.value;
        if (!Array.isArray(categoryResponse.data)) {
          throw new Error('The server returned an invalid category list.');
        }
        const productData = productResponse.data;
        const productList = Array.isArray(productData)
          ? productData
          : Array.isArray(productData?.products)
            ? productData.products
            : null;
        if (!productList) throw new Error('The server returned an invalid product list.');

        if (active) {
          const activeCategories = categoryResponse.data.filter(
            (category: Category) => category.status === 'Active',
          );
          setCategories(activeCategories);
          setProducts(productList as Product[]);
          setIsCustomCategory(
            Boolean(
              enquiry?.product_category &&
                !activeCategories.some(
                  (category: Category) => category.name === enquiry.product_category,
                ),
            ),
          );
          if (rateResult.status === 'fulfilled') {
            setRates(Array.isArray(rateResult.value.data?.rates) ? rateResult.value.data.rates : []);
            setRateDate(rateResult.value.data?.rate_date || '');
          } else {
            console.error('Error loading current gold rates:', rateResult.reason);
            setOptionsError('Current gold rates could not be loaded.');
          }
        }
      } catch (error) {
        console.error('Error loading enquiry form options:', error);
        if (active) {
          setOptionsError(getErrorMessage(error, 'Could not load categories, products, or rates.'));
        }
      } finally {
        if (active) setIsLoadingOptions(false);
      }
    };
    loadOptions();
    return () => {
      active = false;
    };
  }, [enquiry?.product_category]);

  const categoryProducts = useMemo(
    () =>
      products.filter(
        product =>
          product.status === 'Active' &&
          (!form.product_category || product.category === form.product_category),
      ),
    [form.product_category, products],
  );
  const selectedRate = rates.find(
    rate =>
      rate.metal_type === form.metal_type &&
      formatPurity(rate.purity, rate.metal_type) === form.purity,
  );

  const update = <K extends keyof EnquiryForm>(field: K, value: EnquiryForm[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const chooseProduct = (productId: string) => {
    if (!productId) {
      setForm(current => ({ ...current, product_id: '', product_name: '' }));
      return;
    }
    if (productId === 'custom') {
      setForm(current => ({ ...current, product_id: 'custom', product_name: '' }));
      return;
    }
    const product = categoryProducts.find(item => String(item.id) === productId);
    if (!product) return;
    const metalType = product.metal_type || form.metal_type;
    setForm(current => ({
      ...current,
      product_id: String(product.id),
      product_name: product.name || '',
      metal_type: metalType,
      purity: product.purity ? formatPurity(product.purity, metalType) : current.purity,
      weight: product.gross_weight == null ? current.weight : String(product.gross_weight),
      approx_budget: String(
        product.offer_price ?? product.final_selling_price ?? product.mrp ?? current.approx_budget,
      ),
    }));
  };

  const save = async () => {
    if (!form.customer_name.trim() || !form.phone.trim()) {
      Alert.alert('Required fields', 'Enter the customer name and mobile number.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        product_id:
          form.product_id && form.product_id !== 'custom' ? Number(form.product_id) : null,
        product_name: form.product_name.trim(),
      };
      if (enquiry) {
        await api.put(`/enquiries/admin/${enquiry.id}`, payload);
      } else {
        await api.post('/enquiries', payload);
      }
      onSaved();
    } catch (error) {
      console.error('Failed to save enquiry:', error);
      Alert.alert('Save failed', getErrorMessage(error, 'Unable to save enquiry.'));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800';

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-primary" style={{ paddingTop: insets.top }}>
        <StatusBar barStyle="light-content" />
        <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close enquiry form"
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
          >
            <Text className="text-xl font-bold text-white">‹</Text>
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-white">
              {enquiry ? 'Edit Enquiry' : 'Add Gold Enquiry'}
            </Text>
            <Text className="text-[10px] text-emerald-200">
              Customer and product enquiry details
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          className="flex-1 bg-background"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pt-4 pb-6"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
            keyboardShouldPersistTaps="handled"
          >
            {isLoadingOptions ? (
              <View className="mb-4 flex-row items-center rounded-xl bg-sky-50 p-3">
                <ActivityIndicator size="small" color="#004D40" />
                <Text className="ml-2 text-xs text-slate-600">Loading products and gold rates…</Text>
              </View>
            ) : null}
            {optionsError ? (
              <Text className="mb-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                {optionsError}
              </Text>
            ) : null}

            <FormSection title="Customer Information">
              <FormField
                label="Customer name *"
                value={form.customer_name}
                onChangeText={value => update('customer_name', value)}
                placeholder="Enter customer name"
                className={inputClass}
              />
              <FormField
                label="Mobile number *"
                value={form.phone}
                onChangeText={value => update('phone', value)}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
                className={inputClass}
              />
              <FormField
                label="Alternate number"
                value={form.alternate_phone}
                onChangeText={value => update('alternate_phone', value)}
                placeholder="Enter alternate number"
                keyboardType="phone-pad"
                className={inputClass}
              />
              <FormField
                label="Email"
                value={form.email}
                onChangeText={value => update('email', value)}
                placeholder="Enter email address"
                keyboardType="email-address"
                className={inputClass}
              />
              <FormField
                label="Address"
                value={form.address}
                onChangeText={value => update('address', value)}
                placeholder="Enter address"
                multiline
                className={inputClass}
              />
              <View className="flex-row gap-2">
                <FormField
                  label="City"
                  value={form.city}
                  onChangeText={value => update('city', value)}
                  placeholder="City"
                  className={inputClass}
                  containerClassName="flex-1 min-w-0"
                />
                <FormField
                  label="State"
                  value={form.state}
                  onChangeText={value => update('state', value)}
                  placeholder="State"
                  className={inputClass}
                  containerClassName="flex-1 min-w-0"
                />
              </View>
              <FormField
                label="Pincode"
                value={form.pincode}
                onChangeText={value => update('pincode', value)}
                placeholder="Enter pincode"
                keyboardType="number-pad"
                className={inputClass}
              />
            </FormSection>

            <FormSection title="Enquiry Details">
              <Text className="mb-2 text-xs font-semibold text-slate-600">Enquiry type</Text>
              <ChoiceRow
                values={ENQUIRY_TYPES}
                selected={form.enquiry_type}
                onSelect={value => update('enquiry_type', value)}
              />
              <ChoiceField
                label="Product category"
                value={form.product_category}
                options={['', ...categories.map(category => category.name), 'Other']}
                onSelect={value => {
                  setIsCustomCategory(value === 'Other');
                  update('product_category', value === 'Other' ? '' : value);
                }}
                placeholder="Select category"
              />
              {isCustomCategory ? (
                <FormField
                  label="Custom category"
                  value={form.product_category}
                  onChangeText={value => update('product_category', value)}
                  placeholder="Enter product category"
                  className={inputClass}
                />
              ) : null}
              <ChoiceField
                label="Product"
                value={form.product_id}
                options={[
                  { label: 'Select product', value: '' },
                  ...categoryProducts.map(product => ({
                    label: `${product.name || 'Product'}${product.product_code ? ` · ${product.product_code}` : ''}`,
                    value: String(product.id),
                  })),
                  { label: 'Other / Custom item', value: 'custom' },
                ]}
                onSelect={chooseProduct}
                placeholder="Select product"
              />
              {form.product_id === 'custom' ? (
                <FormField
                  label="Product name"
                  value={form.product_name}
                  onChangeText={value => update('product_name', value)}
                  placeholder="Enter product name"
                  className={inputClass}
                />
              ) : null}
              <View className="flex-row gap-2">
                <ChoiceField
                  label="Metal type"
                  value={form.metal_type}
                  options={['Gold', 'Silver', 'Platinum', 'Diamond']}
                  onSelect={value => {
                    update('metal_type', value);
                    update('purity', '');
                  }}
                  placeholder="Select metal"
                  className="flex-1"
                />
                <ChoiceField
                  label="Purity"
                  value={form.purity}
                  options={rates
                    .filter(rate => rate.metal_type === form.metal_type)
                    .map(rate => formatPurity(rate.purity, rate.metal_type))}
                  onSelect={value => update('purity', value)}
                  placeholder="Select purity"
                  className="flex-1"
                />
              </View>
              <View className="mb-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <Text className="text-[10px] font-semibold uppercase text-slate-500">Daily rate</Text>
                <Text className="mt-1 text-sm font-bold text-slate-800">
                  {selectedRate
                    ? `₹${Number(selectedRate.rate_per_unit ?? selectedRate.rate_per_gram).toLocaleString('en-IN')} / ${selectedRate.rate_unit || 'gram'}`
                    : rates.length
                      ? 'Select a purity'
                      : 'No active daily rate'}
                </Text>
                {rateDate ? (
                  <Text className="mt-0.5 text-[10px] text-slate-500">
                    Rate date: {new Date(rateDate).toLocaleDateString('en-IN')}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row gap-2">
                <FormField
                  label="Quantity"
                  value={form.quantity}
                  onChangeText={value => update('quantity', value)}
                  placeholder="1"
                  keyboardType="decimal-pad"
                  className={inputClass}
                  containerClassName="flex-1 min-w-0"
                />
                <FormField
                  label="Weight (grams)"
                  value={form.weight}
                  onChangeText={value => update('weight', value)}
                  placeholder="Enter weight"
                  keyboardType="decimal-pad"
                  className={inputClass}
                  containerClassName="flex-1 min-w-0"
                />
              </View>
              <FormField
                label="Approx. budget (₹)"
                value={form.approx_budget}
                onChangeText={value => update('approx_budget', value)}
                placeholder="Enter budget"
                keyboardType="decimal-pad"
                className={inputClass}
              />
              <ChoiceField
                label="Preferred design"
                value={form.preferred_design}
                options={['', ...DESIGNS]}
                onSelect={value => update('preferred_design', value)}
                placeholder="Select design"
              />
              <FormField
                label="Enquiry message"
                value={form.message}
                onChangeText={value => update('message', value)}
                placeholder="Enter customer requirements or special notes"
                multiline
                className={inputClass}
              />
            </FormSection>

            <FormSection title="Follow-up & Status">
              <ChoiceField
                label="Status"
                value={form.status}
                options={STATUSES}
                onSelect={value => update('status', value)}
                placeholder="Select status"
              />
              <FormField
                label="Follow-up date (YYYY-MM-DD)"
                value={form.follow_up_date}
                onChangeText={value => update('follow_up_date', value)}
                placeholder="2026-12-31"
                className={inputClass}
              />
              <FormField
                label="Follow-up time (HH:MM)"
                value={form.follow_up_time}
                onChangeText={value => update('follow_up_time', value)}
                placeholder="10:30"
                className={inputClass}
              />
              <FormField
                label="Assigned to"
                value={form.assigned_to}
                onChangeText={value => update('assigned_to', value)}
                placeholder="Admin"
                className={inputClass}
              />
              <ChoiceField
                label="Source"
                value={form.source}
                options={['', ...SOURCES]}
                onSelect={value => update('source', value)}
                placeholder="Select source"
              />
              <Text className="mb-2 text-xs font-semibold text-slate-600">Priority</Text>
              <ChoiceRow
                values={PRIORITIES}
                selected={form.priority}
                onSelect={value => update('priority', value)}
              />
              <Pressable
                onPress={() => update('whatsapp_confirmation', !form.whatsapp_confirmation)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: form.whatsapp_confirmation }}
                className="mt-2 flex-row items-center"
              >
                <View
                  className={`mr-2 h-5 w-5 items-center justify-center rounded border ${
                    form.whatsapp_confirmation
                      ? 'border-primary bg-primary'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {form.whatsapp_confirmation ? (
                    <Text className="text-xs font-bold text-white">✓</Text>
                  ) : null}
                </View>
                <Text className="text-xs font-semibold text-slate-700">
                  Send WhatsApp confirmation
                </Text>
              </Pressable>
            </FormSection>

            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={onClose}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3"
                accessibilityRole="button"
              >
                <Text className="text-sm font-bold text-slate-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => save()}
                disabled={isSaving || isLoadingOptions}
                className="rounded-xl bg-primary px-5 py-3 disabled:opacity-50"
                accessibilityRole="button"
              >
                <Text className="text-sm font-bold text-white">
                  {isSaving ? 'Saving…' : enquiry ? 'Update enquiry' : 'Save enquiry'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="mb-4 text-sm font-extrabold text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  className,
  containerClassName = '',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
  className: string;
  containerClassName?: string;
}) {
  return (
    <View className={`mb-3 w-full ${containerClassName}`}>
      <Text className="mb-1.5 text-xs font-semibold text-slate-600">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`${className} w-full${multiline ? ' min-h-20' : ''}`}
      />
    </View>
  );
}

function ChoiceField({
  label,
  value,
  options,
  onSelect,
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  options: Array<string | { label: string; value: string }>;
  onSelect: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedOptions = options.map(option =>
    typeof option === 'string' ? { label: option, value: option } : option,
  );
  const selectedLabel =
    normalizedOptions.find(option => option.value === value)?.label || value || placeholder;

  return (
    <View className={`mb-3 ${className}`}>
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
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          onPress={() => setIsOpen(false)}
          className="flex-1 justify-end bg-black/50"
          accessibilityRole="button"
          accessibilityLabel="Close selection"
        >
          <View className="max-h-[70%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
            <Text className="mb-3 text-lg font-extrabold text-slate-900">{label}</Text>
            <ScrollView>
              {normalizedOptions.map(option => (
                <Pressable
                  key={`${option.value}-${option.label}`}
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
                  <Text
                    className={`text-sm font-semibold ${
                      option.value === value ? 'text-primary' : 'text-slate-700'
                    }`}
                  >
                    {option.label || placeholder}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ChoiceRow({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View className="mb-3 flex-row flex-wrap gap-2">
      {values.map(value => (
        <Pressable
          key={value}
          onPress={() => onSelect(value)}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === value }}
          className={`rounded-full border px-3 py-2 ${
            selected === value ? 'border-primary bg-primary' : 'border-slate-200 bg-white'
          }`}
        >
          <Text className={`text-[10px] font-bold ${selected === value ? 'text-white' : 'text-slate-600'}`}>
            {value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default AddEnquries;