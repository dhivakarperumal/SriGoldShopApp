import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';

const RATE_FIELDS = [
  { key: 'gold_999', label: 'Gold 24K (999)', metal: 'Gold', purity: '999', unit: 'gram' },
  { key: 'gold_916', label: 'Gold 22K (916)', metal: 'Gold', purity: '916', unit: 'gram' },
  { key: 'gold_833', label: 'Gold 20K (833)', metal: 'Gold', purity: '833', unit: 'gram' },
  { key: 'gold_750', label: 'Gold 18K (750)', metal: 'Gold', purity: '750', unit: 'gram' },
  { key: 'gold_585', label: 'Gold 14K (585)', metal: 'Gold', purity: '585', unit: 'gram' },
  { key: 'silver_999', label: 'Silver 999', metal: 'Silver', purity: '999', unit: 'gram' },
  { key: 'platinum_950', label: 'Platinum 950', metal: 'Platinum', purity: '950', unit: 'gram' },
  { key: 'platinum_900', label: 'Platinum 900', metal: 'Platinum', purity: '900', unit: 'gram' },
  { key: 'diamond_df_vvs', label: 'Diamond D–F / VVS', metal: 'Diamond', purity: 'D-F / VVS', unit: 'carat' },
  { key: 'diamond_gh_vs', label: 'Diamond G–H / VS', metal: 'Diamond', purity: 'G-H / VS', unit: 'carat' },
  { key: 'diamond_ij_si', label: 'Diamond I–J / SI', metal: 'Diamond', purity: 'I-J / SI', unit: 'carat' },
] as const;

type RateKey = (typeof RATE_FIELDS)[number]['key'];
type RateForm = {
  rate_date: string;
  effective_from: string;
  making_charge_type: 'Percentage' | 'Fixed Amount';
  making_charge_value: string;
  wastage_percentage: string;
  reason: string;
  rates: Record<RateKey, string>;
};

type Props = {
  onCancel: () => void;
  onSaved: () => void;
};

const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const localDateTime = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const createBlankForm = (): RateForm => {
  const now = new Date();
  return {
    rate_date: localDate(now),
    effective_from: localDateTime(now),
    making_charge_type: 'Percentage',
    making_charge_value: '',
    wastage_percentage: '',
    reason: '',
    rates: Object.fromEntries(RATE_FIELDS.map(({ key }) => [key, ''])) as Record<
      RateKey,
      string
    >,
  };
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error !== 'object' || error === null) return fallback;
  if ('response' in error && typeof error.response === 'object' && error.response !== null) {
    const response = error.response;
    if (
      'data' in response &&
      typeof response.data === 'object' &&
      response.data !== null &&
      'message' in response.data &&
      typeof response.data.message === 'string'
    ) {
      return response.data.message;
    }
  }
  return 'message' in error && typeof error.message === 'string' ? error.message : fallback;
};

