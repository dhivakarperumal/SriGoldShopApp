import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import api from '../../api';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';
import type { ProductCardData } from '../../Components/ProductCard';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type EnquiryType =
  | 'Gold Jewellery'
  | 'Gold Coin / Bar'
  | 'Gold Loan'
  | 'Old Gold Exchange'
  | 'Other';

type CatalogRecord = Record<string, unknown>;
type CatalogProduct = CatalogRecord & {
  id: string | number;
  name: string;
};
type CatalogOption = { label: string; value: string };
type CatalogPicker = 'category' | 'product' | 'metal';

type EnquiryFormData = {
  customer_name: string;
  phone: string;
  alternate_phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  enquiry_type: EnquiryType;
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
};

export type EnquiryFormProps = {
  user: AuthenticatedUser | null;
  /** Pass a product to pre-fill product fields (from card Enquire Now) */
  product?: ProductCardData;
  /** Called after successful submission */
  onSuccess?: () => void;
};

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ENQUIRY_TYPES: EnquiryType[] = [
  'Gold Jewellery',
  'Gold Coin / Bar',
  'Gold Loan',
  'Old Gold Exchange',
  'Other',
];

const isCatalogRecord = (value: unknown): value is CatalogRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getCatalogOptions = (data: unknown): CatalogOption[] => {
  if (!Array.isArray(data)) {
    throw new TypeError('The catalog response must be an array.');
  }
  const seen = new Set<string>();
  return data
    .filter(isCatalogRecord)
    .filter(item => !item.status || String(item.status).toLowerCase() === 'active')
    .map(item => getText(item.name).trim())
    .filter(name => {
      const key = name.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(name => ({ label: name, value: name }));
};

const getCatalogProducts = (data: unknown): {
  products: CatalogProduct[];
  totalPages: number;
} => {
  const record = isCatalogRecord(data) ? data : null;
  const records = Array.isArray(data)
    ? data
    : record && Array.isArray(record.products)
      ? record.products
      : null;
  if (!records) {
    throw new TypeError('The products response must contain a products array.');
  }
  const products = records.filter(
    (item): item is CatalogProduct =>
      isCatalogRecord(item) &&
      (typeof item.id === 'string' || typeof item.id === 'number') &&
      typeof item.name === 'string' &&
      (!item.status || String(item.status).toLowerCase() === 'active'),
  );
  const pagination = record && isCatalogRecord(record.pagination)
    ? record.pagination
    : {};
  const totalPages = Math.max(1, Number(pagination.totalPages) || 1);
  return { products, totalPages };
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function initialEnquiryType(category: string): EnquiryType {
  const c = category.toLowerCase();
  if (c.includes('coin') || c.includes('bar')) return 'Gold Coin / Bar';
  if (c.includes('loan')) return 'Gold Loan';
  if (c.includes('exchange')) return 'Old Gold Exchange';
  return 'Gold Jewellery';
}

function initialPurity(purity: string, metalType: string): string {
  if (metalType !== 'Gold') return purity;
  return (
    { '999': '24K', '916': '22K', '833': '20K', '750': '18K', '585': '14K' }[
      purity
    ] || purity
  );
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Unable to send your enquiry. Please try again.';
}

function buildInitialForm(
  user: AuthenticatedUser | null,
  product?: ProductCardData,
): EnquiryFormData {
  const category = getText(product?.category);
  const metalType = getText(product?.metal_type) || 'Gold';
  return {
    customer_name: user?.name || user?.username || '',
    phone: user?.phone || user?.mobile || user?.phone_number || '',
    alternate_phone: '',
    email: user?.email || '',
    address: user?.address || '',
    city: '',
    state: '',
    pincode: '',
    enquiry_type: initialEnquiryType(category),
    product_category: category,
    product_id: getText(product?.id ?? product?.product_id ?? product?.productId),
    product_name: getText(product?.name),
    metal_type: metalType,
    purity: initialPurity(getText(product?.purity), metalType),
    quantity: '1',
    weight: getText(product?.gross_weight),
    approx_budget: getText(
      product?.offer_price ?? product?.final_selling_price ?? product?.mrp,
    ),
    preferred_design: '',
    message: '',
  };
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Shared enquiry form used both by the product card modal
 * and the standalone Enquiry tab page.
 */
export function EnquiryForm({ user, product, onSuccess }: EnquiryFormProps) {
  const [form, setForm] = useState<EnquiryFormData>(() =>
    buildInitialForm(user, product),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnquiryTypePickerOpen, setIsEnquiryTypePickerOpen] = useState(false);
  const [catalogPicker, setCatalogPicker] = useState<CatalogPicker | null>(null);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [metals, setMetals] = useState<CatalogOption[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingMetals, setIsLoadingMetals] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [metalError, setMetalError] = useState('');
  const [productError, setProductError] = useState('');
  const [catalogRefreshVersion, setCatalogRefreshVersion] = useState(0);

  const updateField = <K extends keyof EnquiryFormData>(
    key: K,
    value: EnquiryFormData[K],
  ) => setForm(current => ({ ...current, [key]: value }));

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      setCategoryError('');
      try {
        const { data } = await api.get('/categories', {
          signal: controller.signal,
        });
        const options = getCatalogOptions(data);
        if (active) setCategories(options);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error('Failed to load enquiry categories:', error);
        setCategoryError(getErrorMessage(error));
      } finally {
        if (active) setIsLoadingCategories(false);
      }
    };

    const loadMetals = async () => {
      setIsLoadingMetals(true);
      setMetalError('');
      try {
        const { data } = await api.get('/metals', {
          signal: controller.signal,
        });
        const options = getCatalogOptions(data);
        if (active) setMetals(options);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error('Failed to load enquiry metal types:', error);
        setMetalError(getErrorMessage(error));
      } finally {
        if (active) setIsLoadingMetals(false);
      }
    };

    const loadProducts = async () => {
      setIsLoadingProducts(true);
      setProductError('');
      try {
        const firstResponse = await api.get('/products', {
          params: { page: 1, limit: 100, search: '', status: 'Active' },
          signal: controller.signal,
        });
        const firstPage = getCatalogProducts(firstResponse.data);
        const otherPages = await Promise.all(
          Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
            api.get('/products', {
              params: {
                page: index + 2,
                limit: 100,
                search: '',
                status: 'Active',
              },
              signal: controller.signal,
            }),
          ),
        );
        const allProducts = [
          ...firstPage.products,
          ...otherPages.flatMap(response => getCatalogProducts(response.data).products),
        ];
        if (active) setCatalogProducts(allProducts);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error('Failed to load enquiry products:', error);
        setProductError(getErrorMessage(error));
      } finally {
        if (active) setIsLoadingProducts(false);
      }
    };

    loadCategories();
    loadMetals();
    loadProducts();

    return () => {
      active = false;
      controller.abort();
    };
  }, [catalogRefreshVersion]);

  const productOptions = catalogProducts.filter(item =>
    (!form.product_category ||
      getText(item.category).toLowerCase() === form.product_category.toLowerCase()) &&
    (!form.metal_type ||
      getText(item.metal_type).toLowerCase() === form.metal_type.toLowerCase()),
  );
  const selectedProductExists = productOptions.some(
    item => String(item.id) === form.product_id,
  );
  const selectableProducts =
    form.product_id && form.product_name && !selectedProductExists
      ? [
          {
            id: form.product_id,
            name: form.product_name,
            category: form.product_category,
            metal_type: form.metal_type,
          },
          ...productOptions,
        ]
      : productOptions;
  const categoryOptions =
    form.product_category &&
    !categories.some(
      option => option.value.toLowerCase() === form.product_category.toLowerCase(),
    )
      ? [{ label: form.product_category, value: form.product_category }, ...categories]
      : categories;
  const metalOptions =
    form.metal_type &&
    !metals.some(
      option => option.value.toLowerCase() === form.metal_type.toLowerCase(),
    )
      ? [{ label: form.metal_type, value: form.metal_type }, ...metals]
      : metals;

  const pickerOptions: CatalogOption[] =
    catalogPicker === 'category'
      ? categoryOptions
      : catalogPicker === 'metal'
        ? metalOptions
        : [
            { label: 'No specific product', value: '' },
            ...selectableProducts.map(item => ({
              label: item.name,
              value: String(item.id),
            })),
          ];
  const pickerTitle =
    catalogPicker === 'category'
      ? 'Select Product Category'
      : catalogPicker === 'metal'
        ? 'Select Metal Type'
        : 'Select Product';
  const pickerLoading =
    catalogPicker === 'category'
      ? isLoadingCategories
      : catalogPicker === 'metal'
        ? isLoadingMetals
        : isLoadingProducts;
  const pickerError =
    catalogPicker === 'category'
      ? categoryError
      : catalogPicker === 'metal'
        ? metalError
        : productError;

  const selectCatalogOption = (option: CatalogOption) => {
    if (catalogPicker === 'category') {
      setForm(current => {
        const selectedProduct = catalogProducts.find(
          item => String(item.id) === current.product_id,
        );
        const selectedProductCategory =
          getText(selectedProduct?.category) || current.product_category;
        const productMatches =
          !current.product_id ||
          selectedProductCategory.toLowerCase() === option.value.toLowerCase();
        return {
          ...current,
          product_category: option.value,
          ...(productMatches
            ? {}
            : {
                product_id: '',
                product_name: '',
                purity: '',
                weight: '',
                approx_budget: '',
              }),
        };
      });
    } else if (catalogPicker === 'metal') {
      setForm(current => {
        const selectedProduct = catalogProducts.find(
          item => String(item.id) === current.product_id,
        );
        const selectedProductMetal =
          getText(selectedProduct?.metal_type) || current.metal_type;
        const productMatches =
          !current.product_id ||
          selectedProductMetal.toLowerCase() === option.value.toLowerCase();
        return {
          ...current,
          metal_type: option.value,
          ...(productMatches
            ? {}
            : {
                product_id: '',
                product_name: '',
                purity: '',
                weight: '',
                approx_budget: '',
              }),
        };
      });
    } else {
      const selectedProduct = catalogProducts.find(
        item => String(item.id) === option.value,
      );
      if (!selectedProduct) {
        if (option.value && option.value === form.product_id) {
          setCatalogPicker(null);
          return;
        }
        setForm(current => ({
          ...current,
          product_id: '',
          product_name: '',
        }));
      } else {
        const metalType = getText(selectedProduct.metal_type) || form.metal_type;
        setForm(current => ({
          ...current,
          product_id: String(selectedProduct.id),
          product_name: selectedProduct.name,
          product_category:
            getText(selectedProduct.category) || current.product_category,
          metal_type: metalType,
          purity: initialPurity(getText(selectedProduct.purity), metalType),
          weight: getText(
            selectedProduct.gross_weight ?? selectedProduct.net_gold_weight,
          ),
          approx_budget: getText(
            selectedProduct.offer_price ??
              selectedProduct.final_selling_price ??
              selectedProduct.mrp,
          ),
        }));
      }
    }
    setCatalogPicker(null);
  };

  const submitEnquiry = async () => {
    const customerName = form.customer_name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!customerName || !phone) {
      Alert.alert(
        'Required details',
        'Enter your name and mobile number to send the enquiry.',
      );
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }

    const numericFields = [
      ['Quantity', form.quantity],
      ['Weight', form.weight],
      ['Approximate budget', form.approx_budget],
    ] as const;
    for (const [label, value] of numericFields) {
      if (
        value.trim() &&
        (!Number.isFinite(Number(value)) || Number(value) < 0)
      ) {
        Alert.alert('Invalid value', `${label} must be a non-negative number.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const productId = Number(form.product_id);
      await api.post('/enquiries/public', {
        ...form,
        customer_name: customerName,
        phone,
        email: email || null,
        alternate_phone: form.alternate_phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
        product_category: form.product_category.trim() || null,
        product_id:
          Number.isSafeInteger(productId) && productId > 0
            ? productId
            : null,
        product_name: form.product_name.trim() || null,
        metal_type: form.metal_type.trim() || null,
        purity: form.purity.trim() || null,
        quantity: form.quantity.trim() ? Number(form.quantity) : null,
        weight: form.weight.trim() ? Number(form.weight) : null,
        approx_budget: form.approx_budget.trim()
          ? Number(form.approx_budget)
          : null,
        preferred_design: form.preferred_design.trim() || null,
        message: form.message.trim() || null,
        source: 'Mobile App',
        status: 'New Enquiry',
        priority: 'Medium',
        whatsapp_confirmation: true,
      });

      Alert.alert(
        'Enquiry sent âœ“',
        'Thank you! Our team will contact you shortly.',
        [{ text: 'Done', onPress: onSuccess }],
      );
    } catch (error) {
      console.error('Failed to submit enquiry:', error);
      Alert.alert('Enquiry failed', getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 px-4 py-4 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* â”€â”€ Customer Information â”€â”€ */}
        <View className="rounded-2xl border border-slate-100 bg-white p-4">
          <SectionHeading
            title="Customer Information"
            subtitle="Enter your contact details."
          />
          <View className="gap-3">
            <EnquiryInput
              label="Customer Name"
              required
              value={form.customer_name}
              onChangeText={v => updateField('customer_name', v)}
              maxLength={150}
              autoComplete="name"
            />
            <EnquiryInput
              label="Mobile Number"
              required
              value={form.phone}
              onChangeText={v => updateField('phone', v)}
              keyboardType="phone-pad"
              maxLength={32}
              autoComplete="tel"
            />
            <EnquiryInput
              label="Email Address"
              value={form.email}
              onChangeText={v => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={254}
              autoComplete="email"
            />
            <EnquiryInput
              label="Alternate Number"
              value={form.alternate_phone}
              onChangeText={v => updateField('alternate_phone', v)}
              keyboardType="phone-pad"
              maxLength={32}
            />
          </View>
        </View>

        {/* â”€â”€ Enquiry Details â”€â”€ */}
        <View className="rounded-2xl border border-slate-100 bg-white p-4">
          <SectionHeading
            title="Enquiry Details"
            subtitle={
              product
                ? 'Product info is pre-filled from the selected item.'
                : 'Tell us what you are looking for.'
            }
          />

          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-semibold text-slate-700">
              Enquiry Type
            </Text>
            <Pressable
              onPress={() => setIsEnquiryTypePickerOpen(true)}
              className="min-h-11 flex-row items-center justify-between rounded-lg border border-slate-200 bg-white px-3"
              accessibilityRole="button"
              accessibilityLabel={`Enquiry type: ${form.enquiry_type}`}
              accessibilityHint="Opens the enquiry type options."
            >
              <Text className="text-sm font-medium text-slate-800">
                {form.enquiry_type}
              </Text>
              <Text className="text-base font-bold text-slate-500">⌄</Text>
            </Pressable>
          </View>

          <View className="gap-3">
            <CatalogSelectField
              label="Product Category"
              value={form.product_category}
              placeholder="Select product category"
              isLoading={isLoadingCategories}
              error={categoryError}
              onPress={() => setCatalogPicker('category')}
              onRetry={() => setCatalogRefreshVersion(version => version + 1)}
            />
            <CatalogSelectField
              label="Product Name / Item"
              value={form.product_name}
              placeholder="Select product"
              isLoading={isLoadingProducts}
              error={productError}
              onPress={() => setCatalogPicker('product')}
              onRetry={() => setCatalogRefreshVersion(version => version + 1)}
            />
            <View className="flex-row gap-2">
              <CatalogSelectField
                className="flex-1"
                label="Metal Type"
                value={form.metal_type}
                placeholder="Select metal"
                isLoading={isLoadingMetals}
                error={metalError}
                onPress={() => setCatalogPicker('metal')}
                onRetry={() => setCatalogRefreshVersion(version => version + 1)}
              />
              <EnquiryInput
                className="flex-1"
                label="Purity"
                value={form.purity}
                onChangeText={v => updateField('purity', v)}
                maxLength={20}
              />
            </View>
            <View className="flex-row gap-2">
              <EnquiryInput
                className="flex-1"
                label="Quantity"
                value={form.quantity}
                onChangeText={v => updateField('quantity', v)}
                keyboardType="number-pad"
              />
              <EnquiryInput
                className="flex-1"
                label="Weight (grams)"
                value={form.weight}
                onChangeText={v => updateField('weight', v)}
                keyboardType="decimal-pad"
              />
            </View>
            <EnquiryInput
              label="Approx. Budget (â‚¹)"
              value={form.approx_budget}
              onChangeText={v => updateField('approx_budget', v)}
              keyboardType="decimal-pad"
            />
            <EnquiryInput
              label="Preferred Design"
              value={form.preferred_design}
              onChangeText={v => updateField('preferred_design', v)}
              maxLength={100}
            />
            <EnquiryInput
              label="Enquiry Message"
              value={form.message}
              onChangeText={v => updateField('message', v)}
              multiline
              maxLength={5000}
              placeholder="Enter your requirements or special notes..."
            />
          </View>
        </View>

        <Pressable
          className={`min-h-12 flex-row items-center justify-center rounded-xl bg-[#003B2D] px-4 py-3 ${
            isSubmitting ? 'opacity-70' : 'active:opacity-80'
          }`}
          onPress={submitEnquiry}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Send enquiry"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : null}
          <Text className="ml-2 text-sm font-bold text-white">
            {isSubmitting ? 'Sendingâ€¦' : 'Send Enquiry'}
          </Text>
        </Pressable>
      </ScrollView>
      <Modal
        visible={isEnquiryTypePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEnquiryTypePickerOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50 px-4">
          <Pressable
            className="absolute inset-0"
            onPress={() => setIsEnquiryTypePickerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close enquiry type options"
          />
          <View className="mb-4 overflow-hidden rounded-2xl bg-white">
            <View className="border-b border-slate-100 px-4 py-4">
              <Text className="text-base font-extrabold text-slate-900">
                Select Enquiry Type
              </Text>
            </View>
            {ENQUIRY_TYPES.map(type => {
              const selected = form.enquiry_type === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => {
                    updateField('enquiry_type', type);
                    setIsEnquiryTypePickerOpen(false);
                  }}
                  className="min-h-12 flex-row items-center justify-between border-b border-slate-100 px-4 py-3"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <Text
                    className={`text-sm ${
                      selected
                        ? 'font-bold text-primary'
                        : 'font-medium text-slate-700'
                    }`}
                  >
                    {type}
                  </Text>
                  {selected ? (
                    <Text className="text-sm font-bold text-primary">Selected</Text>
                  ) : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setIsEnquiryTypePickerOpen(false)}
              className="items-center px-4 py-3.5"
              accessibilityRole="button"
              accessibilityLabel="Close enquiry type selector"
            >
              <Text className="text-sm font-bold text-slate-600">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={catalogPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCatalogPicker(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            className="absolute inset-0"
            onPress={() => setCatalogPicker(null)}
            accessibilityRole="button"
            accessibilityLabel="Close catalog options"
          />
          <View className="max-h-[85%] overflow-hidden rounded-t-3xl bg-white pb-6">
            <View className="items-center pb-2 pt-3">
              <View className="h-1 w-10 rounded-full bg-slate-300" />
            </View>
            <View className="border-b border-slate-100 px-4 py-4">
              <Text className="text-base font-extrabold text-slate-900">
                {pickerTitle}
              </Text>
            </View>
            {pickerLoading ? (
              <View className="flex-row items-center justify-center px-4 py-5">
                <ActivityIndicator size="small" color="#004D40" />
                <Text className="ml-2 text-sm text-slate-600">Loading options…</Text>
              </View>
            ) : null}
            {pickerError ? (
              <View className="flex-row items-center justify-between gap-3 bg-rose-50 px-4 py-3">
                <Text className="flex-1 text-xs text-rose-800">
                  Could not load options.
                </Text>
                <Pressable
                  onPress={() => setCatalogRefreshVersion(version => version + 1)}
                  accessibilityRole="button"
                >
                  <Text className="text-xs font-bold text-primary">Retry</Text>
                </Pressable>
              </View>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled">
              {pickerOptions.map(option => {
                const selectedValue =
                  catalogPicker === 'category'
                    ? form.product_category
                    : catalogPicker === 'metal'
                      ? form.metal_type
                      : form.product_id;
                const selected = selectedValue === option.value;
                return (
                  <Pressable
                    key={`${option.label}-${option.value}`}
                    onPress={() => selectCatalogOption(option)}
                    className="min-h-12 flex-row items-center justify-between border-b border-slate-100 px-4 py-3"
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text
                      className={`flex-1 text-sm ${
                        selected
                          ? 'font-bold text-primary'
                          : 'font-medium text-slate-700'
                      }`}
                    >
                      {option.label || 'No specific product'}
                    </Text>
                    {selected ? (
                      <Text className="ml-3 text-xs font-bold text-primary">
                        Selected
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
              {!pickerLoading && pickerOptions.length === 0 ? (
                <Text className="px-4 py-6 text-center text-sm text-slate-500">
                  No active options are available.
                </Text>
              ) : null}
              {catalogPicker === 'product' &&
              !pickerLoading &&
              selectableProducts.length === 0 &&
              !productError ? (
                <Text className="px-4 pb-5 text-center text-xs text-slate-500">
                  No products match the selected category and metal type.
                </Text>
              ) : null}
            </ScrollView>
            <Pressable
              onPress={() => setCatalogPicker(null)}
              className="items-center border-t border-slate-100 px-4 py-3.5"
              accessibilityRole="button"
              accessibilityLabel="Close catalog selector"
            >
              <Text className="text-sm font-bold text-slate-600">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-extrabold text-slate-900">{title}</Text>
      <Text className="mt-0.5 text-[10px] text-slate-500">{subtitle}</Text>
    </View>
  );
}

function CatalogSelectField({
  label,
  value,
  placeholder,
  isLoading,
  error,
  onPress,
  onRetry,
  className = '',
}: {
  label: string;
  value: string;
  placeholder: string;
  isLoading: boolean;
  error: string;
  onPress: () => void;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <View className={className}>
      <Text className="mb-1.5 text-[11px] font-semibold text-slate-700">
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        className="min-h-11 flex-row items-center justify-between rounded-lg border border-slate-200 bg-white px-3"
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        accessibilityHint="Opens available catalog options."
      >
        <Text
          className={`flex-1 text-sm ${
            value ? 'font-medium text-slate-800' : 'text-slate-400'
          }`}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {isLoading ? (
          <ActivityIndicator size="small" color="#64748B" />
        ) : (
          <Text className="ml-2 text-base font-bold text-slate-500">⌄</Text>
        )}
      </Pressable>
      {error ? (
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="flex-1 text-[10px] text-rose-700">
            Options unavailable.
          </Text>
          <Pressable onPress={onRetry} accessibilityRole="button">
            <Text className="text-[10px] font-bold text-primary">Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function EnquiryInput({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  multiline = false,
  required = false,
  maxLength,
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'name' | 'tel';
  multiline?: boolean;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <View className={className}>
      <Text className="mb-1.5 text-[11px] font-semibold text-slate-700">
        {label}
        {required ? <Text className="text-rose-600"> *</Text> : null}
      </Text>
      <TextInput
        className={`rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 ${
          multiline ? 'min-h-20' : 'min-h-11'
        }`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        multiline={multiline}
        maxLength={maxLength}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={label}
      />
    </View>
  );
}
