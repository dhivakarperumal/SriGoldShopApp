import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import PulseFab from '../Componets/PulseFab';

type Customer = {
  id: string | number;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
};

type CustomerForm = {
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
};

type Props = {
  onBack: () => void;
  openCreateOnMount?: boolean;
  onCreateOpened?: () => void;
};

type StatusFilter = 'All' | 'Active' | 'Inactive';
type ApiResponse = { users?: unknown; data?: unknown };

const PAGE_SIZE = 8;
const ROLES = ['user', 'manager', 'dealer', 'admin'];
const EMPTY_FORM: CustomerForm = {
  username: '',
  name: '',
  email: '',
  phone: '',
  role: 'user',
  password: '',
};

const getString = (value: unknown) => (typeof value === 'string' ? value : '');

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null) return fallback;
  if ('response' in error && typeof error.response === 'object' && error.response !== null) {
    const response = error.response;
    if ('data' in response && typeof response.data === 'object' && response.data !== null) {
      const data = response.data;
      if ('message' in data && typeof data.message === 'string') return data.message;
    }
  }
  return 'message' in error && typeof error.message === 'string' ? error.message : fallback;
};

const normalizeCustomers = (data: unknown): Customer[] => {
  let records: unknown[] | null = Array.isArray(data) ? data : null;
  if (!records && typeof data === 'object' && data !== null) {
    const response = data as ApiResponse;
    if (Array.isArray(response.users)) records = response.users;
    else if (Array.isArray(response.data)) records = response.data;
  }
  if (!records) throw new Error('The server returned an invalid customer list.');

  return records.flatMap(record => {
    if (typeof record !== 'object' || record === null) return [];
    const item = record as Record<string, unknown>;
    const id = item.id ?? item.user_id;
    if (typeof id !== 'string' && typeof id !== 'number') return [];
    const name = getString(item.name) || getString(item.username) || 'Customer';
    const status =
      getString(item.status).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
    return [{
      id,
      username: getString(item.username) || name,
      name,
      email: getString(item.email),
      phone: getString(item.phone),
      role: getString(item.role).toLowerCase() || 'user',
      status,
      created_at: getString(item.created_at) || undefined,
    }];
  });
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'C';

const formatDate = (value?: string, long = false) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: long ? 'long' : 'short',
    year: 'numeric',
  });
};

