import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';
import { createImageDataUri } from '../../utils/imageData';

type Loan = Record<string, unknown> & {
  id: string | number;
  loan_number?: string;
  created_at?: string;
  loan_status?: string;
  release_status?: string;
  customer_id?: string | number;
  customer_code?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_kyc_status?: string;
  customer_address?: string;
  customer_city?: string;
  customer_district?: string;
  customer_state?: string;
  customer_pincode?: string;
  gold_pledge_number?: string;
  jewellery_type?: string;
  metal_type?: string;
  gold_purity?: string;
  gross_weight?: number | string;
  stone_weight?: number | string;
  net_gold_weight?: number | string;
  rate_unit?: string;
  gold_valuation?: number | string;
  gold_rate_per_gram?: number | string;
  gold_rate_date?: string;
  gold_image_url?: string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  interest_type?: string;
  interest_rate?: number | string;
  interest_frequency?: string;
  custom_period_days?: number | string;
  interest_calculation_start_date?: string;
  day_count_convention?: string;
  compounding_frequency?: string;
  grace_period_days?: number | string;
  interest_free_days?: number | string;
  late_payment_interest_rate?: number | string;
  processing_fee?: number | string;
  other_charges?: number | string;
  loan_date?: string;
  maturity_date?: string;
  payment_frequency?: string;
  fixed_interest_amount?: number | string;
  minimum_interest_amount?: number | string;
  maximum_interest_amount?: number | string;
  notes?: string;
};

type Props = {
  loanId: string | number;
  onBack: () => void;
  onOpenRenewal?: () => void;
  onOpenGoldRelease?: () => void;
};

const getNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown) =>
  `₹${getNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatRate = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—';
  const rate = Number(value);
  return Number.isFinite(rate) ? rate.toFixed(2) : '—';
};

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

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    if ('response' in error) {
      const message = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
      if (typeof message === 'string') return message;
    }
    if ('message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message) return message;
    }
  }
  return 'Could not load loan details.';
};

function Header({ onBack }: { onBack: () => void }) {
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
        <Text className="text-base font-extrabold text-white">Loan Details</Text>
        <Text className="mt-0.5 text-[10px] font-semibold text-accent-light">Loan agreement and pledged jewellery</Text>
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: unknown }) {
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <View className="min-w-[45%] flex-1 rounded-xl bg-slate-50 p-3">
      <Text className="text-[10px] font-medium text-slate-500">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-slate-800">{text}</Text>
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Text className="text-base font-extrabold text-primary-dark">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function LoanDetails({ loanId, onBack, onOpenRenewal, onOpenGoldRelease }: Props) {
  const insets = useSafeAreaInsets();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [goldImage, setGoldImage] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageLoading, setImageLoading] = useState(false);

  const loadLoan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/loans/${loanId}`);
      if (!data || typeof data !== 'object' || !('id' in data)) {
        throw new Error('The server returned invalid loan details.');
      }
      setLoan(data as Loan);
    } catch (loadError) {
      console.error('Failed to load loan details:', loadError);
      setError(getErrorMessage(loadError));
      setLoan(null);
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    loadLoan();
  }, [loadLoan]);

  useEffect(() => {
    if (!loan?.gold_image_url) {
      setGoldImage('');
      setImageError('');
      setImageLoading(false);
      return undefined;
    }
    let active = true;
    setGoldImage('');
    setImageError('');
    setImageLoading(true);
    api.get(
      getProductImageUrl({ image_url: loan.gold_image_url }) || loan.gold_image_url,
      { responseType: 'arraybuffer' },
    )
      .then(({ data, headers }) => {
        if (!active) return;
        const contentType = String(headers?.['content-type'] || 'image/jpeg').split(';')[0];
        setGoldImage(createImageDataUri(data as ArrayBuffer, contentType));
      })
      .catch(imageLoadError => {
        if (!active) return;
        const status = typeof imageLoadError === 'object' && imageLoadError !== null
          ? ('status' in imageLoadError
            ? imageLoadError.status
            : 'response' in imageLoadError
              ? (imageLoadError as { response?: { status?: number } }).response?.status
              : undefined)
          : undefined;
        setImageError(
          status === 404
            ? 'Pledged gold image is unavailable.'
            : getErrorMessage(imageLoadError),
        );
      })
      .finally(() => {
        if (active) setImageLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loan?.gold_image_url]);

  const outstanding = loan
    ? getNumber(loan.outstanding_principal ?? loan.principal_amount)
    : 0;
  const isAwaitingGoldRelease = Boolean(
    loan?.release_status === 'Pending Release' && outstanding === 0,
  );
  const displayStatus = useMemo(() => {
    if (!loan) return '';
    if (loan.release_status === 'Released') return 'Completed · Gold Released';
    if (isAwaitingGoldRelease) return 'Paid · Awaiting Gold Release';
    return loan.loan_status || 'Unknown';
  }, [isAwaitingGoldRelease, loan]);
  const unit = loan?.rate_unit === 'carat' ? 'ct' : 'g';

  return (
    <View className="flex-1 bg-background">
      <Header onBack={onBack} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#004D40" />
          <Text className="mt-3 text-sm text-slate-500">Loading loan details…</Text>
        </View>
      ) : !loan ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-center text-base font-semibold text-slate-700">
            {error || 'Loan not found.'}
          </Text>
          <Pressable
            onPress={() => { loadLoan(); }}
            className="rounded-xl bg-primary px-5 py-3"
            accessibilityRole="button"
            accessibilityLabel="Retry loading loan details"
          >
            <Text className="text-sm font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pb-8 pt-4"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-4 rounded-2xl bg-[#003B3B] p-5 shadow-sm">
            <View className="gap-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                Gold Loan
              </Text>
              <Text className="text-2xl font-extrabold text-white">{loan.loan_number || `Loan #${loan.id}`}</Text>
              <Text className="text-xs text-white/75">Created {formatDate(loan.created_at)}</Text>
            </View>
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <Text className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
                {displayStatus}
              </Text>
              {isAwaitingGoldRelease && onOpenGoldRelease ? (
                <Pressable
                  onPress={onOpenGoldRelease}
                  className="rounded-xl bg-amber-100 px-3 py-2"
                  accessibilityRole="button"
                  accessibilityLabel="Complete loan and release gold"
                >
                  <Text className="text-xs font-bold text-amber-900">Complete loan / release gold</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <DetailSection title="Customer">
            <Detail label="Customer ID" value={loan.customer_code || loan.customer_id} />
            <Detail label="Full name" value={loan.customer_name} />
            <Detail label="Mobile" value={loan.customer_mobile} />
            <Detail label="KYC status" value={loan.customer_kyc_status} />
            <Detail
              label="Address"
              value={[loan.customer_address, loan.customer_city, loan.customer_district]
                .filter(Boolean)
                .join(', ')}
            />
          </DetailSection>

          <DetailSection title="Pledged jewellery and loan amount">
            <Detail label="Gold pledge number" value={loan.gold_pledge_number} />
            <Detail label="Jewellery type" value={loan.jewellery_type} />
            <Detail label="Metal type" value={loan.metal_type || 'Gold'} />
            <Detail label={`${loan.metal_type || 'Gold'} purity / quality`} value={loan.gold_purity} />
            <Detail label="Gross weight" value={`${loan.gross_weight ?? '—'} ${unit}`} />
            <Detail label="Stone weight" value={`${loan.stone_weight ?? '—'} ${unit}`} />
            <Detail label={`Net ${loan.metal_type || 'Gold'} weight`} value={`${loan.net_gold_weight ?? '—'} ${unit}`} />
            <Detail label={`${loan.metal_type || 'Gold'} valuation`} value={formatCurrency(loan.gold_valuation)} />
            {loan.gold_rate_per_gram != null ? (
              <Detail
                label="Applied rate snapshot"
                value={`${formatCurrency(loan.gold_rate_per_gram)} / ${loan.rate_unit === 'carat' ? 'carat' : 'g'}`}
              />
            ) : null}
            {loan.gold_rate_date ? <Detail label="Rate date" value={formatDate(loan.gold_rate_date)} /> : null}
            <Detail label="Loan amount" value={formatCurrency(loan.principal_amount)} />
            <Detail label="Current principal balance" value={formatCurrency(loan.outstanding_principal ?? loan.principal_amount)} />
          </DetailSection>

          {loan.gold_image_url ? (
            <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <Text className="text-base font-extrabold text-primary-dark">Pledged gold image</Text>
              {goldImage ? (
                <Image
                  source={{ uri: goldImage }}
                  resizeMode="contain"
                  className="h-72 w-full rounded-xl border border-slate-200 bg-slate-50"
                  accessibilityLabel={`Pledged ${loan.jewellery_type || 'gold'}`}
                />
              ) : imageLoading ? (
                <View className="h-48 items-center justify-center">
                  <ActivityIndicator color="#004D40" />
                  <Text className="mt-2 text-xs text-slate-500">Loading pledged gold image…</Text>
                </View>
              ) : (
                <Text className="text-xs text-rose-700">{imageError || 'Could not load the pledged gold image.'}</Text>
              )}
            </View>
          ) : null}

          <DetailSection title="Contract terms">
            <Detail label="Interest type" value={String(loan.interest_type || '—').replaceAll('_', ' ')} />
            <Detail
              label="Interest rate"
              value={`${formatRate(loan.interest_rate)}% / ${String(loan.interest_frequency || '—').replaceAll('_', ' ')}`}
            />
            {loan.custom_period_days != null ? (
              <Detail label="Custom interest period" value={`${loan.custom_period_days} days`} />
            ) : null}
            <Detail label="Calculation start" value={formatDate(loan.interest_calculation_start_date)} />
            <Detail label="Day-count convention" value={loan.day_count_convention} />
            <Detail label="Compounding frequency" value={loan.compounding_frequency} />
            <Detail label="Grace period" value={`${loan.grace_period_days ?? '—'} days`} />
            <Detail label="Interest-free period" value={`${loan.interest_free_days ?? '—'} days`} />
            <Detail
              label="Late payment rate"
              value={loan.late_payment_interest_rate == null ? 'Not set' : `${formatRate(loan.late_payment_interest_rate)}%`}
            />
            <Detail label="Processing fee" value={formatCurrency(loan.processing_fee)} />
            <Detail label="Other charges" value={formatCurrency(loan.other_charges)} />
            <Detail label="Loan date" value={formatDate(loan.loan_date)} />
            <Detail label="Maturity date" value={formatDate(loan.maturity_date)} />
            <Detail label="Payment frequency" value={loan.payment_frequency} />
            {loan.fixed_interest_amount != null ? (
              <Detail label="Fixed interest amount" value={formatCurrency(loan.fixed_interest_amount)} />
            ) : null}
            {loan.minimum_interest_amount != null ? (
              <Detail label="Minimum interest" value={formatCurrency(loan.minimum_interest_amount)} />
            ) : null}
            {loan.maximum_interest_amount != null ? (
              <Detail label="Maximum interest" value={formatCurrency(loan.maximum_interest_amount)} />
            ) : null}
            {loan.notes ? <Detail label="Notes" value={loan.notes} /> : null}
          </DetailSection>

          {loan.release_status !== 'Released' && !isAwaitingGoldRelease && onOpenRenewal ? (
            <Pressable
              onPress={onOpenRenewal}
              className="min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3"
              accessibilityRole="button"
              accessibilityLabel="Review payment and renew loan"
            >
              <Text className="text-sm font-bold text-white">Review payment and renew loan</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

export default LoanDetails;