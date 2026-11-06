import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';
import type { ProductCardData } from '../../Components/ProductCard';

type UserProductEnquiryProps = {
  product: ProductCardData;
  user: AuthenticatedUser;
  onClose: () => void;
};

type EnquiryType =
  | 'Gold Jewellery'
  | 'Gold Coin / Bar'
  | 'Gold Loan'
  | 'Old Gold Exchange'
  | 'Other';

type EnquiryForm = {
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

const ENQUIRY_TYPES: EnquiryType[] = [
  'Gold Jewellery',
  'Gold Coin / Bar',
  'Gold Loan',
  'Old Gold Exchange',
  'Other',
];

function getText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function initialEnquiryType(category: string): EnquiryType {
  const normalizedCategory = category.toLowerCase();
  if (normalizedCategory.includes('coin') || normalizedCategory.includes('bar')) {
    return 'Gold Coin / Bar';
  }
  if (normalizedCategory.includes('loan')) return 'Gold Loan';
  if (normalizedCategory.includes('exchange')) return 'Old Gold Exchange';
  return 'Gold Jewellery';
}

function initialPurity(purity: string, metalType: string): string {
  if (metalType !== 'Gold') return purity;
  return (
    {
      '999': '24K',
      '916': '22K',
      '833': '20K',
      '750': '18K',
      '585': '14K',
    }[purity] || purity
  );
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Unable to send your enquiry. Please try again.';
}

function UserProductEnquiry({
  product,
  user,
  onClose,
}: UserProductEnquiryProps) {
  const category = getText(product.category);
  const [form, setForm] = useState<EnquiryForm>({
    customer_name: user.name || user.username || '',
    phone: user.phone || user.mobile || user.phone_number || '',
    alternate_phone: '',
    email: user.email || '',
    address: user.address || '',
    city: '',
    state: '',
    pincode: '',
    enquiry_type: initialEnquiryType(category),
    product_category: category,
    product_id: getText(product.id ?? product.product_id ?? product.productId),
    product_name: getText(product.name),
    metal_type: getText(product.metal_type) || 'Gold',
    purity: initialPurity(
      getText(product.purity),
      getText(product.metal_type) || 'Gold',
    ),
    quantity: '1',
    weight: getText(product.gross_weight),
    approx_budget: getText(
      product.offer_price ?? product.final_selling_price ?? product.mrp,
    ),
    preferred_design: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof EnquiryForm>(
    key: K,
    value: EnquiryForm[K],
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
      if (value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
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
          Number.isSafeInteger(productId) && productId > 0 ? productId : null,
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
        'Thank you. Our team will get back to you soon.',
        [{ text: 'Done', onPress: onClose }],
      );
    } catch (error) {
      console.error('Failed to submit product enquiry:', error);
      Alert.alert('Enquiry failed', getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
      statusBarTranslucent
    >
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-lg font-extrabold text-slate-900">
                Enquire About This Product
              </Text>
              <Text className="mt-1 text-xs text-slate-500" numberOfLines={1}>
                {form.product_name || 'Share your details and we’ll get back to you.'}
              </Text>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
              onPress={onClose}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Close enquiry"
            >
              <Text className="text-lg text-slate-600">×</Text>
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-3 px-4 py-4 pb-8"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                  onChangeText={value => updateField('customer_name', value)}
                  maxLength={150}
                  autoComplete="name"
                />
                <EnquiryInput
                  label="Mobile Number"
                  required
                  value={form.phone}
                  onChangeText={value => updateField('phone', value)}
                  keyboardType="phone-pad"
                  maxLength={32}
                  autoComplete="tel"
                />
                <EnquiryInput
                  label="Email Address"
                  value={form.email}
                  onChangeText={value => updateField('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={254}
                  autoComplete="email"
                />
                <EnquiryInput
                  label="Alternate Number"
                  value={form.alternate_phone}
                  onChangeText={value => updateField('alternate_phone', value)}
                  keyboardType="phone-pad"
                  maxLength={32}
                />
                <EnquiryInput
                  label="Address"
                  value={form.address}
                  onChangeText={value => updateField('address', value)}
                  multiline
                  maxLength={2000}
                />
                <View className="flex-row gap-2">
                  <EnquiryInput
                    className="flex-1"
                    label="City"
                    value={form.city}
                    onChangeText={value => updateField('city', value)}
                    maxLength={100}
                  />
                  <EnquiryInput
                    className="flex-1"
                    label="State"
                    value={form.state}
                    onChangeText={value => updateField('state', value)}
                    maxLength={100}
                  />
                </View>
                <EnquiryInput
                  label="Pincode"
                  value={form.pincode}
                  onChangeText={value => updateField('pincode', value)}
                  keyboardType="number-pad"
                  maxLength={20}
                />
              </View>
            </View>

            <View className="rounded-2xl border border-slate-100 bg-white p-4">
              <SectionHeading
                title="Enquiry Details"
                subtitle="Product information is prefilled from the card."
              />
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
                  onChangeText={value => updateField('product_category', value)}
                  maxLength={100}
                />
                <EnquiryInput
                  label="Product Name / Item"
                  value={form.product_name}
                  onChangeText={value => updateField('product_name', value)}
                  maxLength={200}
                />
                <View className="flex-row gap-2">
                  <EnquiryInput
                    className="flex-1"
                    label="Metal Type"
                    value={form.metal_type}
                    onChangeText={value => updateField('metal_type', value)}
                    maxLength={100}
                  />
                  <EnquiryInput
                    className="flex-1"
                    label="Purity"
                    value={form.purity}
                    onChangeText={value => updateField('purity', value)}
                    maxLength={20}
                  />
                </View>
                <View className="flex-row gap-2">
                  <EnquiryInput
                    className="flex-1"
                    label="Quantity"
                    value={form.quantity}
                    onChangeText={value => updateField('quantity', value)}
                    keyboardType="number-pad"
                  />
                  <EnquiryInput
                    className="flex-1"
                    label="Weight (grams)"
                    value={form.weight}
                    onChangeText={value => updateField('weight', value)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <EnquiryInput
                  label="Approx. Budget (₹)"
                  value={form.approx_budget}
                  onChangeText={value => updateField('approx_budget', value)}
                  keyboardType="decimal-pad"
                />
                <EnquiryInput
                  label="Preferred Design"
                  value={form.preferred_design}
                  onChangeText={value => updateField('preferred_design', value)}
                  maxLength={100}
                />
                <EnquiryInput
                  label="Enquiry Message"
                  value={form.message}
                  onChangeText={value => updateField('message', value)}
                  multiline
                  maxLength={5000}
                  placeholder="Enter your requirements or special notes..."
                />
              </View>
            </View>
          </ScrollView>

          <View className="border-t border-slate-200 bg-white px-4 py-3">
            <Pressable
              className={`min-h-12 flex-row items-center justify-center rounded-xl bg-[#00796B] px-4 py-3 ${
                isSubmitting ? 'opacity-70' : 'active:opacity-80'
              }`}
              onPress={submitEnquiry}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : null}
              <Text className="ml-2 text-sm font-bold text-white">
                {isSubmitting ? 'Sending…' : 'Send Enquiry'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

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

export default UserProductEnquiry;
