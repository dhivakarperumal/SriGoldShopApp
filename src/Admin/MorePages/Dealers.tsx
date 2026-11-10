import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';

type Props = { onBack: () => void; onAddDealer: () => void };
type DealerCategory = { id: string | number; name: string; active?: boolean };
type Address = { line1?: string; city?: string; state?: string; pincode?: string };
type Dealer = {
  id: string | number;
  name: string;
  dealer_code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  category_id?: string | number;
  category_name?: string;
  gstin?: string;
  pan?: string;
  billing_address?: Address;
  shipping_address?: Address;
  opening_balance?: number | string;
  opening_balance_side?: 'payable' | 'receivable';
  opening_metal_balances?: Array<{ metal_type?: string; purity?: string; weight?: number | string }>;
  credit_limit?: number | string;
  payment_terms_days?: number | string;
  bank_details?: { bank_name?: string; account_name?: string; account_number?: string; ifsc?: string };
  payable_balance?: number | string;
  receivable_balance?: number | string;
  status?: string;
  notes?: string;
};
type DealerResponse = { dealers?: Dealer[]; pagination?: { total?: number; totalPages?: number } };
type Summary = {
  dealers?: { active?: number };
  payables?: number;
  receivables?: number;
  purchases_this_month?: number;
  overdue?: { count?: number; amount?: number };
  pending_jobs?: number;
};
type DealerForm = {
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

const EMPTY_FORM: DealerForm = {
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
};
const FILTERS = ['All', 'Active', 'Inactive', 'On Hold'] as const;
const PURITIES = ['999', '916', '833', '750', '585'] as const;

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const currency = (value: unknown) =>
  `₹${numberValue(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const errorMessage = (error: unknown) =>
  typeof error === 'object' && error !== null && 'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : 'Unable to load dealer information. Please try again.';

function dealerFormFrom(dealer?: Dealer): DealerForm {
  if (!dealer) return { ...EMPTY_FORM };
  const billing = dealer.billing_address ?? {};
  const bank = dealer.bank_details ?? {};
  const metal = dealer.opening_metal_balances?.[0];
  return {
    ...EMPTY_FORM,
    ...dealer,
    category_id: String(dealer.category_id ?? ''),
    billing_address_line1: billing.line1 ?? '',
    billing_city: billing.city ?? '',
    billing_state: billing.state ?? '',
    billing_pincode: billing.pincode ?? '',
    shipping_address_line1: dealer.shipping_address?.line1 ?? '',
    shipping_city: dealer.shipping_address?.city ?? '',
    shipping_state: dealer.shipping_address?.state ?? '',
    shipping_pincode: dealer.shipping_address?.pincode ?? '',
    opening_balance: String(dealer.opening_balance ?? '0'),
    opening_balance_side: dealer.opening_balance_side ?? 'payable',
    opening_metal_weight: String(metal?.weight ?? ''),
    opening_metal_type: metal?.metal_type === 'Silver' ? 'Silver' : 'Gold',
    opening_metal_purity: metal?.purity ?? '916',
    credit_limit: String(dealer.credit_limit ?? '0'),
    payment_terms_days: String(dealer.payment_terms_days ?? '0'),
    bank_name: bank.bank_name ?? '',
    bank_account_name: bank.account_name ?? '',
    bank_account_number: bank.account_number ?? '',
    bank_ifsc: bank.ifsc ?? '',
    status: dealer.status === 'Inactive' || dealer.status === 'On Hold' ? dealer.status : 'Active',
    notes: dealer.notes ?? '',
  };
}

function Dealers({ onBack, onAddDealer }: Props) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [categories, setCategories] = useState<DealerCategory[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof FILTERS)[number]>('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [form, setForm] = useState<DealerForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const loadDealers = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [dealerResult, categoryResult, summaryResult] = await Promise.all([
        api.get<Dealer[] | DealerResponse>('/dealers', {
          params: {
            page,
            limit: 25,
            search: search.trim(),
            status: status === 'All' ? undefined : status,
          },
        }),
        api.get<DealerCategory[]>('/dealers/categories'),
        api.get<Summary>('/dealers/summary'),
      ]);
      const dealerData = dealerResult.data;
      const dealerRows = Array.isArray(dealerData) ? dealerData : dealerData?.dealers;
      if (!Array.isArray(dealerRows) || !Array.isArray(categoryResult.data)) {
        throw new Error('The server returned invalid dealer information.');
      }
      setDealers(dealerRows);
      setTotal(Array.isArray(dealerData) ? dealerRows.length : numberValue(dealerData.pagination?.total));
      setTotalPages(Array.isArray(dealerData)
        ? 1
        : Math.max(1, numberValue(dealerData.pagination?.totalPages) || 1));
      setCategories(categoryResult.data);
      setSummary(summaryResult.data ?? null);
    } catch (loadError) {
      console.error('Dealer management load failed:', loadError);
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = setTimeout(() => { loadDealers(); }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadDealers, retry, search]);

  const activeCategories = useMemo(
    () => categories.filter(category => category.active !== false),
    [categories],
  );
  const updateForm = <K extends keyof DealerForm>(key: K, value: DealerForm[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const openForm = (dealer?: Dealer) => {
    setEditing(dealer ?? null);
    setForm(dealerFormFrom(dealer));
    setFormOpen(true);
  };

  const saveDealer = async () => {
    if (!form.name.trim() || !form.contact_person.trim() || !form.phone.trim() || !form.category_id) {
      Alert.alert('Required information', 'Enter a dealer name, category, contact person, and phone number.');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      contact_person: form.contact_person.trim(),
      category_id: /^\d+$/.test(form.category_id) ? Number(form.category_id) : form.category_id,
      opening_balance: numberValue(form.opening_balance),
      credit_limit: numberValue(form.credit_limit),
      payment_terms_days: numberValue(form.payment_terms_days),
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
            weight: numberValue(form.opening_metal_weight),
          }]
        : [],
    };
    try {
      if (editing) await api.put(`/dealers/${editing.id}`, payload);
      else await api.post('/dealers', payload);
      setFormOpen(false);
      setEditing(null);
      if (page !== 1) setPage(1);
      else await loadDealers(true);
      Alert.alert('Saved', editing ? 'Dealer profile updated.' : 'Dealer registered successfully.');
    } catch (saveError) {
      console.error('Dealer profile save failed:', saveError);
      Alert.alert('Could not save dealer', errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-[#00382E] bg-primary px-4 py-3">
        <Pressable
          onPress={onBack}
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="m15 18-6-6 6-6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-extrabold text-white">Dealers</Text>
          <Text className="text-xs text-accent-light">Jewellery trade partners</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { loadDealers(true); }}
            tintColor="#004D40"
            colors={['#004D40']}
          />
        }
      >
        <View className="flex-row flex-wrap justify-between gap-y-3">
          <SummaryCard label="Active dealers" value={summary?.dealers?.active ?? '—'} color="#047857" />
          <SummaryCard label="Supplier payables" value={summary ? currency(summary.payables) : '—'} color="#B7791F" />
          <SummaryCard label="Dealer receivables" value={summary ? currency(summary.receivables) : '—'} color="#0369A1" />
          <SummaryCard label="Purchases this month" value={summary ? currency(summary.purchases_this_month) : '—'} color="#C2410C" />
          <SummaryCard label="Overdue invoices" value={summary ? `${summary.overdue?.count ?? 0} · ${currency(summary.overdue?.amount)}` : '—'} color="#BE123C" />
          <SummaryCard label="Open job orders" value={summary?.pending_jobs ?? '—'} color="#0F766E" />
        </View>

        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <TextInput
            value={search}
            onChangeText={value => {
              setPage(1);
              setSearch(value);
            }}
            placeholder="Search dealer, code, contact, or phone"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
            accessibilityLabel="Search dealers"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row gap-2">
            {FILTERS.map(filter => {
              const selected = status === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => {
                    setPage(1);
                    setStatus(filter);
                  }}
                  className={`rounded-full border px-4 py-2 ${
                    selected ? 'border-primary bg-primary' : 'border-slate-200 bg-white'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Filter dealers ${filter}`}
                >
                  <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-700'}`}>{filter}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {error ? (
          <View className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-bold text-rose-800">Could not load dealer records.</Text>
            <Text className="mt-1 text-xs leading-5 text-rose-700">{error}</Text>
            <Pressable onPress={() => setRetry(value => value + 1)} className="mt-3 self-start rounded-lg bg-rose-700 px-4 py-2" accessibilityRole="button">
              <Text className="text-xs font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-white py-12">
            <ActivityIndicator size="large" color="#004D40" />
            <Text className="mt-3 text-sm text-slate-500">Loading dealers…</Text>
          </View>
        ) : dealers.length ? (
          <View className="gap-3">
            {dealers.map(dealer => (
              <DealerCard key={dealer.id} dealer={dealer} onEdit={() => openForm(dealer)} />
            ))}
            <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <Text className="text-xs text-slate-500">{total} dealer records · Page {page} of {totalPages}</Text>
              <View className="flex-row gap-2">
                <PageButton label="Previous" disabled={page <= 1} onPress={() => setPage(current => Math.max(1, current - 1))} />
                <PageButton label="Next" disabled={page >= totalPages} onPress={() => setPage(current => Math.min(totalPages, current + 1))} />
              </View>
            </View>
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-slate-200 bg-white px-5 py-10">
            <Text className="text-sm font-bold text-slate-800">
              {search || status !== 'All' ? 'No dealers match your filters.' : 'No dealers registered yet.'}
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">Add a dealer to manage supplier details and balances.</Text>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-5 right-5 items-end">
        <Pressable
          onPress={onAddDealer}
          className="h-14 w-14 items-center justify-center rounded-full border-2 border-accent-light bg-primary shadow-lg"
          accessibilityRole="button"
          accessibilityLabel="Register dealer"
        >
          <Text className="text-2xl font-bold text-white">+</Text>
        </Pressable>
      </View>

      <DealerFormModal
        visible={formOpen && Boolean(editing)}
        form={form}
        categories={activeCategories}
        isEditing
        isSaving={saving}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
        onChange={updateForm}
        onSave={saveDealer}
      />
    </View>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View className="min-h-[96px] w-[48%] justify-center rounded-2xl border bg-white p-3" style={{ borderColor: `${color}40` }}>
      <Text className="text-[11px] font-semibold text-slate-500">{label}</Text>
      <Text className="mt-1 text-base font-extrabold text-slate-900" numberOfLines={1}>{value}</Text>
    </View>
  );
}

function DealerCard({ dealer, onEdit }: { dealer: Dealer; onEdit: () => void }) {
  const active = dealer.status === 'Active';
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-extrabold text-primary-dark" numberOfLines={1}>{dealer.name}</Text>
          <Text className="mt-1 text-[10px] font-semibold text-slate-500">
            {dealer.dealer_code || 'Dealer'} · {dealer.category_name || 'Uncategorized'}
          </Text>
        </View>
        <Text className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
          active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
        }`}>{dealer.status || 'Unknown'}</Text>
      </View>
      <View className="border-t border-slate-100 pt-3">
        <Text className="text-xs font-semibold text-slate-700">{dealer.contact_person || 'Contact unavailable'}</Text>
        <Text className="mt-1 text-xs text-slate-500">
          {[dealer.phone, dealer.email].filter(Boolean).join(' · ') || 'No contact details'}
        </Text>
      </View>
      <View className="flex-row items-center justify-between border-t border-slate-100 pt-3">
        <View>
          <Text className="text-[10px] text-slate-500">Payable</Text>
          <Text className="mt-0.5 text-xs font-extrabold text-slate-800">{currency(dealer.payable_balance)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] text-slate-500">Receivable</Text>
          <Text className="mt-0.5 text-xs font-extrabold text-slate-800">{currency(dealer.receivable_balance)}</Text>
        </View>
        <Pressable onPress={onEdit} className="rounded-lg bg-primary px-4 py-2" accessibilityRole="button" accessibilityLabel={`Edit ${dealer.name}`}>
          <Text className="text-xs font-bold text-white">Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PageButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" accessibilityRole="button" accessibilityLabel={label}>
      <Text className="text-[10px] font-bold text-slate-700">{label}</Text>
    </Pressable>
  );
}

function DealerFormModal({
  visible,
  form,
  categories,
  isEditing,
  isSaving,
  onClose,
  onChange,
  onSave,
}: {
  visible: boolean;
  form: DealerForm;
  categories: DealerCategory[];
  isEditing: boolean;
  isSaving: boolean;
  onClose: () => void;
  onChange: <K extends keyof DealerForm>(key: K, value: DealerForm[K]) => void;
  onSave: () => void;
}) {
  const statusOptions = ['Active', 'Inactive', 'On Hold'] as const;
  const metalOptions = ['Gold', 'Silver'] as const;
  const purities = form.opening_metal_type === 'Gold' ? PURITIES : ['999'];
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <View>
            <Text className="text-lg font-extrabold text-slate-900">{isEditing ? 'Edit dealer' : 'Register dealer'}</Text>
            <Text className="text-xs text-slate-500">Dealer contact and account details</Text>
          </View>
          <Pressable onPress={onClose} disabled={isSaving} className="rounded-lg bg-slate-100 px-3 py-2" accessibilityRole="button" accessibilityLabel="Close dealer form">
            <Text className="text-xs font-bold text-slate-700">Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8" keyboardShouldPersistTaps="handled">
          <FormSection title="Dealer details">
            <FormInput label="Dealer / firm name *" value={form.name} onChangeText={value => onChange('name', value)} />
            <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Category *</Text>
            {categories.length ? (
              <ChoiceRow values={categories.map(category => [String(category.id), category.name] as const)} selected={form.category_id} onSelect={value => onChange('category_id', value)} />
            ) : <Text className="text-xs text-rose-700">No active dealer categories are available.</Text>}
            <FormInput label="Contact person *" value={form.contact_person} onChangeText={value => onChange('contact_person', value)} />
            <FormInput label="Phone *" value={form.phone} onChangeText={value => onChange('phone', value)} keyboardType="phone-pad" />
            <FormInput label="Alternate phone" value={form.alternate_phone} onChangeText={value => onChange('alternate_phone', value)} keyboardType="phone-pad" />
            <FormInput label="Email" value={form.email} onChangeText={value => onChange('email', value)} keyboardType="email-address" autoCapitalize="none" />
            <FormInput label="GSTIN" value={form.gstin} onChangeText={value => onChange('gstin', value.toUpperCase())} autoCapitalize="characters" />
            <FormInput label="PAN" value={form.pan} onChangeText={value => onChange('pan', value.toUpperCase())} autoCapitalize="characters" />
            <ChoiceRow values={statusOptions.map(value => [value, value] as const)} selected={form.status} onSelect={value => onChange('status', value)} />
          </FormSection>

          {!isEditing ? (
            <FormSection title="Opening balances">
              <FormInput label="Opening balance (₹)" value={form.opening_balance} onChangeText={value => onChange('opening_balance', value)} keyboardType="decimal-pad" />
              <ChoiceRow
                values={[['payable', 'Payable'], ['receivable', 'Receivable']] as const}
                selected={form.opening_balance_side}
                onSelect={value => onChange('opening_balance_side', value)}
              />
              <Text className="text-xs text-slate-500">Optional opening metal balance. Financial and metal balances are tracked separately.</Text>
              <ChoiceRow values={metalOptions.map(value => [value, value] as const)} selected={form.opening_metal_type} onSelect={value => onChange('opening_metal_type', value)} />
              <ChoiceRow values={purities.map(value => [value, value] as const)} selected={form.opening_metal_purity} onSelect={value => onChange('opening_metal_purity', value)} />
              <FormInput label="Opening metal weight (g)" value={form.opening_metal_weight} onChangeText={value => onChange('opening_metal_weight', value)} keyboardType="decimal-pad" />
            </FormSection>
          ) : null}

          <FormSection title="Business and banking">
            <FormInput label="Credit limit (₹)" value={form.credit_limit} onChangeText={value => onChange('credit_limit', value)} keyboardType="decimal-pad" />
            <FormInput label="Payment terms (days)" value={form.payment_terms_days} onChangeText={value => onChange('payment_terms_days', value)} keyboardType="number-pad" />
            <FormInput label="Bank name" value={form.bank_name} onChangeText={value => onChange('bank_name', value)} />
            <FormInput label="Account holder" value={form.bank_account_name} onChangeText={value => onChange('bank_account_name', value)} />
            <FormInput label="Account number" value={form.bank_account_number} onChangeText={value => onChange('bank_account_number', value)} keyboardType="number-pad" />
            <FormInput label="IFSC" value={form.bank_ifsc} onChangeText={value => onChange('bank_ifsc', value.toUpperCase())} autoCapitalize="characters" />
          </FormSection>

          <FormSection title="Billing address">
            <FormInput label="Address" value={form.billing_address_line1} onChangeText={value => onChange('billing_address_line1', value)} />
            <FormInput label="City" value={form.billing_city} onChangeText={value => onChange('billing_city', value)} />
            <FormInput label="State" value={form.billing_state} onChangeText={value => onChange('billing_state', value)} />
            <FormInput label="Pincode" value={form.billing_pincode} onChangeText={value => onChange('billing_pincode', value)} keyboardType="number-pad" />
          </FormSection>

          <FormSection title="Shipping address">
            <FormInput label="Address" value={form.shipping_address_line1} onChangeText={value => onChange('shipping_address_line1', value)} />
            <FormInput label="City" value={form.shipping_city} onChangeText={value => onChange('shipping_city', value)} />
            <FormInput label="State" value={form.shipping_state} onChangeText={value => onChange('shipping_state', value)} />
            <FormInput label="Pincode" value={form.shipping_pincode} onChangeText={value => onChange('shipping_pincode', value)} keyboardType="number-pad" />
          </FormSection>

          <FormSection title="Notes">
            <FormInput label="Account notes" value={form.notes} onChangeText={value => onChange('notes', value)} multiline />
          </FormSection>

          <View className="flex-row gap-3">
            <Pressable onPress={onClose} disabled={isSaving} className="flex-1 items-center rounded-xl border border-slate-200 bg-white py-3" accessibilityRole="button">
              <Text className="text-sm font-bold text-slate-700">Close</Text>
            </Pressable>
            <Pressable onPress={onSave} disabled={isSaving || categories.length === 0} className="flex-1 items-center rounded-xl bg-primary py-3 disabled:opacity-50" accessibilityRole="button" accessibilityLabel={isEditing ? 'Save dealer profile' : 'Create dealer'}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-sm font-bold text-white">{isEditing ? 'Save profile' : 'Create dealer'}</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-sm font-extrabold text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'decimal-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 ${multiline ? 'min-h-24' : ''}`}
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
            className={`rounded-full border px-3 py-2 ${active ? 'border-primary bg-primary' : 'border-slate-200 bg-white'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-700'}`}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default Dealers;