function AddGoldrate({ onCancel, onSaved }: Props) {
  const [form, setForm] = useState<RateForm>(createBlankForm);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof Omit<RateForm, 'rates'>>(field: K, value: RateForm[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const setRate = (key: RateKey, value: string) => {
    setForm(current => ({
      ...current,
      rates: { ...current.rates, [key]: value },
    }));
  };

  const saveRates = async () => {
    if (saving) return;
    if (!form.rate_date.trim() || !form.effective_from.trim()) {
      Alert.alert('Missing date', 'Enter both the rate date and effective date/time.');
      return;
    }
    if (!form.making_charge_value.trim() || Number(form.making_charge_value) < 0) {
      Alert.alert('Invalid making charge', 'Enter a valid making charge.');
      return;
    }
    if (!form.wastage_percentage.trim() || Number(form.wastage_percentage) < 0) {
      Alert.alert('Invalid wastage', 'Enter a valid wastage percentage.');
      return;
    }
    const missingRate = RATE_FIELDS.find(
      ({ key }) => !form.rates[key].trim() || !Number.isFinite(Number(form.rates[key])) ||
        Number(form.rates[key]) <= 0,
    );
    if (missingRate) {
      Alert.alert('Rate required', `Enter a positive rate for ${missingRate.label}.`);
      return;
    }
    if (!form.reason.trim()) {
      Alert.alert('Reason required', 'Enter a reason for this rate change.');
      return;
    }

    Alert.alert(
      'Activate rate set?',
      'These rates will be used for new product price calculations. Previously issued invoices will keep their saved prices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: () => {
            persistAndActivate();
          },
        },
      ],
    );
  };

  const persistAndActivate = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        making_charge_value: Number(form.making_charge_value),
        wastage_percentage: Number(form.wastage_percentage),
        rates: Object.fromEntries(
          Object.entries(form.rates).map(([key, value]) => [key, Number(value)]),
        ),
      };
      const { data: batch } = await api.post<{ id: string | number }>('/gold-rates', payload);
      if (batch?.id === undefined || batch.id === null) {
        throw new Error('The server did not return the saved rate set ID.');
      }
      await api.post(`/gold-rates/${batch.id}/activate`, { reason: form.reason.trim() });
      Alert.alert('Rates activated', 'Today’s rates have been saved and activated.', [
        { text: 'OK', onPress: onSaved },
      ]);
    } catch (error) {
      console.error('Failed to save daily gold rates:', error);
      Alert.alert('Could not save rates', getErrorMessage(error, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'mt-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900';

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="h-14 flex-row items-center border-b border-[#00382E] bg-primary px-4">
          <Pressable
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            onPress={onCancel}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Back to daily gold rates"
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
            <Text className="text-base font-extrabold tracking-wide text-white">
              Add Daily Rates
            </Text>
            <Text className="text-[10px] font-medium text-emerald-200">
              Sri Golds Jewellery
            </Text>
          </View>
        </View>

        <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 px-4 py-5"
            keyboardShouldPersistTaps="handled"
          >
            <View className="rounded-2xl border border-slate-200 bg-surface p-4">
              <Text className="mb-4 text-base font-extrabold text-slate-900">
                Schedule & charges
              </Text>
              <Text className="text-xs font-bold text-slate-700">Rate date (YYYY-MM-DD)</Text>
              <TextInput
                className={inputClass}
                value={form.rate_date}
                onChangeText={value => setField('rate_date', value)}
                placeholder="2026-11-05"
                autoCapitalize="none"
              />
              <Text className="mt-4 text-xs font-bold text-slate-700">
                Effective from (YYYY-MM-DDTHH:mm)
              </Text>
              <TextInput
                className={inputClass}
                value={form.effective_from}
                onChangeText={value => setField('effective_from', value)}
                placeholder="2026-11-05T09:00"
                autoCapitalize="none"
              />
              <Text className="mt-4 text-xs font-bold text-slate-700">Making charge type</Text>
              <View className="mt-2 flex-row gap-2">
                {(['Percentage', 'Fixed Amount'] as const).map(type => (
                  <Pressable
                    key={type}
                    className={`flex-1 items-center rounded-xl border px-3 py-3 ${
                      form.making_charge_type === type
                        ? 'border-primary bg-emerald-50'
                        : 'border-slate-200 bg-white'
                    }`}
                    onPress={() => setField('making_charge_type', type)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.making_charge_type === type }}
                  >
                    <Text className="text-xs font-bold text-slate-800">{type}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mt-4 text-xs font-bold text-slate-700">
                Making charge {form.making_charge_type === 'Percentage' ? '(%)' : '(₹)'}
              </Text>
              <TextInput
                className={inputClass}
                value={form.making_charge_value}
                onChangeText={value => setField('making_charge_value', value)}
                keyboardType="decimal-pad"
                placeholder="Enter making charge"
              />
              <Text className="mt-4 text-xs font-bold text-slate-700">Wastage percentage (%)</Text>
              <TextInput
                className={inputClass}
                value={form.wastage_percentage}
                onChangeText={value => setField('wastage_percentage', value)}
                keyboardType="decimal-pad"
                placeholder="Enter wastage percentage"
              />
            </View>

            {(['Gold', 'Silver', 'Platinum', 'Diamond'] as const).map(metal => (
              <View
                key={metal}
                className="rounded-2xl border border-slate-200 bg-surface p-4"
              >
                <Text className="mb-4 text-base font-extrabold text-slate-900">
                  {metal} rates
                </Text>
                <View className="gap-4">
                  {RATE_FIELDS.filter(field => field.metal === metal).map(field => (
                    <View key={field.key}>
                      <Text className="text-xs font-bold text-slate-700">{field.label}</Text>
                      <View className="flex-row items-center">
                        <TextInput
                          className={`${inputClass} flex-1`}
                          value={form.rates[field.key]}
                          onChangeText={value => setRate(field.key, value)}
                          keyboardType="decimal-pad"
                          placeholder="Enter rate"
                        />
                        <Text className="ml-2 text-xs font-semibold text-slate-500">
                          ₹ / {field.unit === 'carat' ? 'ct' : 'g'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View className="rounded-2xl border border-slate-200 bg-surface p-4">
              <Text className="mb-2 text-base font-extrabold text-slate-900">
                Reason for rate change
              </Text>
              <TextInput
                className={`${inputClass} min-h-24`}
                value={form.reason}
                onChangeText={value => setField('reason', value)}
                placeholder="e.g. Daily market price update"
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text className="mt-2 text-xs leading-5 text-slate-500">
                Rates apply to new price calculations; previously issued invoices keep their saved prices.
              </Text>
            </View>
          </ScrollView>

          <View className="flex-row gap-3 border-t border-slate-200 bg-surface px-4 py-4">
            <Pressable
              className="flex-1 items-center rounded-xl border border-slate-300 bg-white px-4 py-3.5"
              onPress={onCancel}
              disabled={saving}
              accessibilityRole="button"
            >
              <Text className="font-bold text-slate-700">Cancel</Text>
            </Pressable>
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5"
              onPress={saveRates}
              disabled={saving}
              accessibilityRole="button"
            >
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text className="font-bold text-white">
                {saving ? 'Saving…' : 'Save & Activate'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default AddGoldrate;