import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import api, { API_BASE_URL } from '../../api';
import type { LoanCustomer } from './CreateCustomers';

type CustomerDocument = {
  id: string | number;
  document_type: string;
  document_side?: string;
  original_name: string;
  file_ref: string;
  file_size?: number | string;
};

type CustomerLoan = {
  id: string | number;
  loan_number?: string;
  gold_pledge_number?: string;
  principal_amount?: number | string;
  maturity_date?: string;
  loan_status?: string;
};

type Props = {
  customerId: string | number;
  onBack: () => void;
  onEdit: (customer: LoanCustomer) => void;
};

const DOCUMENT_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  voter_id: 'Voter ID Card',
  driving_license: 'Driving Licence',
  passport: 'Passport',
  ration_card: 'Ration Card',
  other: 'Other Government-Issued ID',
};

const formatDate = (value?: string, includeTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? '—'
    : date.toLocaleString(
        'en-IN',
        includeTime
          ? { dateStyle: 'medium', timeStyle: 'short' }
          : { dateStyle: 'medium' },
      );
};

const formatCurrency = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Could not load customer details.';
};

const getPrivateUrl = (reference: string) => {
  if (/^https?:\/\//i.test(reference)) return reference;
  const serverUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${serverUrl}/${reference.replace(/^\/+/, '')}`;
};

const encodeBase64 = (bytes: Uint8Array) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += alphabet[Math.floor(first / 4)];
    encoded += alphabet[(first % 4) * 16 + Math.floor((second ?? 0) / 16)];
    encoded += second === undefined
      ? '=='
      : `${alphabet[(second % 16) * 4 + Math.floor((third ?? 0) / 64)]}${third === undefined ? '=' : alphabet[third % 64]}`;
  }
  return encoded;
};

function LoanCUstomerdetails({ customerId, onBack, onEdit }: Props) {
  const [customer, setCustomer] = useState<LoanCustomer | null>(null);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [loans, setLoans] = useState<CustomerLoan[]>([]);
  const [photoToken, setPhotoToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingDocumentId, setOpeningDocumentId] = useState<string | number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/loan-customers/${customerId}`),
      api.get(`/loan-customers/${customerId}/documents`),
      api.get(`/customers/${customerId}/loans`),
      AsyncStorage.getItem('userToken'),
    ])
      .then(([customerResponse, documentsResponse, loansResponse, token]) => {
        if (!Array.isArray(documentsResponse.data) || !Array.isArray(loansResponse.data)) {
          throw new Error('The server returned invalid customer documents or loan history.');
        }
        if (!active) return;
        setCustomer(customerResponse.data as LoanCustomer);
        setDocuments(documentsResponse.data as CustomerDocument[]);
        setLoans(loansResponse.data as CustomerLoan[]);
        setPhotoToken(token || '');
      })
      .catch(loadError => {
        console.error('Failed to load loan customer details:', loadError);
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  const openDocument = async (document: CustomerDocument) => {
    setOpeningDocumentId(document.id);
    try {
      const { data } = await api.get(document.file_ref, { responseType: 'arraybuffer' });
      const bytes = new Uint8Array(data as ArrayBuffer);
      const base64 = encodeBase64(bytes);
      const fileName = document.original_name.toLowerCase();
      const contentType = fileName.endsWith('.pdf')
        ? 'application/pdf'
        : fileName.endsWith('.png')
          ? 'image/png'
          : 'image/jpeg';
      await Linking.openURL(`data:${contentType};base64,${base64}`);
    } catch (openError) {
      console.error('Failed to open loan customer KYC document:', openError);
      Alert.alert('Document unavailable', getErrorMessage(openError));
    } finally {
      setOpeningDocumentId(null);
    }
  };

  if (loading) {
    return (
      <ScreenShell onBack={onBack} title="Customer Details">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#004D40" />
          <Text className="mt-3 text-sm text-slate-500">Loading customer details…</Text>
        </View>
      </ScreenShell>
    );
  }

  if (error || !customer) {
    return (
      <ScreenShell onBack={onBack} title="Customer Details">
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-center text-sm text-rose-700">
            {error || 'Customer not found.'}
          </Text>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            className="mt-4 rounded-xl bg-primary px-5 py-3"
          >
            <Text className="text-sm font-bold text-white">Back to customers</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const activeLoans = loans.filter(loan => loan.loan_status?.toLowerCase() === 'active');
  const address = [
    customer.address,
    customer.city,
    customer.district,
    customer.state,
    customer.pincode,
  ]
    .filter(Boolean)
    .join(', ');
  const metadataCustomer = customer as LoanCustomer & {
    created_at?: string;
    updated_at?: string;
  };

  return (
    <ScreenShell onBack={onBack} title="Customer Details">
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <View className="rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center">
            {customer.photo_url ? (
              <Image
                source={{
                  uri: getPrivateUrl(customer.photo_url),
                  headers: photoToken ? { Authorization: `Bearer ${photoToken}` } : undefined,
                }}
                className="h-16 w-16 rounded-full bg-slate-100"
                resizeMode="cover"
              />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <Text className="text-2xl font-extrabold text-primary">
                  {customer.full_name.trim().charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View className="ml-3 min-w-0 flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Customer profile
              </Text>
              <Text className="mt-1 text-lg font-extrabold text-slate-900">
                {customer.full_name}
              </Text>
              <Text className="mt-1 text-[11px] text-slate-500">
                Code: {customer.customer_code || '—'} · ID: {customer.id}
              </Text>
            </View>
          </View>
          <View className="mt-4 flex-row items-center justify-between">
            <KycBadge status={customer.kyc_status || 'Pending'} />
            <Pressable
              onPress={() => onEdit(customer)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${customer.full_name}`}
              className="flex-row items-center rounded-xl bg-primary px-3.5 py-2.5"
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text className="ml-2 text-xs font-bold text-white">Edit</Text>
            </Pressable>
          </View>
        </View>

        <DetailSection title="Personal & contact details">
          <Detail label="Full name" value={customer.full_name} />
          <Detail label="Customer type" value={customer.customer_type} />
          <Detail label="Primary mobile" value={customer.mobile} />
          <Detail label="Alternate mobile" value={customer.alternate_mobile} />
          <Detail label="Email" value={customer.email} />
          <Detail label="Date of birth" value={formatDate(customer.date_of_birth)} />
          <Detail label="Gender" value={customer.gender} />
          <Detail label="Occupation" value={customer.occupation} />
          <Detail label="KYC status" value={customer.kyc_status} />
          <Detail label="Residential address" value={address || 'Address not provided'} />
          <Detail label="Internal notes" value={customer.notes} />
          <Detail label="Customer since" value={formatDate(metadataCustomer.created_at, true)} />
          <Detail label="Last updated" value={formatDate(metadataCustomer.updated_at, true)} />
        </DetailSection>

        <DetailSection title="Guarantor / surety details">
          <Detail label="Guarantor name" value={customer.guarantor_name} />
          <Detail label="Guarantor mobile" value={customer.guarantor_mobile} />
          <Detail label="Guarantor email" value={customer.guarantor_email} />
          <Detail label="Relationship" value={customer.guarantor_relationship} />
          <Detail label="Guarantor address" value={customer.guarantor_address} />
        </DetailSection>

        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="text-sm font-extrabold text-slate-900">
            KYC documents ({documents.length})
          </Text>
          {documents.length === 0 ? (
            <Text className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              No KYC documents uploaded.
            </Text>
          ) : (
            documents.map(document => (
              <View
                key={String(document.id)}
                className="flex-row items-center justify-between rounded-xl border border-slate-100 p-3"
              >
                <View className="mr-3 min-w-0 flex-1">
                  <Text className="text-xs font-bold text-slate-800">
                    {DOCUMENT_LABELS[document.document_type] || document.document_type} ·{' '}
                    {document.document_side || 'front'}
                  </Text>
                  <Text className="mt-1 text-[11px] text-slate-500" numberOfLines={1}>
                    {document.original_name}
                  </Text>
                  {document.file_size ? (
                    <Text className="mt-1 text-[10px] text-slate-400">
                      {(Number(document.file_size) / (1024 * 1024)).toFixed(2)} MB
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => openDocument(document)}
                  disabled={openingDocumentId === document.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${document.original_name}`}
                  className="rounded-lg bg-emerald-50 px-3 py-2"
                >
                  <Text className="text-xs font-bold text-primary">
                    {openingDocumentId === document.id ? 'Opening…' : 'Open'}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="text-sm font-extrabold text-slate-900">Loan history</Text>
          <Text className="text-xs text-slate-500">
            {activeLoans.length} active loan{activeLoans.length === 1 ? '' : 's'} · {loans.length} total
          </Text>
          {loans.length === 0 ? (
            <Text className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              No loans found for this customer.
            </Text>
          ) : (
            loans.map(loan => (
              <View key={String(loan.id)} className="gap-1.5 rounded-xl border border-slate-100 p-3">
                <Text className="text-sm font-bold text-primary">
                  {loan.loan_number || `Loan ${loan.id}`}
                </Text>
                <Detail label="Pledge number" value={loan.gold_pledge_number} />
                <Detail label="Principal" value={formatCurrency(loan.principal_amount)} />
                <Detail label="Maturity" value={formatDate(loan.maturity_date)} />
                <View className="flex-row items-center justify-between">
                  <Text className="text-[10px] font-semibold uppercase text-slate-500">Status</Text>
                  <Text className="text-xs font-bold text-slate-800">{loan.loan_status || '—'}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function ScreenShell({
  onBack,
  title,
  children,
}: {
  onBack: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-1 bg-background">
      <View className="h-14 flex-row items-center bg-primary px-4">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to loan customers"
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/40"
        >
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <Text className="text-base font-extrabold text-white">{title}</Text>
      </View>
      <SafeAreaView className="flex-1" edges={['bottom', 'left', 'right']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2.5 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="mb-1 text-sm font-extrabold text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <Text className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</Text>
      <Text className="mt-1 text-xs font-semibold text-slate-800">{value || '—'}</Text>
    </View>
  );
}

function KycBadge({ status }: { status: string }) {
  const color =
    status === 'Verified'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'Rejected'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-amber-50 text-amber-700';
  return (
    <Text className={`rounded-full px-3 py-1.5 text-xs font-bold ${color}`}>
      KYC {status}
    </Text>
  );
}

export default LoanCUstomerdetails;