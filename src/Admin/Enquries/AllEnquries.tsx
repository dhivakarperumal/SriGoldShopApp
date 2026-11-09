import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import AddEnquries, { type EnquiryRecord } from './AddEnquries';
import AdminStatCard from '../Components/AdminStatCard';

type Props = {
  onBack: () => void;
};

type EnquiryResponse = {
  enquiries?: unknown;
  stats?: {
    total?: unknown;
    pending?: unknown;
    responded?: unknown;
    closed?: unknown;
  };
  pagination?: {
    page?: unknown;
    limit?: unknown;
    total?: unknown;
    totalPages?: unknown;
  };
};

type EnquiryStatus = 'All' | 'New Enquiry' | 'In Progress' | 'Quotation Sent' | 'Converted' | 'Closed' | 'Not Interested';

type PageStats = {
  total: number;
  pending: number;
  responded: number;
  closed: number;
};

const STATUSES: EnquiryStatus[] = [
  'All',
  'New Enquiry',
  'In Progress',
  'Quotation Sent',
  'Converted',
  'Closed',
  'Not Interested',
];

const getErrorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

const asCount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeEnquiries = (value: unknown): EnquiryRecord[] => {
  if (!Array.isArray(value)) {
    throw new Error('The server returned an invalid enquiry list.');
  }
  return value.flatMap(record => {
    if (typeof record !== 'object' || record === null) return [];
    const item = record as Record<string, unknown>;
    const id = item.id ?? item.enquiry_id;
    if (typeof id !== 'string' && typeof id !== 'number') return [];
    return [{
      ...item,
      id,
      customer_name:
        typeof item.customer_name === 'string' && item.customer_name.trim()
          ? item.customer_name
          : 'Customer',
      phone: typeof item.phone === 'string' ? item.phone : '',
      status: typeof item.status === 'string' ? item.status : 'New Enquiry',
    } as EnquiryRecord];
  });
};

const formatDate = (value?: string) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const getStatusStyle = (status?: string) => {
  switch (status) {
    case 'In Progress':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'Quotation Sent':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'Converted':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'Closed':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'Not Interested':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-800';
  }
};

