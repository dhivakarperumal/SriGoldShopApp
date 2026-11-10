import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';

export type DealerCategory = {
  id: string | number;
  name: string;
  active?: boolean;
};

export type DealerForm = {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  alternate_phone: string;
  category_id: string;
  gstin: string;
  pan: string;
  billing_address_line1: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  shipping_address_line1: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  opening_balance: string;
  opening_balance_side: 'payable' | 'receivable';
  opening_metal_weight: string;
  opening_metal_type: 'Gold' | 'Silver';
  opening_metal_purity: string;
  credit_limit: string;
  payment_terms_days: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  status: 'Active' | 'Inactive' | 'On Hold';
  notes: string;
};

export const createEmptyDealerForm = (): DealerForm => ({
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  alternate_phone: '',
  category_id: '',
  gstin: '',
  pan: '',
  billing_address_line1: '',
  billing_city: '',
  billing_state: '',
  billing_pincode: '',
  shipping_address_line1: '',
  shipping_city: '',
  shipping_state: '',
  shipping_pincode: '',
  opening_balance: '0',
  opening_balance_side: 'payable',
  opening_metal_weight: '',
  opening_metal_type: 'Gold',
  opening_metal_purity: '916',
  credit_limit: '0',
  payment_terms_days: '0',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_ifsc: '',
  status: 'Active',
  notes: '',
});

type Props = {
  onBack: () => void;
  onCreated: () => void;
};

const PURITIES = ['999', '916', '833', '750', '585'] as const;
const STATUS_OPTIONS = ['Active', 'Inactive', 'On Hold'] as const;

