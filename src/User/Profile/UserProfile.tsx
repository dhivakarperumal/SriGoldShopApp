import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import type { AuthenticatedUser } from '../../Admin/Auth/Login';
import api from '../../api';

type UserProfileProps = {
  user: AuthenticatedUser;
  onUserUpdated: (user: AuthenticatedUser) => void;
  onBack: () => void;
  onLogout: () => void;
};

type ProfileData = AuthenticatedUser & {
  username: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at?: string;
};

type Loan = {
  id: string | number;
  loan_number?: string;
  gold_pledge_number?: string;
  loan_status?: string;
  jewellery_type?: string;
  metal_type?: string;
  gold_purity?: string;
  net_gold_weight?: number | string;
  principal_amount?: number | string;
  outstanding_principal?: number | string | null;
  loan_date?: string;
  maturity_date?: string;
  interest_type?: string;
  interest_rate?: number | string;
};

type ProfileSection = 'details' | 'loans';

const PROFILE_FIELDS: {
  key: 'username' | 'name' | 'email' | 'phone' | 'address';
  label: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
}[] = [
  { key: 'username', label: 'Username', autoCapitalize: 'none' },
  { key: 'name', label: 'Full Name' },
  {
    key: 'email',
    label: 'Email Address',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
  },
  { key: 'phone', label: 'Phone Number', keyboardType: 'phone-pad' },
  { key: 'address', label: 'Address' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toProfileData(
  value: Record<string, unknown>,
  fallback: AuthenticatedUser,
): ProfileData {
  const text = (key: string, defaultValue = '') =>
    typeof value[key] === 'string' ? value[key] : defaultValue;

  return {
    ...fallback,
    role: text('role', fallback.role),
    username: text('username', fallback.username || ''),
    name: text('name', fallback.name || ''),
    email: text('email', fallback.email || ''),
    phone: text('phone', fallback.phone || fallback.mobile || fallback.phone_number || ''),
    address: text('address', fallback.address || ''),
    user_id:
      typeof value.user_id === 'string' || typeof value.user_id === 'number'
        ? value.user_id
        : fallback.user_id,
    status: text('status', fallback.status),
    created_at: text('created_at', fallback.created_at),
    profile_image:
      typeof value.profile_image === 'string' || value.profile_image === null
        ? value.profile_image
        : fallback.profile_image,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return fallback;
}

function money(value: unknown): string {
  const amount = Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

function dateLabel(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function UserProfile({ user, onUserUpdated, onBack, onLogout }: UserProfileProps) {
  const [profile, setProfile] = useState<ProfileData>(() =>
    toProfileData(user, user),
  );
  const [section, setSection] = useState<ProfileSection>('details');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileRequestVersion, setProfileRequestVersion] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(() =>
    toProfileData(user, user),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  const [loansError, setLoansError] = useState('');
  const [loanRequestVersion, setLoanRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError('');
      try {
        const response = await api.get('/auth/me', {
          signal: controller.signal,
        });
        if (!isRecord(response.data) || !isRecord(response.data.user)) {
          throw new TypeError('The server returned invalid profile data.');
        }
        const nextProfile = toProfileData(response.data.user, user);
        setProfile(nextProfile);
        setDraft(nextProfile);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to load user profile:', error);
        setProfileError(errorMessage(error, 'Unable to load your profile.'));
      } finally {
        if (!controller.signal.aborted) setIsLoadingProfile(false);
      }
    };

    loadProfile().catch(error => {
      if (!controller.signal.aborted) {
        console.error('Failed to load user profile:', error);
        setProfileError('Unable to load your profile.');
        setIsLoadingProfile(false);
      }
    });

    return () => controller.abort();
  }, [profileRequestVersion, user]);

  useEffect(() => {
    if (section !== 'loans') return undefined;
    const controller = new AbortController();
    const loadLoans = async () => {
      setIsLoadingLoans(true);
      setLoansError('');
      try {
        const response = await api.get('/loans/my-loans', {
          signal: controller.signal,
        });
        if (!Array.isArray(response.data)) {
          throw new TypeError('The server returned invalid loan data.');
        }
        setLoans(response.data as Loan[]);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (isRecord(error) && error.status === 404) {
          setLoans([]);
        } else {
          console.error('Failed to load user loans:', error);
          setLoansError(errorMessage(error, 'Could not load loan details.'));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingLoans(false);
      }
    };

    loadLoans().catch(error => {
      if (!controller.signal.aborted) {
        console.error('Failed to load user loans:', error);
        setLoansError('Could not load loan details.');
        setIsLoadingLoans(false);
      }
    });

    return () => controller.abort();
  }, [section, loanRequestVersion]);

  const initials = useMemo(
    () =>
      (profile.name || profile.username || 'U')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join(''),
    [profile.name, profile.username],
  );

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : 'Member';

  const activeLoans = loans.filter(loan => loan.loan_status === 'Active').length;
  const completedLoans = loans.filter(
    loan => loan.loan_status === 'Completed',
  ).length;
  const totalPrincipal = loans.reduce(
    (total, loan) => total + Number(loan.principal_amount || 0),
    0,
  );
  const totalOutstanding = loans.reduce(
    (total, loan) =>
      total +
      Number(loan.outstanding_principal ?? loan.principal_amount ?? 0),
    0,
  );

  const openEditor = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const saveProfile = async () => {
    const username = draft.username.trim();
    const name = draft.name.trim();
    const email = draft.email.trim();
    const phone = draft.phone.trim();
    const address = draft.address.trim();

    if (!username || !name || !email) {
      Alert.alert(
        'Required details',
        'Username, full name, and email address are required.',
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.put('/auth/me', {
        username,
        name,
        email,
        phone,
        address,
      });
      if (!isRecord(response.data) || !isRecord(response.data.user)) {
        throw new TypeError('The server returned invalid profile data.');
      }

      const updatedProfile = toProfileData(response.data.user, user);
      setProfile(updatedProfile);
      onUserUpdated(updatedProfile);
      setIsEditing(false);

      try {
        await AsyncStorage.setItem(
          'authUser',
          JSON.stringify(updatedProfile),
        );
      } catch (storageError) {
        console.error('Failed to save updated user profile locally:', storageError);
        Alert.alert(
          'Profile saved',
          'Your profile was updated, but this device could not save the latest account details.',
        );
      }
    } catch (error) {
      console.error('Failed to update user profile:', error);
      Alert.alert(
        'Update failed',
        errorMessage(error, 'Unable to update your profile. Please try again.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#fffaf0]">
      <View className="flex-row items-center border-b border-[#eadcc0] bg-white px-4 py-3">
        <Pressable
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#fff4d9]"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Text className="text-2xl leading-7 text-primary-dark">‹</Text>
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-primary-dark">
          My Profile
        </Text>
        <Pressable
          className="rounded-full px-3 py-2"
          onPress={confirmLogout}
          accessibilityRole="button"
        >
          <Text className="text-xs font-bold text-red-600">Log out</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 py-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center rounded-2xl border border-[#e9e3d7] bg-white px-4 py-5">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#f5c45e]">
            <Text className="text-xl font-black text-primary">{initials}</Text>
          </View>
          <Text className="mt-3 text-lg font-bold text-[#201a13]">
            {profile.name || profile.username || 'Guest'}
          </Text>
          <Text className="mt-1 text-xs text-slate-500">{profile.email || '—'}</Text>
          <Text className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#a67b2e]">
            {profile.role === 'admin' ? 'Administrator' : 'Member Account'}
          </Text>
        </View>

        <View className="flex-row rounded-xl border border-[#e9e3d7] bg-white p-1">
          {([
            ['details', 'Profile Details'],
            ['loans', 'Loan Details'],
          ] as const).map(([id, label]) => {
            const isSelected = section === id;
            return (
              <Pressable
                key={id}
                className={`min-h-11 flex-1 items-center justify-center rounded-lg px-2 ${
                  isSelected ? 'bg-primary' : ''
                }`}
                onPress={() => setSection(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {section === 'details' ? (
          <View className="rounded-2xl border border-[#eadcc0] bg-white p-4">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-[#a67b2e]">
                  Account
                </Text>
                <Text className="mt-1 text-lg font-bold text-primary-dark">
                  Personal Details
                </Text>
              </View>
              <Pressable
                className="rounded-lg border border-[#dfe8e2] px-3 py-2"
                onPress={openEditor}
                accessibilityRole="button"
                disabled={isLoadingProfile}
              >
                <Text className="text-xs font-bold text-primary">Edit</Text>
              </Pressable>
            </View>
            {isLoadingProfile ? (
              <View className="items-center py-8">
                <ActivityIndicator color="#004D40" />
                <Text className="mt-2 text-xs text-slate-500">
                  Loading profile…
                </Text>
              </View>
            ) : profileError ? (
              <View className="rounded-xl bg-red-50 p-4">
                <Text className="text-sm font-semibold text-red-700">
                  {profileError}
                </Text>
                <Pressable
                  className="mt-3 self-start rounded-lg bg-white px-3 py-2"
                  onPress={() => {
                    setProfileError('');
                    setIsLoadingProfile(true);
                    setProfileRequestVersion(version => version + 1);
                  }}
                  accessibilityRole="button"
                >
                  <Text className="text-xs font-bold text-red-700">Try again</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View className="overflow-hidden rounded-xl border border-slate-100">
                  <ProfileRow label="Full Name" value={profile.name} />
                  <ProfileRow label="Username" value={profile.username} />
                  <ProfileRow label="Email Address" value={profile.email} />
                  <ProfileRow label="Phone Number" value={profile.phone} />
                  <ProfileRow label="Address" value={profile.address} />
                  <ProfileRow
                    label="Account Role"
                    value={
                      profile.role
                        ? profile.role.charAt(0).toUpperCase() +
                          profile.role.slice(1)
                        : 'Member'
                    }
                    last
                  />
                </View>
                <View className="mt-4 rounded-xl bg-[#f3f8f4] px-4 py-3">
                  <Text className="text-sm font-bold text-primary">
                    Account overview
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    Member since {memberSince}
                  </Text>
                </View>
              </>
            )}
          </View>
        ) : (
          <View className="gap-4">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-widest text-[#a67b2e]">
                Gold Loan
              </Text>
              <Text className="mt-1 text-xl font-bold text-primary-dark">
                Loan Details
              </Text>
              {!isLoadingLoans && !loansError && loans.length > 0 ? (
                <Text className="mt-1 text-xs text-slate-600">
                  {activeLoans} Active · {completedLoans} Completed
                </Text>
              ) : null}
            </View>
            {isLoadingLoans ? (
              <View className="items-center rounded-2xl border border-[#eee8dc] bg-white py-12">
                <ActivityIndicator color="#004D40" />
              </View>
            ) : loansError ? (
              <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <Text className="text-sm text-red-700">{loansError}</Text>
                <Pressable
                  className="mt-3 self-start rounded-lg bg-white px-3 py-2"
                  onPress={() => setLoanRequestVersion(version => version + 1)}
                  accessibilityRole="button"
                >
                  <Text className="text-xs font-bold text-red-700">Try again</Text>
                </Pressable>
              </View>
            ) : loans.length === 0 ? (
              <View className="items-center rounded-2xl border border-dashed border-[#d9d3c8] bg-white px-5 py-10">
                <Text className="text-base font-bold text-[#35443f]">
                  No loans found
                </Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
                  There are no gold loans linked to your account.
                </Text>
              </View>
            ) : (
              <>
                <View className="flex-row gap-2">
                  <LoanSummary label="Total Loans" value={String(loans.length)} />
                  <LoanSummary
                    label="Total Principal"
                    value={money(totalPrincipal)}
                  />
                  <LoanSummary
                    label="Outstanding"
                    value={money(totalOutstanding)}
                  />
                </View>
                {loans.map(loan => (
                  <LoanCard key={loan.id} loan={loan} />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isEditing}
        animationType="slide"
        onRequestClose={() => {
          if (!isSaving) setIsEditing(false);
        }}
        statusBarTranslucent
      >
        <SafeAreaView className="flex-1 bg-[#fffaf0]" edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="flex-row items-center justify-between border-b border-[#eadcc0] bg-white px-4 py-4">
              <View>
                <Text className="text-lg font-bold text-primary-dark">
                  Edit Profile
                </Text>
                <Text className="mt-1 text-xs text-slate-500">
                  Update your account details.
                </Text>
              </View>
              <Pressable
                className="rounded-full bg-slate-100 px-3 py-2"
                onPress={() => setIsEditing(false)}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Close profile editor"
              >
                <Text className="font-bold text-slate-600">×</Text>
              </Pressable>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerClassName="gap-4 px-5 py-6"
              keyboardShouldPersistTaps="handled"
            >
              {PROFILE_FIELDS.map(field => (
                <View key={field.key}>
                  <Text className="mb-2 text-xs font-bold text-slate-700">
                    {field.label}
                    {field.key === 'username' ||
                    field.key === 'name' ||
                    field.key === 'email'
                      ? ' *'
                      : ''}
                  </Text>
                  <TextInput
                    value={draft[field.key]}
                    onChangeText={value =>
                      setDraft(current => ({ ...current, [field.key]: value }))
                    }
                    keyboardType={field.keyboardType || 'default'}
                    autoCapitalize={field.autoCapitalize || 'words'}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    placeholderTextColor="#94A3B8"
                    multiline={field.key === 'address'}
                    textAlignVertical={
                      field.key === 'address' ? 'top' : 'center'
                    }
                    className={`rounded-xl border border-[#eadcc0] bg-white px-4 py-3 text-sm text-slate-800 ${
                      field.key === 'address' ? 'min-h-24' : 'min-h-12'
                    }`}
                    accessibilityLabel={field.label}
                  />
                </View>
              ))}
            </ScrollView>

            <View className="flex-row justify-end gap-3 border-t border-[#eadcc0] bg-white px-5 py-4">
              <Pressable
                className="rounded-xl bg-slate-100 px-5 py-3"
                onPress={() => setIsEditing(false)}
                disabled={isSaving}
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-slate-700">Cancel</Text>
              </Pressable>
              <Pressable
                className={`min-w-28 items-center rounded-xl bg-primary px-5 py-3 ${
                  isSaving ? 'opacity-50' : 'active:opacity-80'
                }`}
                onPress={saveProfile}
                disabled={isSaving}
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-white">
                  {isSaving ? 'Saving…' : 'Save Profile'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function ProfileRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`min-h-12 flex-row items-center px-3 ${
        last ? '' : 'border-b border-slate-100'
      }`}
    >
      <Text className="w-28 text-xs font-medium text-slate-600">{label}</Text>
      <Text
        className="min-w-0 flex-1 text-right text-xs font-semibold text-slate-900"
        numberOfLines={2}
      >
        {value || '—'}
      </Text>
    </View>
  );
}

function LoanSummary({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 rounded-xl border border-[#eee8dc] bg-white p-3">
      <Text className="text-[10px] text-slate-500">{label}</Text>
      <Text className="mt-1 text-sm font-extrabold text-primary" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LoanCard({ loan }: { loan: Loan }) {
  const outstanding = Number(
    loan.outstanding_principal ?? loan.principal_amount ?? 0,
  );

  return (
    <View className="overflow-hidden rounded-2xl border border-[#eadcc0] bg-white">
      <View className="flex-row items-center justify-between bg-primary px-4 py-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-[#f5c45e]">
            {loan.loan_number || 'Gold Loan'}
          </Text>
          {loan.gold_pledge_number ? (
            <Text className="mt-1 text-xs text-white/70">
              {loan.gold_pledge_number}
            </Text>
          ) : null}
        </View>
        <Text
          className={`ml-2 rounded-full px-3 py-1 text-[10px] font-bold ${
            loan.loan_status === 'Active'
              ? 'bg-green-100 text-green-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {loan.loan_status || 'Status unavailable'}
        </Text>
      </View>
      <View className="gap-3 p-4">
        <Text className="text-xs leading-5 text-slate-600">
          {[loan.jewellery_type, loan.metal_type, loan.gold_purity]
            .filter(Boolean)
            .join(' · ') || 'Jewellery details unavailable'}
          {loan.net_gold_weight != null
            ? ` · ${Number(loan.net_gold_weight).toFixed(2)}g`
            : ''}
        </Text>
        <View className="flex-row gap-2">
          <View className="flex-1 rounded-xl bg-[#f9f5ee] p-3">
            <Text className="text-[10px] font-semibold uppercase text-slate-500">
              Principal
            </Text>
            <Text className="mt-1 text-sm font-bold text-primary">
              {money(loan.principal_amount)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-red-50 p-3">
            <Text className="text-[10px] font-semibold uppercase text-slate-500">
              Outstanding
            </Text>
            <Text className="mt-1 text-sm font-bold text-red-600">
              {money(outstanding)}
            </Text>
          </View>
        </View>
        <Text className="text-xs text-slate-600">
          Start: {dateLabel(loan.loan_date)} · Due: {dateLabel(loan.maturity_date)}
        </Text>
        {loan.interest_rate != null ? (
          <Text className="text-xs text-slate-500">
            Interest: {loan.interest_type?.replace('_', ' ') || 'Rate'} ·{' '}
            {Number(loan.interest_rate).toFixed(2)}%
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default UserProfile;
