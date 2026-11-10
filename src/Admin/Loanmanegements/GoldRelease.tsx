import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import { isErrorWithCode, errorCodes, pick, types } from '@react-native-documents/picker';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';
import { createImageDataUri, encodeBase64 } from '../../utils/imageData';

type Loan = Record<string, unknown> & {
  id: string | number;
  loan_number?: string;
  gold_pledge_number?: string;
  customer_id?: string | number;
  customer_code?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_alternate_mobile?: string;
  customer_email?: string;
  customer_kyc_status?: string;
  customer_date_of_birth?: string;
  customer_gender?: string;
  customer_occupation?: string;
  customer_address?: string;
  customer_city?: string;
  customer_district?: string;
  customer_state?: string;
  customer_pincode?: string;
  guarantor_name?: string;
  guarantor_mobile?: string;
  guarantor_email?: string;
  guarantor_relationship?: string;
  guarantor_address?: string;
  jewellery_type?: string;
  metal_type?: string;
  gold_purity?: string;
  rate_unit?: string;
  gross_weight?: number | string;
  stone_weight?: number | string;
  net_gold_weight?: number | string;
  gold_valuation?: number | string;
  gold_rate_per_gram?: number | string;
  gold_rate_date?: string;
  gold_image_url?: string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  loan_date?: string;
  maturity_date?: string;
  loan_status?: string;
  release_status?: string;
  payment_frequency?: string;
  interest_type?: string;
  interest_rate?: number | string;
  interest_frequency?: string;
  interest_calculation_start_date?: string;
  day_count_convention?: string;
  compounding_frequency?: string;
  custom_period_days?: number | string;
  grace_period_days?: number | string;
  interest_free_days?: number | string;
  late_payment_interest_rate?: number | string;
  fixed_interest_amount?: number | string;
  minimum_interest_amount?: number | string;
  maximum_interest_amount?: number | string;
  processing_fee?: number | string;
  other_charges?: number | string;
  notes?: string;
};

type Release = {
  id?: string | number;
  released_to?: string;
  released_at?: string;
  confirmed_customer_signature?: boolean;
  notes?: string;
  signed_document_url?: string;
};

type Details = { loan: Loan; release?: Release | null };
type Payment = Record<string, unknown> & { id: string | number };
type Props = { onBack: () => void; completionPage?: boolean };
type StatusFilter = 'All' | 'Awaiting Gold Release' | 'Completed';
type PickedDocument = { uri: string; name: string; type: string; size?: number | null };

const getNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) =>
  `₹${getNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const dateText = (value: unknown) => {
  if (typeof value !== 'string' || !value) return '—';
  const text = value.slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const errorMessage = (error: unknown, fallback: string) => {
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
  return fallback;
};

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
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
        <Text className="text-base font-extrabold text-white">{title}</Text>
        <Text className="mt-0.5 text-[10px] font-semibold text-accent-light">{subtitle}</Text>
      </View>
    </View>
  );
}

function Info({ label, value }: { label: string; value?: unknown }) {
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <View className="min-w-[45%] flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-slate-800">{text}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-base font-extrabold text-slate-800">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-xs font-semibold text-slate-500">{label}</Text>
      <Text className={`mt-2 text-xl font-extrabold ${tone}`}>{value}</Text>
    </View>
  );
}

function GoldRelease({ onBack, completionPage = false }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [details, setDetails] = useState<Details | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [signedDocument, setSignedDocument] = useState<PickedDocument | null>(null);
  const [signatureReceived, setSignatureReceived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openingDocument, setOpeningDocument] = useState(false);
  const [goldImageSource, setGoldImageSource] = useState('');
  const [goldImageError, setGoldImageError] = useState('');

  const loadLoans = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await api.get(completionPage ? '/loans' : '/loans/gold-release');
      if (!Array.isArray(data)) throw new Error('The server returned an invalid gold release list.');
      const list = data as Loan[];
      setLoans(completionPage
        ? list.filter(loan => {
          const balance = getNumber(loan.outstanding_principal ?? loan.principal_amount);
          const completed = loan.release_status === 'Released' || loan.loan_status === 'Completed';
          const awaiting = loan.release_status === 'Pending Release' && !completed;
          return balance === 0 && (awaiting || completed);
        })
        : list);
    } catch (loadError) {
      console.error('Failed to load gold release information:', loadError);
      setError(errorMessage(loadError, 'Could not load gold release information.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [completionPage]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const loadDetails = useCallback(async (loan: Loan) => {
    setSelectedLoan(loan);
    setDetails(null);
    setPaymentHistory([]);
    setRecipient(loan.customer_name || '');
    setNotes('');
    setSignedDocument(null);
    setSignatureReceived(false);
    setError('');
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/loans/${loan.id}/gold-release`);
      const releaseData = data as Details;
      setDetails(releaseData);
      setRecipient(releaseData.release?.released_to || releaseData.loan.customer_name || '');
      setNotes(releaseData.release?.notes || '');
    } catch (loadError) {
      console.error('Failed to load gold release details:', loadError);
      setError(errorMessage(loadError, 'Could not load gold release details.'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const loanId = details?.loan.id;
    if (loanId === undefined || loanId === null) return undefined;
    let active = true;
    setHistoryLoading(true);
    api.get(`/loans/${loanId}/renewals`)
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error('The server returned an invalid payment history.');
        if (active) setPaymentHistory(data as Payment[]);
      })
      .catch(historyError => {
        console.error('Failed to load loan payment history:', historyError);
        if (active) setError(errorMessage(historyError, 'Could not load loan payment history.'));
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => { active = false; };
  }, [details?.loan.id]);

  useEffect(() => {
    const imageReference = details?.loan.gold_image_url;
    if (!imageReference) {
      setGoldImageSource('');
      setGoldImageError('');
      return undefined;
    }
    let active = true;
    setGoldImageSource('');
    setGoldImageError('');
    api.get(
      getProductImageUrl({ image_url: imageReference }) || imageReference,
      { responseType: 'arraybuffer' },
    )
      .then(({ data, headers }) => {
        if (!active) return;
        const contentType = String(headers?.['content-type'] || 'image/jpeg').split(';')[0];
        setGoldImageSource(createImageDataUri(data as ArrayBuffer, contentType));
      })
      .catch(imageError => {
        console.error('Failed to load pledged gold image:', imageError);
        if (active) setGoldImageError(errorMessage(imageError, 'Could not load pledged gold image.'));
      });
    return () => { active = false; };
  }, [details?.loan.gold_image_url]);

  const fullyPaid = details
    ? getNumber(details.loan.outstanding_principal ?? details.loan.principal_amount) === 0
    : false;
  const released = Boolean(details?.release);

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return loans.filter(loan => {
      const matchesSearch = !query || [
        loan.loan_number,
        loan.customer_name,
        loan.customer_code,
        loan.customer_mobile,
        loan.gold_pledge_number,
      ].some(value => String(value || '').toLowerCase().includes(query));
      const complete = loan.release_status === 'Released' || loan.loan_status === 'Completed';
      const currentStatus = complete ? 'Completed' : 'Awaiting Gold Release';
      return matchesSearch && (statusFilter === 'All' || statusFilter === currentStatus);
    });
  }, [loans, search, statusFilter]);

  const awaitingCount = loans.filter(
    loan => loan.release_status !== 'Released' && loan.loan_status !== 'Completed',
  ).length;
  const customerCount = new Set(
    loans.map(loan => loan.customer_id ?? loan.customer_code ?? loan.customer_name).filter(Boolean),
  ).size;

  const pickSignedDocument = async () => {
    try {
      const [file] = await pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });
      if (!file) return;
      const mimeType = file.type || '';
      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(mimeType)) {
        Alert.alert('Unsupported document', 'Choose a PDF, PNG, or JPG document.');
        return;
      }
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert('Document too large', 'The signed release document must be 10 MB or smaller.');
        return;
      }
      setSignedDocument({
        uri: file.uri,
        name: file.name || `signed-gold-release.${mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg'}`,
        type: mimeType,
        size: file.size,
      });
    } catch (pickerError) {
      if (isErrorWithCode(pickerError) && pickerError.code === errorCodes.OPERATION_CANCELED) return;
      console.error('Failed to pick signed gold release document:', pickerError);
      Alert.alert('Document selection failed', errorMessage(pickerError, 'Could not select the document.'));
    }
  };

  const recordRelease = async () => {
    if (!selectedLoan || !details || !fullyPaid || released || !signatureReceived ||
      !recipient.trim() || !signedDocument || saving) return;
    setSaving(true);
    try {
      const body = new FormData();
      body.append('released_to', recipient.trim());
      body.append('notes', notes);
      body.append('customer_signature_received', 'true');
      body.append('signed_document', {
        uri: signedDocument.uri,
        name: signedDocument.name,
        type: signedDocument.type,
      } as unknown as Blob);
      const { data } = await api.post(`/loans/${selectedLoan.id}/gold-release`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDetails(data as Details);
      await loadLoans(true);
      Alert.alert('Gold release recorded', 'The gold handover is recorded and the loan is completed.');
    } catch (releaseError) {
      console.error('Failed to record gold release:', releaseError);
      Alert.alert('Release failed', errorMessage(releaseError, 'Could not record gold release.'));
    } finally {
      setSaving(false);
    }
  };

  const openSignedDocument = async () => {
    if (!details?.release?.signed_document_url || openingDocument) return;
    setOpeningDocument(true);
    try {
      const { data, headers } = await api.get(
        `/loans/${details.loan.id}/gold-release-document`,
        { responseType: 'arraybuffer' },
      );
      const bytes = new Uint8Array(data as ArrayBuffer);
      const base64 = encodeBase64(bytes);
      const responseType = String(headers?.['content-type'] || '').split(';')[0].toLowerCase();
      const url = details.release.signed_document_url.toLowerCase();
      const mimeType = ['application/pdf', 'image/png', 'image/jpeg'].includes(responseType)
        ? responseType
        : url.endsWith('.pdf') ? 'application/pdf' : url.endsWith('.png') ? 'image/png' : 'image/jpeg';
      await Linking.openURL(`data:${mimeType};base64,${base64}`);
    } catch (documentError) {
      console.error('Failed to open signed release document:', documentError);
      Alert.alert('Document unavailable', errorMessage(documentError, 'Could not open the signed release document.'));
    } finally {
      setOpeningDocument(false);
    }
  };

  const goBack = () => {
    if (selectedLoan) {
      setSelectedLoan(null);
      setDetails(null);
      setPaymentHistory([]);
      setError('');
    } else {
      onBack();
    }
  };

  const title = completionPage ? 'Complete Loan' : 'Gold Release';
  const subtitle = completionPage ? 'Paid loans and handover records' : 'Paid loans awaiting gold handover';

  if (selectedLoan) {
    const loan = details?.loan;
    const release = details?.release;
    const unit = loan?.rate_unit === 'carat' ? 'ct' : 'g';
    const address = [
      loan?.customer_address,
      loan?.customer_city,
      loan?.customer_district,
      loan?.customer_state,
      loan?.customer_pincode,
    ].filter(Boolean).join(', ');
    const releaseStatus = released
      ? 'Completed · Gold released'
      : fullyPaid
        ? 'Paid · Awaiting gold release'
        : 'Balance due · Not eligible';

    return (
      <View className="flex-1 bg-background">
        <Header
          title={loan?.loan_number || title}
          subtitle={loan ? `${loan.customer_name || 'Customer'} · Pledge ${loan.gold_pledge_number || '—'}` : title}
          onBack={goBack}
        />
        {detailLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#004D40" />
            <Text className="mt-3 text-sm text-slate-500">Loading gold release details…</Text>
          </View>
        ) : !loan ? (
          <ScrollView contentContainerClassName="gap-3 p-4">
            <Text className="text-sm text-rose-700">{error || 'Gold release details are unavailable.'}</Text>
            <Pressable onPress={goBack} className="self-start rounded-xl bg-primary px-4 py-3">
              <Text className="text-sm font-bold text-white">Back to {title}</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 px-4 pb-8 pt-4"
            keyboardShouldPersistTaps="handled"
          >
            <View className={`rounded-2xl border p-4 ${
              released ? 'border-emerald-200 bg-emerald-50' : fullyPaid ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'
            }`}>
              <Text className="text-sm font-extrabold text-slate-900">{releaseStatus}</Text>
              <Text className="mt-1 text-xs leading-5 text-slate-600">
                Release is only available after the outstanding balance is fully paid. Record the signed receipt and verify the actual handover.
              </Text>
            </View>

            {error ? <Text className="text-xs font-medium text-rose-700">{error}</Text> : null}

            {released ? (
              <Section title="Completed loan file">
                <Info label="Released to" value={release?.released_to} />
                <Info label="Release date" value={dateText(release?.released_at)} />
                <Info label="Customer signature confirmed" value={release?.confirmed_customer_signature ? 'Yes' : 'No'} />
                <Info label="Release notes" value={release?.notes} />
                {release?.signed_document_url ? (
                  <Pressable
                    onPress={openSignedDocument}
                    disabled={openingDocument}
                    className="min-h-11 w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 disabled:opacity-50"
                    accessibilityRole="button"
                    accessibilityLabel="Open signed gold release document"
                  >
                    <Text className="text-sm font-bold text-emerald-800">
                      {openingDocument ? 'Opening document…' : 'View signed release document'}
                    </Text>
                  </Pressable>
                ) : null}
              </Section>
            ) : (
              <>
                <Section title="Verify customer, loan, and pledged jewellery">
                  <Info label="Customer ID" value={loan.customer_code || loan.customer_id} />
                  <Info label="Customer name" value={loan.customer_name} />
                  <Info label="Mobile" value={loan.customer_mobile} />
                  <Info label="Alternate mobile" value={loan.customer_alternate_mobile} />
                  <Info label="Email" value={loan.customer_email} />
                  <Info label="Date of birth" value={dateText(loan.customer_date_of_birth)} />
                  <Info label="Gender" value={loan.customer_gender} />
                  <Info label="Occupation" value={loan.customer_occupation} />
                  <Info label="KYC status" value={loan.customer_kyc_status} />
                  <Info label="Address" value={address} />
                  <Info label="Loan number" value={loan.loan_number} />
                  <Info label="Gold pledge number" value={loan.gold_pledge_number} />
                  <Info label="Jewellery" value={[loan.jewellery_type, loan.metal_type || 'Gold'].filter(Boolean).join(' · ')} />
                  <Info label="Purity" value={loan.gold_purity} />
                  <Info label="Gross weight" value={`${loan.gross_weight ?? '—'} ${unit}`} />
                  <Info label="Stone weight" value={`${loan.stone_weight || 0} ${unit}`} />
                  <Info label="Net weight" value={`${loan.net_gold_weight ?? '—'} ${unit}`} />
                  <Info label="Loan amount" value={money(loan.principal_amount)} />
                  <Info label="Outstanding balance" value={money(loan.outstanding_principal ?? loan.principal_amount)} />
                  <Info label="Loan date" value={dateText(loan.loan_date)} />
                  <Info label="Maturity date" value={dateText(loan.maturity_date)} />
                  <Info label="Interest rate" value={`${getNumber(loan.interest_rate).toFixed(2)}% per ${loan.interest_frequency || 'period'}`} />
                  <Info label="Interest type" value={loan.interest_type} />
                  <Info label="Interest start date" value={dateText(loan.interest_calculation_start_date)} />
                  <Info label="Payment frequency" value={loan.payment_frequency} />
                  <Info label="Compounding frequency" value={loan.compounding_frequency} />
                  <Info label="Grace period" value={`${loan.grace_period_days || 0} days`} />
                  <Info label="Late payment rate" value={loan.late_payment_interest_rate == null ? '—' : `${loan.late_payment_interest_rate}%`} />
                  <Info label="Processing fee" value={money(loan.processing_fee)} />
                  <Info label="Other charges" value={money(loan.other_charges)} />
                  <Info label="Guarantor" value={loan.guarantor_name} />
                  <Info label="Guarantor mobile" value={loan.guarantor_mobile} />
                  <Info label="Guarantor email" value={loan.guarantor_email} />
                  <Info label="Guarantor relationship" value={loan.guarantor_relationship} />
                  <Info label="Guarantor address" value={loan.guarantor_address} />
                  <Info label="Gold valuation" value={money(loan.gold_valuation)} />
                  <Info label="Gold rate snapshot" value={loan.gold_rate_per_gram == null ? '—' : `${money(loan.gold_rate_per_gram)} / ${unit}`} />
                  <Info label="Gold rate date" value={dateText(loan.gold_rate_date)} />
                  <Info label="Loan notes" value={loan.notes} />
                </Section>
                {loan.gold_image_url ? (
                  <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                    <Text className="text-base font-extrabold text-slate-800">Pledged gold image</Text>
                    {goldImageSource ? (
                      <Image
                        source={{ uri: goldImageSource }}
                        resizeMode="contain"
                        className="h-56 w-full rounded-xl bg-slate-50"
                        accessibilityLabel={`Pledged ${loan.jewellery_type || 'gold'}`}
                      />
                    ) : goldImageError ? (
                      <Text className="text-xs text-rose-700">{goldImageError}</Text>
                    ) : (
                      <View className="h-40 items-center justify-center">
                        <ActivityIndicator color="#004D40" />
                      </View>
                    )}
                  </View>
                ) : null}
              </>
            )}

            <Section title="Payment and renewal history">
              <Text className="w-full text-xs leading-5 text-slate-500">
                Payment allocation and balance changes recorded for this loan.
              </Text>
              {historyLoading ? (
                <View className="w-full items-center py-5"><ActivityIndicator color="#004D40" /></View>
              ) : paymentHistory.length ? (
                paymentHistory.map(payment => (
                  <View key={payment.id} className="w-full gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <View className="flex-row justify-between gap-2">
                      <Text className="text-xs font-bold text-slate-800">{dateText(payment.renewal_date)}</Text>
                      <Text className="text-xs font-extrabold text-primary">{money(payment.payment_amount)}</Text>
                    </View>
                    <Info label="Period start" value={dateText(payment.period_start_date)} />
                    <Info label="Interest accrued / paid" value={`${money(payment.accrued_interest)} / ${money(payment.interest_paid)}`} />
                    <Info label="Principal paid" value={money(payment.principal_paid)} />
                    <Info label="Balance before / after" value={`${money(payment.principal_before)} / ${money(payment.principal_after)}`} />
                    <Info label="Previous / new maturity" value={`${dateText(payment.previous_maturity_date)} / ${dateText(payment.new_maturity_date)}`} />
                  </View>
                ))
              ) : (
                <Text className="w-full py-3 text-center text-xs text-slate-500">
                  No renewal payments are recorded for this loan.
                </Text>
              )}
            </Section>

            {!released ? (
              <Section title="Confirm signed handover">
                <Text className="text-xs leading-5 text-slate-600">
                  Collect the customer signature, attach the signed release receipt, and confirm the recipient identity and physical handover.
                </Text>
                <View className="w-full gap-1.5">
                  <Text className="text-xs font-bold text-slate-700">Gold received by</Text>
                  <TextInput
                    value={recipient}
                    onChangeText={setRecipient}
                    maxLength={150}
                    editable={fullyPaid && !saving}
                    className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    accessibilityLabel="Gold received by"
                  />
                </View>
                <View className="w-full gap-1.5">
                  <Text className="text-xs font-bold text-slate-700">Release notes (optional)</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    maxLength={2000}
                    multiline
                    textAlignVertical="top"
                    editable={fullyPaid && !saving}
                    className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    accessibilityLabel="Release notes"
                  />
                </View>
                <View className="w-full gap-2">
                  <Text className="text-xs font-bold text-slate-700">Signed release document</Text>
                  <Text className="text-[10px] leading-4 text-slate-500">
                    Required to complete the loan. Accepted PDF, JPG, or PNG, up to 10 MB.
                  </Text>
                  <Pressable
                    onPress={pickSignedDocument}
                    disabled={!fullyPaid || saving}
                    className="min-h-12 flex-row items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-3 py-3 disabled:opacity-50"
                    accessibilityRole="button"
                    accessibilityLabel="Choose signed release document"
                  >
                    <Text className="text-sm font-bold text-emerald-900">
                      {signedDocument ? 'Change document' : 'Choose document'}
                    </Text>
                  </Pressable>
                  {signedDocument ? (
                    <Text className="text-xs font-medium text-emerald-700" numberOfLines={1}>
                      Selected: {signedDocument.name}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setSignatureReceived(value => !value)}
                  disabled={!fullyPaid || saving}
                  className={`w-full flex-row items-start gap-3 rounded-xl border p-3 ${
                    signatureReceived ? 'border-emerald-300 bg-emerald-50' : 'border-amber-200 bg-amber-50'
                  } disabled:opacity-50`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: signatureReceived, disabled: !fullyPaid || saving }}
                  accessibilityLabel="Confirm signed form, recipient identity, and handover verified"
                >
                  <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                    signatureReceived ? 'border-primary bg-primary' : 'border-amber-500 bg-white'
                  }`}>
                    {signatureReceived ? <Text className="text-xs font-extrabold text-white">✓</Text> : null}
                  </View>
                  <Text className="flex-1 text-xs leading-5 text-amber-950">
                    I verified the signed physical release form, recipient identity, and actual handover of the pledged gold.
                  </Text>
                </Pressable>
                {!fullyPaid ? (
                  <Text className="w-full text-xs font-semibold text-rose-600">
                    Gold release is locked until the outstanding balance is fully paid.
                  </Text>
                ) : null}
                <Pressable
                  onPress={recordRelease}
                  disabled={!fullyPaid || !signatureReceived || !recipient.trim() || !signedDocument || saving}
                  className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 disabled:opacity-50"
                  accessibilityRole="button"
                  accessibilityLabel="Confirm gold released and complete loan"
                >
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                    <Text className="text-center text-sm font-extrabold text-white">
                      Confirm Gold Released & Complete Loan
                    </Text>
                  )}
                </Pressable>
              </Section>
            ) : null}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title={title} subtitle={subtitle} onBack={onBack} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { loadLoans(true); }}
            tintColor="#004D40"
            colors={['#004D40']}
          />
        }
      >
        <View className="flex-row flex-wrap gap-3">
          <SummaryCard
            label={completionPage ? 'Completion records' : 'Eligible for release'}
            value={loading ? '—' : loans.length}
            tone="text-primary"
          />
          <SummaryCard label="Awaiting handover" value={loading ? '—' : awaitingCount} tone="text-amber-700" />
          <SummaryCard label="Customers" value={loading ? '—' : customerCount} tone="text-emerald-700" />
        </View>
        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search loan, customer, mobile, pledge..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
            accessibilityLabel="Search gold release records"
          />
          <View className="flex-row gap-2">
            {(
              completionPage
                ? ['All', 'Awaiting Gold Release', 'Completed'] as const
                : ['All', 'Awaiting Gold Release'] as const
            ).map(status => (
              <Pressable
                key={status}
                onPress={() => setStatusFilter(status)}
                className={`flex-1 items-center justify-center rounded-xl border px-2 py-2.5 ${
                  statusFilter === status ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: statusFilter === status }}
              >
                <Text className={`text-center text-[10px] font-bold ${
                  statusFilter === status ? 'text-primary' : 'text-slate-600'
                }`}>
                  {status === 'All' ? 'All Status' : status}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? (
          <View className="gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-semibold text-rose-800">{error}</Text>
            <Pressable onPress={() => { loadLoans(); }} className="items-center rounded-xl bg-primary px-4 py-3">
              <Text className="text-sm font-bold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-white py-12">
            <ActivityIndicator size="large" color="#004D40" />
            <Text className="mt-3 text-sm text-slate-500">Loading loans…</Text>
          </View>
        ) : filteredLoans.length ? (
          <View className="gap-3">
            {filteredLoans.map(loan => {
              const isCompleted = loan.release_status === 'Released' || loan.loan_status === 'Completed';
              return (
                <View key={loan.id} className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Loan number</Text>
                      <Text className="mt-1 text-base font-extrabold text-primary-dark">{loan.loan_number || `Loan #${loan.id}`}</Text>
                      <Text className="mt-1 text-sm font-semibold text-slate-800">{loan.customer_name || '—'}</Text>
                      <Text className="text-xs text-slate-500">{loan.customer_mobile || 'Mobile unavailable'}</Text>
                    </View>
                    <Text className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${
                      isCompleted ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {isCompleted ? 'Completed' : 'Awaiting Gold Release'}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <Info label="Pledge number" value={loan.gold_pledge_number} />
                    <Info label="Outstanding" value={money(loan.outstanding_principal ?? loan.principal_amount)} />
                    <Info label="Maturity" value={dateText(loan.maturity_date)} />
                    <Info label="Customer ID" value={loan.customer_code} />
                  </View>
                  <Pressable
                    onPress={() => loadDetails(loan)}
                    className="min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-3"
                    accessibilityRole="button"
                    accessibilityLabel={`View gold release record for ${loan.loan_number || loan.id}`}
                  >
                    <Text className="text-sm font-bold text-white">
                      {isCompleted ? 'View completed record' : completionPage ? 'Complete loan' : 'Prepare release'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-slate-200 bg-white px-5 py-10">
            <Text className="text-base font-bold text-slate-800">
              {loans.length
                ? 'No loans match your filters'
                : completionPage
                  ? 'No fully paid or completed loans are available'
                  : 'No fully paid loans are awaiting gold release'}
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">
              {loans.length ? 'Try another search or status.' : 'Eligible loans will appear here after full repayment.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default GoldRelease;