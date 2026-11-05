import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { launchImageLibrary } from 'react-native-image-picker';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import api, { API_BASE_URL } from '../../api';
import type { AuthenticatedUser } from '../Auth/Login';

export type UserProfile = {
  user_id: string | number;
  username: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  profile_image?: string;
  notification_preferences: {
    email: boolean;
    orders: boolean;
    [key: string]: boolean;
  };
};

const EMPTY_PROFILE: UserProfile = {
  user_id: '',
  username: '',
  name: '',
  email: '',
  phone: '',
  address: '',
  role: 'admin',
  status: 'Active',
  created_at: '',
  updated_at: '',
  notification_preferences: { email: true, orders: true },
};

type ProfileProps = {
  user: AuthenticatedUser;
  onUserUpdated: (user: AuthenticatedUser) => void;
  onLogout: () => void;
  onBack: () => void;
};

type ActiveSection =
  | 'personal-information'
  | 'change-password'
  | 'notification-preferences'
  | 'activity-log';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error !== 'object' || error === null) return fallback;
  if ('message' in error && typeof error.message === 'string') return error.message;
  return fallback;
};

const dateLabel = (value?: string): string => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const dateTimeLabel = (value?: string): string => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const getProfileImageUrl = (imagePath?: string): string | undefined => {
  if (!imagePath) return undefined;
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }
  const cleanBase = API_BASE_URL.replace(/\/api\/?$/, '');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${cleanBase}${cleanPath}`;
};

function Profile({ user, onUserUpdated, onLogout, onBack }: ProfileProps) {
  const userRef = useRef(user);
  const onUserUpdatedRef = useRef(onUserUpdated);
  userRef.current = user;
  onUserUpdatedRef.current = onUserUpdated;

  const [profile, setProfile] = useState<UserProfile>({
    ...EMPTY_PROFILE,
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || user.mobile || user.phone_number || '',
    role: user.role || 'admin',
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('personal-information');

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError('');

    try {
      const response = await api.get('/auth/me');
      if (response.data?.user) {
        const u = response.data.user;
        const merged: UserProfile = {
          ...EMPTY_PROFILE,
          ...u,
          notification_preferences: {
            ...EMPTY_PROFILE.notification_preferences,
            ...(u.notification_preferences || {}),
          },
        };
        setProfile(merged);

        // Update local session storage
        const currentUser = userRef.current;
        const updatedAuth: AuthenticatedUser = {
          ...currentUser,
          name: merged.name || currentUser.name,
          email: merged.email || currentUser.email,
          phone: merged.phone || currentUser.phone,
          role: merged.role || currentUser.role,
        };
        await AsyncStorage.setItem('authUser', JSON.stringify(updatedAuth));
        onUserUpdatedRef.current(updatedAuth);
      }
    } catch (error) {
      console.error('Failed to load profile from backend:', error);
      setLoadError(getErrorMessage(error, 'Unable to load profile.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const initials = useMemo(() => {
    return (profile.name || profile.username || user.name || 'A')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'A';
  }, [profile.name, profile.username, user.name]);

  const updateField = (field: keyof UserProfile, value: string) => {
    setProfile(current => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      Alert.alert('Required Fields', 'Full Name and Email Address are required.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/auth/me', {
        username: profile.username || undefined,
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
      });

      const updatedUser = response.data?.user || {};
      const merged: UserProfile = {
        ...profile,
        ...updatedUser,
        notification_preferences: profile.notification_preferences,
      };
      setProfile(merged);

      const updatedAuth: AuthenticatedUser = {
        ...user,
        name: merged.name,
        email: merged.email,
        phone: merged.phone,
        role: merged.role || user.role,
      };
      await AsyncStorage.setItem('authUser', JSON.stringify(updatedAuth));
      onUserUpdated(updatedAuth);

      Alert.alert('Success', 'Profile details saved successfully.');
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Save Failed', getErrorMessage(error, 'Could not save profile details.'));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwords.current) {
      Alert.alert('Current password required', 'Please enter your current password.');
      return;
    }
    if (passwords.next.length < 8) {
      Alert.alert('Password too short', 'New password must be at least 8 characters long.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      Alert.alert('Passwords do not match', 'The new passwords entered do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await api.put('/auth/me/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      Alert.alert('Password Updated', 'Your account password has been updated successfully.');
    } catch (error) {
      console.error('Failed to update password:', error);
      Alert.alert('Update Failed', getErrorMessage(error, 'Could not update password.'));
    } finally {
      setChangingPassword(false);
    }
  };

  const uploadProfileImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });

      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        Alert.alert('Image too large', 'Profile images must be 2 MB or smaller.');
        return;
      }

      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || `profile-${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      } as unknown as Blob);

      setUploadingImage(true);
      const response = await api.post('/auth/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.user) {
        setProfile(current => ({ ...current, ...response.data.user }));
      }
      Alert.alert('Success', 'Profile photo updated successfully.');
    } catch (error) {
      console.error('Failed to upload profile photo:', error);
      Alert.alert('Upload Failed', getErrorMessage(error, 'Could not upload profile photo.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = () => {
    Alert.alert('Remove Photo?', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadingImage(true);
          try {
            const response = await api.delete('/auth/me/photo');
            if (response.data?.user) {
              setProfile(current => ({ ...current, ...response.data.user }));
            }
            Alert.alert('Success', 'Profile photo removed.');
          } catch (error) {
            console.error('Failed to remove photo:', error);
            Alert.alert('Removal Failed', getErrorMessage(error, 'Could not remove profile photo.'));
          } finally {
            setUploadingImage(false);
          }
        },
      },
    ]);
  };

  const changePreference = async (key: string) => {
    const previous = profile.notification_preferences;
    const next = { ...previous, [key]: !previous[key] };
    setProfile(current => ({ ...current, notification_preferences: next }));
    setSavingPreferences(key);

    try {
      const response = await api.put('/auth/me/notifications', next);
      if (response.data?.user?.notification_preferences) {
        setProfile(current => ({
          ...current,
          notification_preferences: response.data.user.notification_preferences,
        }));
      }
    } catch (error) {
      console.error('Failed to update notification preference:', error);
      setProfile(current => ({ ...current, notification_preferences: previous }));
      Alert.alert('Error', getErrorMessage(error, 'Unable to save notification preference.'));
    } finally {
      setSavingPreferences('');
    }
  };

  const roleLabel = (profile.role || user.role || 'Admin')
    .replace(/^\w/, letter => letter.toUpperCase());

  const photoUri = getProfileImageUrl(profile.profile_image);

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center justify-between border-b border-[#00382E] bg-primary px-4">
        <View className="flex-1 flex-row items-center pr-3">
          <Pressable
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <Text className="text-xl font-bold text-white">‹</Text>
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-extrabold tracking-wide text-white">
              Profile
            </Text>
            <Text className="text-[10px] font-medium text-emerald-200">
              Sri Golds Jewellery
            </Text>
          </View>
        </View>
      </View>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-12 pt-3"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadProfile(true)}
              tintColor="#004D40"
            />
          }
        >
          {/* Header Banner Section */}
          <View className="mb-4 overflow-hidden rounded-3xl border border-slate-200/90 bg-surface p-5 shadow-xs">
            <View className="flex-row items-center gap-4">
              {/* Profile Avatar with Camera Button */}
              <View className="relative">
                <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-primary text-white shadow-sm">
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <Text className="text-2xl font-black text-accent-light">{initials}</Text>
                  )}
                </View>
                <Pressable
                  onPress={uploadProfileImage}
                  disabled={uploadingImage}
                  className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-800 shadow-sm active:bg-slate-700"
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ProfileIcon name="camera" color="#FFFFFF" size={13} />
                  )}
                </Pressable>
              </View>

              {/* User details & Role Badge */}
              <View className="flex-1">
                <Text className="text-xl font-black text-slate-900" numberOfLines={1}>
                  {profile.name || profile.username || 'Admin User'}
                </Text>
                <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                  {profile.username ? `@${profile.username}` : profile.email}
                </Text>

                <View className="mt-2 flex-row items-center">
                  <View className="flex-row items-center rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1">
                    <ProfileIcon name="shield" color="#B45309" size={11} />
                    <Text className="ml-1 text-[10px] font-extrabold uppercase text-amber-900">
                      {roleLabel}
                    </Text>
                  </View>
                  {profile.status ? (
                    <View className="ml-2 flex-row items-center rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5">
                      <View className="h-1.5 w-1.5 rounded-full bg-emerald-600 mr-1" />
                      <Text className="text-[10px] font-bold text-emerald-800">
                        {profile.status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Quick Contact Chips Row */}
            <View className="mt-4 pt-3.5 border-t border-slate-100 flex-row flex-wrap gap-2.5">
              <View className="flex-1 min-w-[140px] flex-row items-center rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-sky-100">
                  <ProfileIcon name="mail" color="#0369A1" size={13} />
                </View>
                <View className="ml-2 flex-1">
                  <Text className="text-[9px] font-bold text-slate-400 uppercase">Email</Text>
                  <Text className="text-xs font-semibold text-slate-800" numberOfLines={1}>
                    {profile.email || 'Not set'}
                  </Text>
                </View>
              </View>

              <View className="flex-1 min-w-[140px] flex-row items-center rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                  <ProfileIcon name="phone" color="#0F766E" size={13} />
                </View>
                <View className="ml-2 flex-1">
                  <Text className="text-[9px] font-bold text-slate-400 uppercase">Phone</Text>
                  <Text className="text-xs font-semibold text-slate-800" numberOfLines={1}>
                    {profile.phone || 'Not set'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Tab Navigation Pill Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerClassName="gap-2"
          >
            <TabButton
              label="Personal Info"
              icon="user"
              active={activeSection === 'personal-information'}
              onPress={() => setActiveSection('personal-information')}
            />
            <TabButton
              label="Password"
              icon="lock"
              active={activeSection === 'change-password'}
              onPress={() => setActiveSection('change-password')}
            />
            <TabButton
              label="Notifications"
              icon="bell"
              active={activeSection === 'notification-preferences'}
              onPress={() => setActiveSection('notification-preferences')}
            />
            <TabButton
              label="Activity Log"
              icon="activity"
              active={activeSection === 'activity-log'}
              onPress={() => setActiveSection('activity-log')}
            />
          </ScrollView>

          {loading && !refreshing ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color="#004D40" />
              <Text className="mt-3 text-xs text-slate-500">Loading your profile…</Text>
            </View>
          ) : loadError ? (
            <View className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <Text className="text-xs font-bold text-rose-800">{loadError}</Text>
              <Pressable
                onPress={() => loadProfile()}
                className="mt-3 self-start rounded-lg bg-primary px-3.5 py-1.5"
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-white">Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-4">
              {/* TAB 1: PERSONAL INFORMATION */}
              {activeSection === 'personal-information' ? (
                <View className="gap-4">
                  {/* Form Card */}
                  <View className="overflow-hidden rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs">
                    <View className="mb-4">
                      <Text className="text-base font-extrabold text-slate-900">
                        Personal Information
                      </Text>
                      <Text className="mt-0.5 text-xs text-slate-500">
                        Update your identity details and contact information.
                      </Text>
                    </View>

                    <View className="gap-3.5">
                      {/* Name */}
                      <View>
                        <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                          Full Name <Text className="text-red-500">*</Text>
                        </Text>
                        <TextInput
                          value={profile.name}
                          onChangeText={value => updateField('name', value)}
                          placeholder="Your full name"
                          placeholderTextColor="#94A3B8"
                          className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                          accessibilityLabel="Full Name"
                        />
                      </View>

                      {/* Email */}
                      <View>
                        <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                          Email Address <Text className="text-red-500">*</Text>
                        </Text>
                        <TextInput
                          value={profile.email}
                          onChangeText={value => updateField('email', value)}
                          placeholder="Your email address"
                          placeholderTextColor="#94A3B8"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                          accessibilityLabel="Email Address"
                        />
                      </View>

                      {/* Phone */}
                      <View>
                        <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                          Mobile Number
                        </Text>
                        <TextInput
                          value={profile.phone}
                          onChangeText={value => updateField('phone', value)}
                          placeholder="e.g. +91 98765 43210"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                          accessibilityLabel="Mobile Number"
                        />
                      </View>

                      {/* Role and Username (Read-only badges) */}
                      <View className="flex-row gap-3">
                        <View className="flex-1">
                          <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                            Role
                          </Text>
                          <View className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                            <Text className="text-sm font-semibold text-slate-700">{roleLabel}</Text>
                          </View>
                        </View>
                        <View className="flex-1">
                          <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                            Username
                          </Text>
                          <View className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                            <Text className="text-sm font-semibold text-slate-700">
                              {profile.username || 'Not assigned'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Profile Photo Controls */}
                      <View>
                        <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                          Profile Photo
                        </Text>
                        <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <View className="flex-row items-center gap-3">
                            <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-primary">
                              {photoUri ? (
                                <Image
                                  source={{ uri: photoUri }}
                                  className="h-full w-full"
                                  resizeMode="cover"
                                />
                              ) : (
                                <Text className="text-base font-bold text-accent-light">{initials}</Text>
                              )}
                            </View>
                            <View>
                              <Text className="text-xs font-bold text-slate-800">
                                {photoUri ? 'Custom Photo' : 'Initials Avatar'}
                              </Text>
                              <Text className="text-[10px] text-slate-500">JPG, PNG or WEBP; max 2 MB</Text>
                            </View>
                          </View>

                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={uploadProfileImage}
                              disabled={uploadingImage}
                              className="rounded-lg bg-primary px-3 py-1.5 active:bg-primary-dark"
                              accessibilityRole="button"
                            >
                              <Text className="text-xs font-bold text-white">
                                {uploadingImage ? 'Uploading…' : 'Change'}
                              </Text>
                            </Pressable>
                            {profile.profile_image ? (
                              <Pressable
                                onPress={removeProfileImage}
                                disabled={uploadingImage}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 active:bg-rose-100"
                                accessibilityRole="button"
                              >
                                <ProfileIcon name="trash" color="#DC2626" size={13} />
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      {/* Address */}
                      <View>
                        <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                          Address
                        </Text>
                        <TextInput
                          value={profile.address}
                          onChangeText={value => updateField('address', value)}
                          placeholder="Enter your address"
                          placeholderTextColor="#94A3B8"
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          className="min-h-20 rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                          accessibilityLabel="Address"
                        />
                      </View>
                    </View>

                    {/* Save Button */}
                    <View className="mt-5 pt-3 border-t border-slate-100">
                      <Pressable
                        onPress={saveProfile}
                        disabled={saving}
                        className={`flex-row items-center justify-center rounded-xl bg-primary py-3.5 shadow-xs ${
                          saving ? 'opacity-60' : 'active:opacity-90'
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel="Save personal details"
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <ProfileIcon name="check" color="#FFFFFF" size={16} />
                            <Text className="ml-2 text-sm font-bold text-white">Save Changes</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* TAB 2: CHANGE PASSWORD */}
              {activeSection === 'change-password' ? (
                <View className="overflow-hidden rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs">
                  <View className="mb-4 flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
                      <ProfileIcon name="lock" color="#B45309" size={18} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-extrabold text-slate-900">
                        Security & Password
                      </Text>
                      <Text className="text-xs text-slate-500">
                        Update your password to keep your admin account safe.
                      </Text>
                    </View>
                  </View>

                  <View className="gap-3.5">
                    {/* Current Password */}
                    <View>
                      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        Current Password
                      </Text>
                      <View className="relative justify-center">
                        <TextInput
                          value={passwords.current}
                          onChangeText={value => setPasswords(p => ({ ...p, current: value }))}
                          secureTextEntry={!visiblePasswords.current}
                          placeholder="Enter current password"
                          placeholderTextColor="#94A3B8"
                          className="rounded-xl border border-border bg-background px-3.5 py-3 pr-11 text-sm text-slate-800"
                          accessibilityLabel="Current Password"
                        />
                        <Pressable
                          onPress={() =>
                            setVisiblePasswords(p => ({ ...p, current: !p.current }))
                          }
                          className="absolute right-3 p-1"
                          accessibilityRole="button"
                        >
                          <ProfileIcon
                            name={visiblePasswords.current ? 'eyeOff' : 'eye'}
                            color="#64748B"
                            size={16}
                          />
                        </Pressable>
                      </View>
                    </View>

                    {/* New Password */}
                    <View>
                      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        New Password (Min 8 Characters)
                      </Text>
                      <View className="relative justify-center">
                        <TextInput
                          value={passwords.next}
                          onChangeText={value => setPasswords(p => ({ ...p, next: value }))}
                          secureTextEntry={!visiblePasswords.next}
                          placeholder="Enter new secure password"
                          placeholderTextColor="#94A3B8"
                          className="rounded-xl border border-border bg-background px-3.5 py-3 pr-11 text-sm text-slate-800"
                          accessibilityLabel="New Password"
                        />
                        <Pressable
                          onPress={() =>
                            setVisiblePasswords(p => ({ ...p, next: !p.next }))
                          }
                          className="absolute right-3 p-1"
                          accessibilityRole="button"
                        >
                          <ProfileIcon
                            name={visiblePasswords.next ? 'eyeOff' : 'eye'}
                            color="#64748B"
                            size={16}
                          />
                        </Pressable>
                      </View>
                    </View>

                    {/* Confirm Password */}
                    <View>
                      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        Confirm New Password
                      </Text>
                      <View className="relative justify-center">
                        <TextInput
                          value={passwords.confirm}
                          onChangeText={value => setPasswords(p => ({ ...p, confirm: value }))}
                          secureTextEntry={!visiblePasswords.confirm}
                          placeholder="Re-type new password"
                          placeholderTextColor="#94A3B8"
                          className="rounded-xl border border-border bg-background px-3.5 py-3 pr-11 text-sm text-slate-800"
                          accessibilityLabel="Confirm New Password"
                        />
                        <Pressable
                          onPress={() =>
                            setVisiblePasswords(p => ({ ...p, confirm: !p.confirm }))
                          }
                          className="absolute right-3 p-1"
                          accessibilityRole="button"
                        >
                          <ProfileIcon
                            name={visiblePasswords.confirm ? 'eyeOff' : 'eye'}
                            color="#64748B"
                            size={16}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  {/* Submit Button */}
                  <View className="mt-5 pt-3 border-t border-slate-100">
                    <Pressable
                      onPress={changePassword}
                      disabled={changingPassword || !passwords.current || !passwords.next}
                      className={`flex-row items-center justify-center rounded-xl bg-primary py-3.5 shadow-xs ${
                        changingPassword || !passwords.current || !passwords.next
                          ? 'opacity-60'
                          : 'active:opacity-90'
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Update Password"
                    >
                      {changingPassword ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <ProfileIcon name="lock" color="#FFFFFF" size={16} />
                          <Text className="ml-2 text-sm font-bold text-white">Update Password</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* TAB 3: NOTIFICATION PREFERENCES */}
              {activeSection === 'notification-preferences' ? (
                <View className="overflow-hidden rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs">
                  <View className="mb-4 flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-sky-50 border border-sky-200">
                      <ProfileIcon name="bell" color="#0369A1" size={18} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-extrabold text-slate-900">
                        Notification Preferences
                      </Text>
                      <Text className="text-xs text-slate-500">
                        Choose how and when Sri Golds alerts you.
                      </Text>
                    </View>
                  </View>

                  <View className="divide-y divide-slate-100">
                    {/* Email Preference */}
                    <View className="flex-row items-center justify-between py-3">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-bold text-slate-800">Email Notifications</Text>
                        <Text className="mt-0.5 text-xs text-slate-500">
                          Receive daily summaries, receipts & account alerts via email.
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => changePreference('email')}
                        disabled={savingPreferences === 'email'}
                        className={`h-7 w-12 justify-center rounded-full px-0.5 ${
                          profile.notification_preferences?.email ? 'bg-primary' : 'bg-slate-300'
                        }`}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: profile.notification_preferences?.email }}
                        accessibilityLabel="Toggle email notifications"
                      >
                        <View
                          className={`h-6 w-6 rounded-full bg-white shadow-xs ${
                            profile.notification_preferences?.email ? 'self-end' : 'self-start'
                          }`}
                        />
                      </Pressable>
                    </View>

                    {/* Order / Loan Notification Preference */}
                    <View className="flex-row items-center justify-between py-3">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-bold text-slate-800">Order & Billing Alerts</Text>
                        <Text className="mt-0.5 text-xs text-slate-500">
                          Instant push alerts for customer orders, loans & payments.
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => changePreference('orders')}
                        disabled={savingPreferences === 'orders'}
                        className={`h-7 w-12 justify-center rounded-full px-0.5 ${
                          profile.notification_preferences?.orders ? 'bg-primary' : 'bg-slate-300'
                        }`}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: profile.notification_preferences?.orders }}
                        accessibilityLabel="Toggle order notifications"
                      >
                        <View
                          className={`h-6 w-6 rounded-full bg-white shadow-xs ${
                            profile.notification_preferences?.orders ? 'self-end' : 'self-start'
                          }`}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* TAB 4: ACTIVITY LOG & ACCOUNT INFO */}
              {activeSection === 'activity-log' ? (
                <View className="gap-4">
                  {/* Account Summary Card */}
                  <View className="overflow-hidden rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs">
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200">
                        <ProfileIcon name="shield" color="#004D40" size={18} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-extrabold text-slate-900">
                          Account Information
                        </Text>
                        <Text className="text-xs text-slate-500">
                          Registered security credentials & access levels.
                        </Text>
                      </View>
                    </View>

                    <View className="rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-200/70">
                      <View className="flex-row items-center justify-between px-3.5 py-2.5">
                        <Text className="text-xs text-slate-500">User ID</Text>
                        <Text className="text-xs font-bold text-slate-800">
                          #ADM{String(profile.user_id || '001').padStart(3, '0')}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between px-3.5 py-2.5">
                        <Text className="text-xs text-slate-500">Role</Text>
                        <Text className="text-xs font-bold text-slate-800">{roleLabel}</Text>
                      </View>
                      <View className="flex-row items-center justify-between px-3.5 py-2.5">
                        <Text className="text-xs text-slate-500">Account Status</Text>
                        <View className="rounded-full bg-emerald-100 px-2.5 py-0.5">
                          <Text className="text-[10px] font-bold text-emerald-800">
                            {profile.status || 'Active'}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center justify-between px-3.5 py-2.5">
                        <Text className="text-xs text-slate-500">Member Since</Text>
                        <Text className="text-xs font-semibold text-slate-700">
                          {dateLabel(profile.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Activity Timestamps Card */}
                  <View className="overflow-hidden rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs">
                    <View className="mb-3 flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-50 border border-violet-200">
                        <ProfileIcon name="activity" color="#6D28D9" size={18} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-extrabold text-slate-900">Activity Log</Text>
                        <Text className="text-xs text-slate-500">
                          Timestamps of account milestones and updates.
                        </Text>
                      </View>
                    </View>

                    <View className="gap-2.5">
                      <View className="flex-row items-center rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                          <ProfileIcon name="check" color="#0F766E" size={14} />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-xs font-bold text-slate-800">Account Created</Text>
                          <Text className="text-[10px] text-slate-500">
                            {dateTimeLabel(profile.created_at)}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-sky-100">
                          <ProfileIcon name="mapPin" color="#0369A1" size={14} />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-xs font-bold text-slate-800">Profile Last Updated</Text>
                          <Text className="text-[10px] text-slate-500">
                            {dateTimeLabel(profile.updated_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Logout Button */}
              <View className="mt-2 pt-2">
                <Pressable
                  onPress={onLogout}
                  className="flex-row items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/80 py-3.5 active:bg-rose-100"
                  accessibilityRole="button"
                  accessibilityLabel="Log out of account"
                >
                  <ProfileIcon name="logout" color="#DC2626" size={16} />
                  <Text className="ml-2 text-sm font-bold text-rose-600">Log Out</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: 'user' | 'lock' | 'bell' | 'activity';
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-xl px-4 py-2.5 shadow-2xs ${
        active
          ? 'bg-primary border border-primary-dark shadow-xs'
          : 'bg-surface border border-slate-200/90 active:bg-slate-50'
      }`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <ProfileIcon name={icon} color={active ? '#F5C45E' : '#64748B'} size={15} />
      <Text
        className={`ml-2 text-xs font-bold ${
          active ? 'text-white' : 'text-slate-600'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ProfileIcon({
  name,
  color,
  size = 18,
}: {
  name:
    | 'user'
    | 'lock'
    | 'bell'
    | 'activity'
    | 'mail'
    | 'phone'
    | 'mapPin'
    | 'calendar'
    | 'camera'
    | 'check'
    | 'eye'
    | 'eyeOff'
    | 'shield'
    | 'trash'
    | 'upload'
    | 'logout';
  color: string;
  size?: number;
}) {
  switch (name) {
    case 'user':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
        </Svg>
      );
    case 'lock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3"
            y="11"
            width="18"
            height="11"
            rx="2"
            ry="2"
            stroke={color}
            strokeWidth={2}
          />
          <Path
            d="M7 11V7a5 5 0 0 1 10 0v4"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'activity':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M22 12h-4l-3 9L9 3l-3 9H2"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'mail':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="m22 6-10 7L2 6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'phone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'mapPin':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            ry="2"
            stroke={color}
            strokeWidth={2}
          />
          <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 6 9 17l-5-5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'eye':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
        </Svg>
      );
    case 'eyeOff':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="m1 1 22 22" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'shield':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'upload':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'logout':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
}

export default Profile;