function AllEnquries({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [stats, setStats] = useState<PageStats>({ total: 0, pending: 0, responded: 0, closed: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryRecord | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRecord | null>(null);
  const [statusEnquiry, setStatusEnquiry] = useState<EnquiryRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const addButtonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(addButtonPulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(addButtonPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [addButtonPulse]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchEnquiries = useCallback(async (refresh = false) => {
    setLoadError('');
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const { data } = await api.get<EnquiryResponse>('/enquiries/admin/all', {
        params: {
          page,
          limit: 8,
          search: debouncedSearch,
          status: statusFilter === 'All' ? '' : statusFilter,
        },
      });
      if (!data || !Array.isArray(data.enquiries)) {
        throw new Error('The server returned an invalid enquiry response.');
      }
      setEnquiries(normalizeEnquiries(data.enquiries));
      setStats({
        total: asCount(data.stats?.total),
        pending: asCount(data.stats?.pending),
        responded: asCount(data.stats?.responded),
        closed: asCount(data.stats?.closed),
      });
      setTotalCount(asCount(data.pagination?.total));
      setTotalPages(Math.max(1, asCount(data.pagination?.totalPages)));
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      setLoadError(getErrorMessage(error, 'Unable to load enquiries.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const visibleStatuses = useMemo(() => STATUSES, []);

  const updateStatus = async (enquiry: EnquiryRecord, status: EnquiryStatus) => {
    if (status === 'All' || isUpdating) return;
    setIsUpdating(true);
    try {
      await api.put(`/enquiries/admin/${enquiry.id}/status`, { status });
      setStatusEnquiry(null);
      if (selectedEnquiry?.id === enquiry.id) {
        setSelectedEnquiry(current => (current ? { ...current, status } : null));
      }
      await fetchEnquiries(true);
    } catch (error) {
      Alert.alert('Status update failed', getErrorMessage(error, 'Unable to update enquiry.'));
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteEnquiry = (enquiry: EnquiryRecord) => {
    Alert.alert(
      'Delete enquiry?',
      `Delete enquiry #ENQ${String(enquiry.id).padStart(3, '0')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const remove = async () => {
              try {
                await api.delete(`/enquiries/admin/${enquiry.id}`);
                setSelectedEnquiry(null);
                await fetchEnquiries(true);
              } catch (error) {
                Alert.alert('Delete failed', getErrorMessage(error, 'Unable to delete enquiry.'));
              }
            };
            remove();
          },
        },
      ],
    );
  };

  const openAddForm = () => {
    setEditingEnquiry(null);
    setIsFormOpen(true);
  };

  const openEditForm = (enquiry: EnquiryRecord) => {
    setSelectedEnquiry(null);
    setEditingEnquiry(enquiry);
    setIsFormOpen(true);
  };

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
        >
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-extrabold text-white">Gold Enquiries</Text>
          <Text className="text-[10px] text-emerald-200">Manage customer follow-ups</Text>
        </View>
      </View>

      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-24 pt-4"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchEnquiries(true)}
              tintColor="#004D40"
            />
          }
        >
          <View className="mb-1 flex-row flex-wrap justify-between">
            <AdminStatCard label="Total" value={stats.total} icon="message" tone="green" />
            <AdminStatCard label="Pending" value={stats.pending} icon="clock" tone="blue" />
            <AdminStatCard label="Responded" value={stats.responded} icon="check" tone="purple" />
            <AdminStatCard label="Closed" value={stats.closed} icon="list" tone="wine" />
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, phone, email or product"
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search enquiries"
            className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {visibleStatuses.map(status => (
                <Pressable
                  key={status}
                  onPress={() => {
                    setPage(1);
                    setStatusFilter(status);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: statusFilter === status }}
                  className={`rounded-full border px-3 py-2 ${
                    statusFilter === status
                      ? 'border-primary bg-primary'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      statusFilter === status ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {status === 'All' ? 'All statuses' : status}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#004D40" />
              <Text className="mt-3 text-sm text-slate-500">Loading enquiries…</Text>
            </View>
          ) : loadError ? (
            <View className="items-center rounded-2xl border border-rose-100 bg-white px-5 py-8">
              <Text className="text-center text-sm font-semibold text-rose-700">{loadError}</Text>
              <Pressable
                onPress={() => fetchEnquiries()}
                className="mt-4 rounded-lg bg-primary px-4 py-2"
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : enquiries.length ? (
            enquiries.map(enquiry => (
              <EnquiryCard
                key={enquiry.id}
                enquiry={enquiry}
                onView={() => setSelectedEnquiry(enquiry)}
                onEdit={() => openEditForm(enquiry)}
                onDelete={() => deleteEnquiry(enquiry)}
                onChangeStatus={() => setStatusEnquiry(enquiry)}
              />
            ))
          ) : (
            <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10">
              <Text className="text-base font-bold text-slate-800">No enquiries found</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                Try another search or add a new enquiry.
              </Text>
            </View>
          )}

          {!isLoading && !loadError && totalPages > 1 ? (
            <View className="mt-2 flex-row items-center justify-between rounded-xl bg-white px-3 py-3">
              <Text className="text-[10px] text-slate-500">
                {totalCount ? (page - 1) * 8 + 1 : 0}–{Math.min(page * 8, totalCount)} of {totalCount}
              </Text>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => setPage(current => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  accessibilityRole="button"
                  accessibilityLabel="Previous enquiries page"
                  className="h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  <Text className="text-lg text-slate-700">‹</Text>
                </Pressable>
                <Text className="text-xs font-bold text-slate-600">
                  {page} / {totalPages}
                </Text>
                <Pressable
                  onPress={() => setPage(current => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  accessibilityRole="button"
                  accessibilityLabel="Next enquiries page"
                  className="h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  <Text className="text-lg text-slate-700">›</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <View className="absolute bottom-5 right-5 items-end">
        <View className="h-14 w-14 items-center justify-center">
          <Animated.View
            pointerEvents="none"
            className="absolute h-14 w-14 rounded-full bg-accent"
            style={{
              opacity: addButtonPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 0],
              }),
              transform: [
                {
                  scale: addButtonPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.22],
                  }),
                },
              ],
            }}
          />
          <Pressable
            onPress={openAddForm}
            className="h-14 w-14 items-center justify-center rounded-full border-2 border-accent-light bg-primary shadow-lg"
            accessibilityRole="button"
            accessibilityLabel="Add enquiry"
          >
            <Text className="text-2xl font-bold text-white">+</Text>
          </Pressable>
        </View>
      </View>

      {isFormOpen ? (
        <AddEnquries
          enquiry={editingEnquiry}
          onClose={() => {
            setIsFormOpen(false);
            setEditingEnquiry(null);
          }}
          onSaved={() => {
            setIsFormOpen(false);
            setEditingEnquiry(null);
            fetchEnquiries(true);
          }}
        />
      ) : null}

      <Modal
        visible={statusEnquiry !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusEnquiry(null)}
      >
        <Pressable
          onPress={() => setStatusEnquiry(null)}
          accessibilityRole="button"
          accessibilityLabel="Close status options"
          className="flex-1 justify-end bg-black/50"
        >
          <View
            className="rounded-t-3xl bg-white px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Text className="mb-3 text-lg font-extrabold text-slate-900">Update enquiry status</Text>
            {STATUSES.filter(status => status !== 'All').map(status => (
              <Pressable
                key={status}
                disabled={isUpdating}
                onPress={() => {
                  if (statusEnquiry) updateStatus(statusEnquiry, status);
                }}
                accessibilityRole="button"
                className={`mb-2 rounded-xl px-4 py-3 ${
                  statusEnquiry?.status === status ? 'bg-emerald-50' : 'bg-slate-50'
                }`}
              >
                <Text className="text-sm font-semibold text-slate-700">{status}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={selectedEnquiry !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEnquiry(null)}
      >
        <Pressable
          onPress={() => setSelectedEnquiry(null)}
          accessibilityRole="button"
          accessibilityLabel="Close enquiry details"
          className="flex-1 justify-center bg-black/50 px-4"
        >
          <View className="rounded-2xl bg-white p-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase text-primary">
                  #{`ENQ${String(selectedEnquiry?.id ?? '').padStart(3, '0')}`}
                </Text>
                <Text className="mt-1 text-lg font-extrabold text-slate-900">
                  {selectedEnquiry?.customer_name}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedEnquiry(null)}
                accessibilityRole="button"
                accessibilityLabel="Close details"
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <Text className="text-lg font-bold text-slate-600">×</Text>
              </Pressable>
            </View>
            <ScrollView className="mt-4 max-h-[60%]">
              <Detail label="Phone" value={selectedEnquiry?.phone} />
              <Detail label="Email" value={selectedEnquiry?.email} />
              <Detail
                label="Product"
                value={
                  selectedEnquiry?.product_name ||
                  selectedEnquiry?.product_category ||
                  selectedEnquiry?.enquiry_type
                }
              />
              <Detail label="Metal and purity" value={`${selectedEnquiry?.metal_type || ''} ${selectedEnquiry?.purity || ''}`} />
              <Detail label="Quantity" value={selectedEnquiry?.quantity} />
              <Detail label="Weight" value={selectedEnquiry?.weight ? `${selectedEnquiry.weight} g` : ''} />
              <Detail label="Budget" value={selectedEnquiry?.approx_budget ? `₹${selectedEnquiry.approx_budget}` : ''} />
              <Detail label="Follow-up" value={`${selectedEnquiry?.follow_up_date || 'Not scheduled'} ${selectedEnquiry?.follow_up_time || ''}`} />
              <Detail label="Address" value={[selectedEnquiry?.address, selectedEnquiry?.city, selectedEnquiry?.state, selectedEnquiry?.pincode].filter(Boolean).join(', ')} />
              <Detail label="Message" value={selectedEnquiry?.message} />
              <Detail label="Created" value={formatDate(selectedEnquiry?.created_at)} />
            </ScrollView>
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                onPress={() => selectedEnquiry && openEditForm(selectedEnquiry)}
                accessibilityRole="button"
                className="rounded-lg bg-primary px-4 py-2.5"
              >
                <Text className="text-xs font-bold text-white">Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => selectedEnquiry && deleteEnquiry(selectedEnquiry)}
                accessibilityRole="button"
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5"
              >
                <Text className="text-xs font-bold text-rose-700">Delete</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function EnquiryCard({
  enquiry,
  onView,
  onEdit,
  onDelete,
  onChangeStatus,
}: {
  enquiry: EnquiryRecord;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: () => void;
}) {
  const productName =
    enquiry.product_name || enquiry.product_category || enquiry.enquiry_type || 'Product inquiry';
  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            {enquiry.customer_name}
          </Text>
          <Text className="mt-1 text-xs text-slate-500" numberOfLines={1}>
            {enquiry.phone || 'No phone number'}{enquiry.email ? ` · ${enquiry.email}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={onChangeStatus}
          accessibilityRole="button"
          accessibilityLabel={`Change status for enquiry ${enquiry.id}`}
          className={`max-w-[45%] rounded-full border px-2.5 py-1 ${getStatusStyle(enquiry.status)}`}
        >
          <Text className="text-[9px] font-bold" numberOfLines={1}>
            {enquiry.status || 'New Enquiry'} ▼
          </Text>
        </Pressable>
      </View>
      <View className="mt-3 flex-row items-center rounded-xl bg-slate-50 p-3">
        <View className="mr-2 h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
              stroke="#A66B00"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>{productName}</Text>
          <Text className="mt-0.5 text-[10px] text-slate-500" numberOfLines={1}>
            {[enquiry.metal_type, enquiry.purity].filter(Boolean).join(' · ') || 'Details not specified'}
          </Text>
        </View>
      </View>
      <Text className="mt-3 text-[10px] text-slate-500">{formatDate(enquiry.created_at)}</Text>
      {enquiry.message ? (
        <Text className="mt-2 text-xs leading-5 text-slate-600" numberOfLines={2}>
          {enquiry.message}
        </Text>
      ) : null}
      <View className="mt-3 flex-row justify-end gap-2 border-t border-slate-100 pt-3">
        <ActionButton label="View" onPress={onView} color="slate" />
        <ActionButton label="Edit" onPress={onEdit} color="teal" />
        <ActionButton label="Delete" onPress={onDelete} color="rose" />
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: 'slate' | 'teal' | 'rose';
}) {
  const style =
    color === 'teal'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
      : color === 'rose'
        ? 'border-rose-100 bg-rose-50 text-rose-700'
        : 'border-slate-200 bg-slate-50 text-slate-700';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} enquiry`}
      className={`rounded-lg border px-3 py-2 ${style}`}
    >
      <Text className="text-[10px] font-bold">{label}</Text>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View className="mb-3">
      <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="mt-0.5 text-sm text-slate-700">{String(value)}</Text>
    </View>
  );
}

export default AllEnquries;