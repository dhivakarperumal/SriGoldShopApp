import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import PulseFab from '../Componets/PulseFab';
import AdminStatCard from '../Components/AdminStatCard';
import CreateCustomers, { type LoanCustomer } from './CreateCustomers';
import LoanCUstomerdetails from './LoanCUstomerdetails';

type Props = {
  onBack: () => void;
  openCreateOnMount?: boolean;
  onCreateOpened?: () => void;
};

type KycFilter = 'All' | 'Pending' | 'Verified' | 'Rejected';

const errorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Please try again.';
};

function LoanCustomerManagement({
  onBack,
  openCreateOnMount = false,
  onCreateOpened,
}: Props) {
  const [customers, setCustomers] = useState<LoanCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<KycFilter>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<LoanCustomer | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [verifyingCustomerId, setVerifyingCustomerId] = useState<string | number | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | number | null>(null);
  const [detailsCustomerId, setDetailsCustomerId] = useState<string | number | null>(null);

  const loadCustomers = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/loan-customers');
      if (!Array.isArray(data)) throw new Error('The server returned an invalid loan customer list.');
      setCustomers(data as LoanCustomer[]);
    } catch (error) {
      console.error('Failed to load loan customers:', error);
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!openCreateOnMount) return;
    setEditingCustomer(null);
    setIsFormOpen(true);
    onCreateOpened?.();
  }, [onCreateOpened, openCreateOnMount]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter(customer => {
      const matchesSearch =
        !query ||
        [
          customer.customer_code,
          customer.full_name,
          customer.mobile,
          customer.alternate_mobile,
          customer.email,
          customer.city,
          customer.district,
        ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesSearch && (kycFilter === 'All' || customer.kyc_status === kycFilter);
    });
  }, [customers, kycFilter, search]);

  const verifiedCount = customers.filter(customer => customer.kyc_status === 'Verified').length;
  const pendingCount = customers.filter(customer => customer.kyc_status === 'Pending').length;

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  const handleVerify = async (customer: LoanCustomer) => {
    setVerifyingCustomerId(customer.id);
    try {
      const { data } = await api.patch(`/loan-customers/${customer.id}/verify-kyc`);
      setCustomers(current =>
        current.map(item => (String(item.id) === String(customer.id) ? data as LoanCustomer : item)),
      );
      Alert.alert('KYC verified', `KYC verified for ${customer.full_name}.`);
    } catch (error) {
      console.error('Failed to verify loan customer KYC:', error);
      Alert.alert('Verification failed', errorMessage(error));
    } finally {
      setVerifyingCustomerId(null);
    }
  };

  const handleDelete = (customer: LoanCustomer) => {
    Alert.alert('Delete loan customer?', `Delete ${customer.full_name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/loan-customers/${customer.id}`);
            setCustomers(current => current.filter(item => String(item.id) !== String(customer.id)));
          } catch (error) {
            console.error('Failed to delete loan customer:', error);
            Alert.alert('Delete failed', errorMessage(error));
          }
        },
      },
    ]);
  };

  if (isFormOpen) {
    return (
      <CreateCustomers
        customer={editingCustomer}
        onCancel={closeForm}
        onSaved={() => {
          closeForm();
          loadCustomers(true);
        }}
      />
    );
  }

  if (detailsCustomerId !== null) {
    return (
      <LoanCUstomerdetails
        customerId={detailsCustomerId}
        onBack={() => {
          setDetailsCustomerId(null);
          loadCustomers(true);
        }}
        onEdit={customer => {
          setEditingCustomer(customer);
          setDetailsCustomerId(null);
          setIsFormOpen(true);
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="h-14 flex-row items-center bg-primary px-4">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/40"
        >
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-extrabold text-white">Loan Customers</Text>
          <Text className="text-[10px] text-emerald-100">Borrower profiles and KYC</Text>
        </View>
        <Pressable
          onPress={() => loadCustomers(true)}
          accessibilityRole="button"
          accessibilityLabel="Refresh loan customers"
          className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/40"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M20 7v5h-5M4 17v-5h5m-3-3a7 7 0 0 1 11.6-2L20 12m-16 0 2.4 5a7 7 0 0 0 11.6-2" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>
      <SafeAreaView className="flex-1" edges={['bottom', 'left', 'right']}>
        <ScrollView
          contentContainerClassName="gap-4 px-4 pb-28 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCustomers(true)} tintColor="#004D40" />}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row justify-between">
            <AdminStatCard label="Total customers" value={customers.length} icon="users" tone="green" columns={3} />
            <AdminStatCard label="KYC verified" value={verifiedCount} icon="check" tone="blue" columns={3} />
            <AdminStatCard label="KYC pending" value={pendingCount} icon="clock" tone="purple" columns={3} />
          </View>
          <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, code, mobile, city..."
              placeholderTextColor="#94A3B8"
              accessibilityLabel="Search loan customers"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {(['All', 'Pending', 'Verified', 'Rejected'] as KycFilter[]).map(status => (
                <Pressable
                  key={status}
                  onPress={() => setKycFilter(status)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: kycFilter === status }}
                  className={`rounded-full border px-3.5 py-2 ${kycFilter === status ? 'border-primary bg-primary' : 'border-slate-200 bg-white'}`}
                >
                  <Text className={`text-xs font-bold ${kycFilter === status ? 'text-white' : 'text-slate-600'}`}>{status}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {loading ? (
            <View className="items-center rounded-2xl bg-white py-12">
              <ActivityIndicator color="#004D40" />
              <Text className="mt-3 text-sm text-slate-500">Loading loan customers…</Text>
            </View>
          ) : loadError ? (
            <View className="items-center rounded-2xl border border-rose-100 bg-white px-5 py-8">
              <Text className="text-center text-sm font-semibold text-rose-700">{loadError}</Text>
              <Pressable onPress={() => loadCustomers()} accessibilityRole="button" className="mt-4 rounded-lg bg-primary px-5 py-2.5">
                <Text className="text-xs font-bold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : filteredCustomers.length === 0 ? (
            <View className="items-center rounded-2xl border border-slate-200 bg-white px-5 py-10">
              <Text className="text-sm font-bold text-slate-800">No loan customers found</Text>
              <Text className="mt-1 text-center text-xs text-slate-500">Try another search or add a borrower.</Text>
            </View>
          ) : (
            filteredCustomers.map(customer => {
              const expanded = String(expandedCustomerId) === String(customer.id);
              return (
                <View key={String(customer.id)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Pressable
                    onPress={() => setExpandedCustomerId(expanded ? null : customer.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`View loan customer ${customer.full_name}`}
                    accessibilityState={{ expanded }}
                    className="flex-row items-center p-4"
                  >
                    <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                      <Text className="text-lg font-extrabold text-primary">{customer.full_name.trim().charAt(0).toUpperCase()}</Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-extrabold text-slate-900">{customer.full_name}</Text>
                      <Text className="mt-1 text-xs text-slate-500">{customer.customer_code || 'Borrower'} · {customer.mobile}</Text>
                      <Text className="mt-1 text-[11px] text-slate-500">{[customer.city, customer.district].filter(Boolean).join(', ') || 'Location not provided'}</Text>
                    </View>
                    <Text className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${customer.kyc_status === 'Verified' ? 'bg-emerald-50 text-emerald-700' : customer.kyc_status === 'Rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      {customer.kyc_status || 'Pending'}
                    </Text>
                  </Pressable>
                  {expanded ? (
                    <View className="gap-2 border-t border-slate-100 p-4">
                      <Detail label="Alternate mobile" value={customer.alternate_mobile} />
                      <Detail label="Email" value={customer.email} />
                      <Detail label="Address" value={[customer.address, customer.city, customer.district, customer.state, customer.pincode].filter(Boolean).join(', ')} />
                      <Detail label="Guarantor" value={[customer.guarantor_name, customer.guarantor_mobile].filter(Boolean).join(' · ')} />
                      <Detail label="Occupation" value={customer.occupation} />
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        <SmallAction label="View full details" onPress={() => setDetailsCustomerId(customer.id)} />
                        {customer.kyc_status !== 'Verified' ? (
                          <SmallAction label={verifyingCustomerId === customer.id ? 'Verifying…' : 'Verify KYC'} disabled={verifyingCustomerId !== null} onPress={() => handleVerify(customer)} />
                        ) : null}
                        <SmallAction label="Edit" onPress={() => { setEditingCustomer(customer); setIsFormOpen(true); }} />
                        <SmallAction label="Delete" danger onPress={() => handleDelete(customer)} />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
        <View className="absolute bottom-4 right-5 z-20">
          <PulseFab accessibilityLabel={isFabOpen ? 'Close loan customer actions' : 'Open loan customer actions'} expanded={isFabOpen} onPress={() => setIsFabOpen(open => !open)} />
          {isFabOpen ? (
            <Pressable
              onPress={() => { setIsFabOpen(false); setEditingCustomer(null); setIsFormOpen(true); }}
              accessibilityRole="button"
              accessibilityLabel="Create loan customer"
              className="absolute bottom-[68px] right-0 flex-row items-center rounded-full border border-slate-200 bg-white py-2 pl-3 pr-2 shadow-md"
            >
              <Text className="mr-3 text-xs font-bold text-slate-800">Add customer</Text>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
                <Text className="text-xl font-bold text-white">+</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="flex-row">
      <Text className="w-28 text-xs font-semibold text-slate-500">{label}</Text>
      <Text className="flex-1 text-xs text-slate-800">{value || '—'}</Text>
    </View>
  );
}

function SmallAction({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} className={`rounded-lg px-3 py-2 ${danger ? 'bg-rose-50' : 'bg-emerald-50'} ${disabled ? 'opacity-50' : ''}`}>
      <Text className={`text-xs font-bold ${danger ? 'text-rose-700' : 'text-primary'}`}>{label}</Text>
    </Pressable>
  );
}

export default LoanCustomerManagement;