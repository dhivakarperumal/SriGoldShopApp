import {
  useState,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

  const updateField = <K extends keyof EnquiryFormData>(
    key: K,
    value: EnquiryFormData[K],
  ) => setForm(current => ({ ...current, [key]: value }));

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
        'Enquiry sent',
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
        {/* Customer Information */}
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
            <EnquiryInput
              label="Address"
              value={form.address}
              onChangeText={v => updateField('address', v)}
              multiline
              maxLength={2000}
            />
            <View className="flex-row gap-2">
              <EnquiryInput
                className="flex-1"
                label="City"
                value={form.city}
                onChangeText={v => updateField('city', v)}
                maxLength={100}
              />
              <EnquiryInput
                className="flex-1"
                label="State"
                value={form.state}
                onChangeText={v => updateField('state', v)}
                maxLength={100}
              />
            </View>
            <EnquiryInput
              label="Pincode"
              value={form.pincode}
              onChangeText={v => updateField('pincode', v)}
              keyboardType="number-pad"
              maxLength={20}
            />
          </View>
        </View>

        {/* Enquiry Details */}
        <View className="rounded-2xl border border-slate-100 bg-white p-4">
          <SectionHeading
            title="Enquiry Details"
            subtitle={
              product
                ? 'Product info is pre-filled from the selected item.'
                : 'Tell us what you are looking for.'
            }
          />

          {/* Enquiry type chips */}
          <Text className="mb-2 text-[11px] font-semibold text-slate-700">
            Enquiry Type
          </Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {ENQUIRY_TYPES.map(type => {
              const selected = form.enquiry_type === type;
              return (
                <Pressable
                  key={type}
                  className={`rounded-lg border px-3 py-2 ${
                    selected
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 bg-white'
                  }`}
                  onPress={() => updateField('enquiry_type', type)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      selected ? 'text-amber-800' : 'text-slate-600'
                    }`}
                  >
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="gap-3">
            <EnquiryInput
              label="Product Category"
              value={form.product_category}
              onChangeText={v => updateField('product_category', v)}
              maxLength={100}
            />
            <EnquiryInput
              label="Product Name / Item"
              value={form.product_name}
              onChangeText={v => updateField('product_name', v)}
              maxLength={200}
            />
            <View className="flex-row gap-2">
              <EnquiryInput
                className="flex-1"
                label="Metal Type"
                value={form.metal_type}
                onChangeText={v => updateField('metal_type', v)}
                maxLength={100}
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
              label="Approx. Budget (₹)"
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
            {isSubmitting ? 'Sending...' : 'Send Enquiry'}
          </Text>
        </Pressable>
      </ScrollView>
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