function Customer({ onBack, openCreateOnMount = false, onCreateOpened }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = useCallback(async (refresh = false) => {
    setLoadError('');
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setCustomers(normalizeCustomers(data));
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setLoadError(getErrorMessage(error, 'Could not load customers.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    setSelectedCustomerId(currentId =>
      customers.some(customer => String(customer.id) === String(currentId))
        ? currentId
        : customers[0]?.id ?? null,
    );
  }, [customers]);

  const todayCount = customers.filter(customer => {
    if (!customer.created_at) return false;
    return new Date(customer.created_at).toDateString() === new Date().toDateString();
  }).length;
  const activeCount = customers.filter(customer => customer.status === 'Active').length;
  const inactiveCount = customers.length - activeCount;

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter(customer => {
      const matchesSearch =
        !query ||
        [customer.name, customer.email, customer.phone, customer.id].some(value =>
          String(value).toLowerCase().includes(query),
        );
      const matchesStatus = statusFilter === 'All' || customer.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleCustomers = filteredCustomers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedCustomer =
    customers.find(customer => String(customer.id) === String(selectedCustomerId)) ?? null;

  const openAddForm = useCallback(() => {
    setEditingCustomer(null);
    setForm({ ...EMPTY_FORM });
    setIsFormOpen(true);
  }, []);

  useEffect(() => {
    if (!openCreateOnMount) return;
    openAddForm();
    onCreateOpened?.();
  }, [onCreateOpened, openAddForm, openCreateOnMount]);

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      username: customer.username || customer.name,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      role: customer.role,
      password: '',
    });
    setIsFormOpen(true);
  };

  const saveCustomer = async () => {
    if (isSaving) return;
    if (!form.username.trim() || !form.email.trim() || (!editingCustomer && !form.password)) {
      Alert.alert('Required fields', 'Enter a username, email, and password for new customers.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        ...form,
        username: form.username.trim(),
        name: form.name.trim() || form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role.toLowerCase(),
      };
      if (editingCustomer) {
        delete payload.password;
        await api.put(`/auth/users/${editingCustomer.id}`, payload);
      } else {
        await api.post('/auth/users', payload);
      }
      setIsFormOpen(false);
      await fetchCustomers(true);
      Alert.alert(
        'Customer saved',
        editingCustomer ? 'Customer updated successfully.' : 'Customer added successfully.',
      );
    } catch (error) {
      console.error('Failed to save customer:', error);
      Alert.alert('Save failed', getErrorMessage(error, 'Could not save this customer.'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustomer = (customer: Customer) => {
    Alert.alert(
      'Delete customer?',
      `Delete ${customer.name} from the customer list? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/auth/users/${customer.id}`);
              setSelectedCustomerId(currentId =>
                String(currentId) === String(customer.id) ? null : currentId,
              );
              await fetchCustomers(true);
            } catch (error) {
              console.error('Failed to delete customer:', error);
              Alert.alert('Delete failed', getErrorMessage(error, 'Could not delete this customer.'));
            }
          },
        },
      ],
    );
  };

  if (isFormOpen) {
    return (
      <View className="flex-1 bg-primary">
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="h-14 flex-row items-center bg-primary px-4">
            <Pressable
              className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
              onPress={() => setIsFormOpen(false)}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Back to customers"
            >
              <Text className="text-xl font-bold text-white">‹</Text>
            </Pressable>
            <View className="flex-1">
              <Text className="text-base font-extrabold tracking-wide text-white">
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </Text>
              <Text className="text-[10px] font-medium text-emerald-200">
                Sri Golds Jewellery
              </Text>
            </View>
          </View>

          <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
            <ScrollView
              className="flex-1"
              contentContainerClassName="gap-4 px-4 pb-4 pt-2"
              keyboardShouldPersistTaps="handled"
            >
              <CustomerInput
                label="Username *"
                value={form.username}
                onChangeText={value => setForm(current => ({ ...current, username: value }))}
                autoCapitalize="none"
              />
              <CustomerInput
                label="Full name"
                value={form.name}
                onChangeText={value => setForm(current => ({ ...current, name: value }))}
              />
              <CustomerInput
                label="Email address *"
                value={form.email}
                onChangeText={value => setForm(current => ({ ...current, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <CustomerInput
                label="Phone number"
                value={form.phone}
                onChangeText={value => setForm(current => ({ ...current, phone: value }))}
                keyboardType="phone-pad"
              />
              {!editingCustomer ? (
                <CustomerInput
                  label="Password *"
                  value={form.password}
                  onChangeText={value => setForm(current => ({ ...current, password: value }))}
                  secureTextEntry
                  autoCapitalize="none"
                />
              ) : null}
              <View className="gap-2">
                <Text className="text-xs font-bold text-slate-700">Role</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ROLES.map(role => (
                    <Pressable
                      key={role}
                      className={`rounded-full border px-4 py-2.5 ${
                        form.role === role
                          ? 'border-primary bg-primary'
                          : 'border-slate-200 bg-white'
                      }`}
                      onPress={() => setForm(current => ({ ...current, role }))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: form.role === role }}
                    >
                      <Text
                        className={`text-xs font-bold capitalize ${
                          form.role === role ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {role === 'user' ? 'Customer' : role}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-3 border-t border-slate-200 bg-surface px-4 py-4">
              <Pressable
                className="flex-1 items-center rounded-xl border border-slate-300 bg-white px-4 py-3.5"
                onPress={() => setIsFormOpen(false)}
                disabled={isSaving}
                accessibilityRole="button"
              >
                <Text className="font-bold text-slate-700">Cancel</Text>
              </Pressable>
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5"
                onPress={saveCustomer}
                disabled={isSaving}
                accessibilityRole="button"
              >
                {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <Text className="font-bold text-white">
                  {isSaving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer'}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
        <Pressable
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-extrabold tracking-wide text-white">Customers</Text>
          <Text className="text-[10px] font-medium text-emerald-200">Sri Golds Jewellery</Text>
        </View>
      </View>

      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pb-24 pt-4"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchCustomers(true)}
              tintColor="#004D40"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row gap-2">
            <StatCard label="Total" value={customers.length} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Today" value={todayCount} color="bg-amber-50 text-amber-700" />
            <StatCard label="Active" value={activeCount} color="bg-sky-50 text-sky-700" />
            <StatCard label="Inactive" value={inactiveCount} color="bg-rose-50 text-rose-700" />
          </View>

          <View className="gap-3 rounded-2xl border border-slate-200 bg-surface p-4">
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
              <Text className="mr-2 text-base text-slate-400">⌕</Text>
              <TextInput
                className="h-11 flex-1 text-sm text-slate-900"
                value={search}
                onChangeText={setSearch}
                placeholder="Search name, phone, email..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search">
                  <Text className="px-1 text-base text-slate-400">×</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="flex-row flex-wrap gap-2">
              {(['All', 'Active', 'Inactive'] as const).map(status => (
                <Pressable
                  key={status}
                  className={`rounded-full border px-4 py-2 ${
                    statusFilter === status
                      ? 'border-primary bg-primary'
                      : 'border-slate-200 bg-white'
                  }`}
                  onPress={() => setStatusFilter(status)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: statusFilter === status }}
                >
                  <Text
                    className={`text-xs font-bold ${
                      statusFilter === status ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#004D40" />
              <Text className="mt-3 text-sm text-slate-500">Loading customers...</Text>
            </View>
          ) : loadError ? (
            <View className="items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-7">
              <Text className="text-center text-sm font-semibold text-red-700">{loadError}</Text>
              <Pressable
                className="mt-4 rounded-xl bg-primary px-5 py-3"
                onPress={() => fetchCustomers()}
                accessibilityRole="button"
              >
                <Text className="font-bold text-white">Try Again</Text>
              </Pressable>
            </View>
          ) : visibleCustomers.length ? (
            <View className="gap-3">
              {visibleCustomers.map(customer => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  selected={String(selectedCustomerId) === String(customer.id)}
                  onSelect={() => setSelectedCustomerId(customer.id)}
                  onEdit={() => openEditForm(customer)}
                  onDelete={() => deleteCustomer(customer)}
                />
              ))}
            </View>
          ) : (
            <View className="items-center rounded-2xl border border-slate-200 bg-surface px-5 py-10">
              <Text className="text-base font-bold text-slate-800">
                {customers.length ? 'No customers match your filters' : 'No customers found'}
              </Text>
              <Text className="mt-2 text-center text-sm text-slate-500">
                {customers.length
                  ? 'Try another search or date range.'
                  : 'Add a customer to get started.'}
              </Text>
            </View>
          )}

          {filteredCustomers.length > PAGE_SIZE ? (
            <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-surface px-4 py-3">
              <Text className="text-xs text-slate-500">
                {`${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                  safePage * PAGE_SIZE,
                  filteredCustomers.length,
                )} of ${filteredCustomers.length}`}
              </Text>
              <View className="flex-row items-center gap-3">
                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
                  onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={safePage <= 1}
                  accessibilityRole="button"
                  accessibilityLabel="Previous customer page"
                >
                  <Text className="text-lg text-slate-700">‹</Text>
                </Pressable>
                <Text className="text-xs font-bold text-slate-600">
                  {safePage} / {totalPages}
                </Text>
                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
                  onPress={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={safePage >= totalPages}
                  accessibilityRole="button"
                  accessibilityLabel="Next customer page"
                >
                  <Text className="text-lg text-slate-700">›</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {selectedCustomer ? (
            <CustomerDetails
              customer={selectedCustomer}
              onEdit={() => openEditForm(selectedCustomer)}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
      <View className="absolute bottom-4 right-5 z-20">
        <PulseFab accessibilityLabel="Create new customer" onPress={openAddForm} />
      </View>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="min-h-20 flex-1 items-center justify-center rounded-xl border border-slate-100 bg-surface p-2 shadow-xs">
      <Text className="text-[10px] font-semibold text-slate-500">{label}</Text>
      <Text className={`mt-1 text-xl font-extrabold ${color.split(' ')[1]}`}>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

function CustomerCard({
  customer,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      className={`rounded-2xl border bg-surface p-4 shadow-xs ${
        selected ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'
      }`}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={`View ${customer.name}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-amber-50">
            <Text className="text-sm font-extrabold text-amber-800">{getInitials(customer.name)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-slate-900" numberOfLines={1}>
              {customer.name}
            </Text>
            <Text className="mt-0.5 text-[10px] text-slate-500">
              Customer #{customer.id}
            </Text>
          </View>
        </View>
        <Text
          className={`rounded-md px-2 py-1 text-[10px] font-bold ${
            customer.status === 'Active'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {customer.status}
        </Text>
      </View>

      <View className="mt-3 gap-1 border-t border-slate-100 pt-3">
        <Text className="text-xs text-slate-700" numberOfLines={1}>
          {customer.email || 'Email not provided'}
        </Text>
        <Text className="text-xs text-slate-500">{customer.phone || 'Phone not provided'}</Text>
        <Text className="text-[10px] capitalize text-slate-500">
          {customer.role} · Joined {formatDate(customer.created_at)}
        </Text>
      </View>

      <View className="mt-3 flex-row justify-end gap-2 border-t border-slate-100 pt-3">
        <ActionButton label="Edit customer" onPress={onEdit} icon="edit" />
        <ActionButton label="Delete customer" onPress={onDelete} icon="delete" destructive />
      </View>
    </Pressable>
  );
}

function CustomerDetails({
  customer,
  onEdit,
}: {
  customer: Customer;
  onEdit: () => void;
}) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-surface p-4">
      <View className="mb-4 flex-row items-center">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <Text className="text-base font-extrabold text-amber-800">{getInitials(customer.name)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-extrabold text-slate-900">Customer Details</Text>
          <Text className="mt-0.5 text-xs text-slate-500">{customer.name}</Text>
        </View>
      </View>
      <DetailRow label="Email" value={customer.email || 'Not provided'} />
      <DetailRow label="Phone" value={customer.phone || 'Not provided'} />
      <DetailRow label="Role" value={customer.role} />
      <DetailRow label="Joined" value={formatDate(customer.created_at, true)} />
      <Pressable
        className="mt-4 items-center rounded-xl bg-primary px-4 py-3"
        onPress={onEdit}
        accessibilityRole="button"
      >
        <Text className="text-xs font-bold text-white">Edit Customer</Text>
      </Pressable>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row border-t border-slate-100 py-2.5">
      <Text className="w-20 text-xs text-slate-500">{label}</Text>
      <Text className="flex-1 text-xs font-medium text-slate-700">{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  icon,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  icon: 'edit' | 'delete';
  destructive?: boolean;
}) {
  return (
    <Pressable
      className={`h-9 w-9 items-center justify-center rounded-lg border ${
        destructive ? 'border-rose-100 bg-rose-50' : 'border-slate-200 bg-white'
      }`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        {icon === 'edit' ? (
          <Path
            d="m16 4 4 4M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"
            stroke={destructive ? '#E11D48' : '#475569'}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <Path
            d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"
            stroke={destructive ? '#E11D48' : '#475569'}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>
    </Pressable>
  );
}

function CustomerInput({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
}) {
  return (
    <View>
      <Text className="text-xs font-bold text-slate-700">{label}</Text>
      <TextInput
        className="mt-2 h-12 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900"
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        secureTextEntry={props.secureTextEntry}
        placeholder={label.replace(' *', '')}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

export default Customer;