function AddDealers({ onBack, onCreated }: Props) {
  const [form, setForm] = useState<DealerForm>(createEmptyDealerForm);
  const [categories, setCategories] = useState<DealerCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const activeCategories = useMemo(
    () => categories.filter(category => category.active !== false),
    [categories],
  );
  const activePurities = form.opening_metal_type === 'Gold' ? PURITIES : ['999'];
  const updateForm = <K extends keyof DealerForm>(key: K, value: DealerForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingCategories(true);
    setCategoryError('');
    api.get<DealerCategory[]>('/dealers/categories')
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw new Error('The server returned invalid dealer categories.');
        }
        if (isCurrent) setCategories(data);
      })
      .catch(error => {
        console.error('Failed to load dealer categories:', error);
        if (isCurrent) {
          setCategoryError(
            typeof error === 'object' && error !== null && 'message' in error &&
              typeof error.message === 'string'
              ? error.message
              : 'Unable to load dealer categories.',
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingCategories(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [retry]);

  const saveDealer = async () => {
    if (!form.name.trim() || !form.contact_person.trim() || !form.phone.trim() || !form.category_id) {
      Alert.alert('Required information', 'Enter a dealer name, category, contact person, and phone number.');
      return;
    }

    setIsSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      contact_person: form.contact_person.trim(),
      category_id: /^\d+$/.test(form.category_id) ? Number(form.category_id) : form.category_id,
      opening_balance: Number(form.opening_balance) || 0,
      credit_limit: Number(form.credit_limit) || 0,
      payment_terms_days: Number(form.payment_terms_days) || 0,
      billing_address: {
        line1: form.billing_address_line1,
        city: form.billing_city,
        state: form.billing_state,
        pincode: form.billing_pincode,
      },
      shipping_address: {
        line1: form.shipping_address_line1,
        city: form.shipping_city,
        state: form.shipping_state,
        pincode: form.shipping_pincode,
      },
      bank_details: {
        bank_name: form.bank_name,
        account_name: form.bank_account_name,
        account_number: form.bank_account_number,
        ifsc: form.bank_ifsc,
      },
      opening_metal_balances: form.opening_metal_weight
        ? [{
            metal_type: form.opening_metal_type,
            purity: form.opening_metal_purity,
            weight: Number(form.opening_metal_weight),
          }]
        : [],
    };
    try {
      await api.post('/dealers', payload);
      Alert.alert('Partnership created', 'The dealer has been registered successfully.');
      onCreated();
    } catch (error) {
      console.error('Dealer submission failed:', error);
      const message =
        typeof error === 'object' && error !== null && 'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Failed to register dealer.';
      Alert.alert('Could not create dealer', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-[#00382E] bg-primary px-4 py-4">
        <Pressable
          onPress={onBack}
          disabled={isSaving}
          className="mr-3 h-10 w-10 items-center justify-center rounded-2xl border border-emerald-700/60 bg-emerald-900/40"
          accessibilityRole="button"
          accessibilityLabel="Back to dealers"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="m15 18-6-6 6-6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-extrabold tracking-tight text-white">
            Add New Dealer
          </Text>
          <Text className="mt-1 text-xs font-semibold text-accent-light">
            Initialize a new wholesale partnership.
          </Text>
        </View>
      </View>

        <ScrollView
          contentContainerClassName="gap-5 px-5 py-5 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormSection title="Partnership details">
            <FormInput
              label="Company / Dealer Name *"
              value={form.name}
              onChangeText={value => updateForm('name', value)}
              placeholder="e.g. Silk Traditions Ltd"
            />
            <FormInput
              label="Contact Person *"
              value={form.contact_person}
              onChangeText={value => updateForm('contact_person', value)}
              placeholder="Manager name"
            />
            <FormInput
              label="Email Address"
              value={form.email}
              onChangeText={value => updateForm('email', value)}
              placeholder="dealer@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormInput
              label="Phone Number *"
              value={form.phone}
              onChangeText={value => updateForm('phone', value)}
              placeholder="+91 00000 00000"
              keyboardType="phone-pad"
            />
            <FormInput
              label="Alternate Phone"
              value={form.alternate_phone}
              onChangeText={value => updateForm('alternate_phone', value)}
              keyboardType="phone-pad"
            />
            <Text className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              Dealer Category *
            </Text>
            {isLoadingCategories ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#004D40" />
                <Text className="text-xs text-slate-500">Loading dealer categories…</Text>
              </View>
            ) : categoryError ? (
              <View className="gap-2">
                <Text className="text-xs text-rose-700">{categoryError}</Text>
                <Pressable
                  onPress={() => setRetry(value => value + 1)}
                  className="self-start rounded-lg bg-rose-700 px-3 py-2"
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading dealer categories"
                >
                  <Text className="text-xs font-bold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : activeCategories.length ? (
              <ChoiceRow
                values={activeCategories.map(category => [String(category.id), category.name] as const)}
                selected={form.category_id}
                onSelect={value => updateForm('category_id', value)}
              />
            ) : (
              <Text className="text-xs text-rose-700">No active dealer categories are available.</Text>
            )}
            <Text className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              Status
            </Text>
            <ChoiceRow
              values={STATUS_OPTIONS.map(value => [value, value] as const)}
              selected={form.status}
              onSelect={value => updateForm('status', value)}
            />
          </FormSection>

          <FormSection title="Business location">
            <FormInput
              label="Address"
              value={form.billing_address_line1}
              onChangeText={value => updateForm('billing_address_line1', value)}
            />
            <FormInput
              label="City"
              value={form.billing_city}
              onChangeText={value => updateForm('billing_city', value)}
              placeholder="City"
            />
            <FormInput
              label="State"
              value={form.billing_state}
              onChangeText={value => updateForm('billing_state', value)}
            />
            <FormInput
              label="Pincode"
              value={form.billing_pincode}
              onChangeText={value => updateForm('billing_pincode', value)}
              keyboardType="number-pad"
            />
          </FormSection>

          <FormSection title="Shipping address">
            <FormInput
              label="Address"
              value={form.shipping_address_line1}
              onChangeText={value => updateForm('shipping_address_line1', value)}
            />
            <FormInput
              label="City"
              value={form.shipping_city}
              onChangeText={value => updateForm('shipping_city', value)}
            />
            <FormInput
              label="State"
              value={form.shipping_state}
              onChangeText={value => updateForm('shipping_state', value)}
            />
            <FormInput
              label="Pincode"
              value={form.shipping_pincode}
              onChangeText={value => updateForm('shipping_pincode', value)}
              keyboardType="number-pad"
            />
          </FormSection>

          <FormSection title="Tax and account details">
            <FormInput
              label="GSTIN"
              value={form.gstin}
              onChangeText={value => updateForm('gstin', value.toUpperCase())}
              autoCapitalize="characters"
            />
            <FormInput
              label="PAN"
              value={form.pan}
              onChangeText={value => updateForm('pan', value.toUpperCase())}
              autoCapitalize="characters"
            />
            <FormInput
              label="Credit Limit (₹)"
              value={form.credit_limit}
              onChangeText={value => updateForm('credit_limit', value)}
              keyboardType="decimal-pad"
            />
            <FormInput
              label="Payment Terms (days)"
              value={form.payment_terms_days}
              onChangeText={value => updateForm('payment_terms_days', value)}
              keyboardType="number-pad"
            />
          </FormSection>

          <FormSection title="Opening balances">
              <FormInput
                label="Opening Balance (₹)"
                value={form.opening_balance}
                onChangeText={value => updateForm('opening_balance', value)}
                keyboardType="decimal-pad"
              />
              <ChoiceRow
                values={[['payable', 'Payable'], ['receivable', 'Receivable']] as const}
                selected={form.opening_balance_side}
                onSelect={value => updateForm('opening_balance_side', value)}
              />
              <Text className="text-xs leading-5 text-slate-500">
                Financial and metal balances are tracked separately.
              </Text>
              <ChoiceRow
                values={[['Gold', 'Gold'], ['Silver', 'Silver']] as const}
                selected={form.opening_metal_type}
                onSelect={value => updateForm('opening_metal_type', value)}
              />
              <ChoiceRow
                values={activePurities.map(value => [value, value] as const)}
                selected={form.opening_metal_purity}
                onSelect={value => updateForm('opening_metal_purity', value)}
              />
              <FormInput
                label="Opening Metal Weight (g)"
                value={form.opening_metal_weight}
                onChangeText={value => updateForm('opening_metal_weight', value)}
                keyboardType="decimal-pad"
              />
          </FormSection>

          <FormSection title="Bank details">
            <FormInput label="Bank Name" value={form.bank_name} onChangeText={value => updateForm('bank_name', value)} />
            <FormInput label="Account Holder" value={form.bank_account_name} onChangeText={value => updateForm('bank_account_name', value)} />
            <FormInput label="Account Number" value={form.bank_account_number} onChangeText={value => updateForm('bank_account_number', value)} keyboardType="number-pad" />
            <FormInput label="IFSC" value={form.bank_ifsc} onChangeText={value => updateForm('bank_ifsc', value.toUpperCase())} autoCapitalize="characters" />
          </FormSection>

          <FormSection title="Notes">
            <FormInput
              label="Account Notes"
              value={form.notes}
              onChangeText={value => updateForm('notes', value)}
              multiline
            />
          </FormSection>

          <View className="flex-row items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Pressable onPress={onBack} disabled={isSaving} className="rounded-xl px-5 py-3" accessibilityRole="button">
              <Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Close</Text>
            </Pressable>
            <Pressable
              onPress={saveDealer}
              disabled={isSaving || isLoadingCategories || activeCategories.length === 0}
              className="min-w-44 flex-row items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 disabled:opacity-50"
              accessibilityRole="button"
              accessibilityLabel="Create partnership"
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-base text-white">✓</Text>
                  <Text className="text-xs font-extrabold text-white">Create Partnership</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
    </View>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3 rounded-[24px] border border-slate-100 bg-white p-4">
      <Text className="text-sm font-extrabold text-slate-800">{title}</Text>
      {children}
    </View>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'decimal-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}) {
  return (
    <View className="gap-1.5">
      <Text className="ml-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-2xl border-2 border-transparent bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 ${
          multiline ? 'min-h-24' : ''
        }`}
        accessibilityLabel={label}
      />
    </View>
  );
}

function ChoiceRow<T extends string>({
  values,
  selected,
  onSelect,
}: {
  values: readonly (readonly [T, string])[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {values.map(([value, label]) => {
        const active = selected === value;
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            className={`rounded-full border px-3 py-2 ${
              active ? 'border-primary bg-primary' : 'border-slate-200 bg-white'
            }`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Select ${label}`}
          >
            <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-700'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default AddDealers;
