import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
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
import type { AuthenticatedUser } from '../Auth/Login';

type ProfileProps = {
  user: AuthenticatedUser;
  onUserUpdated: (user: AuthenticatedUser) => void;
  onLogout: () => void;
};

function Profile({ user, onUserUpdated, onLogout }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || user.mobile || user.phone_number || '');

  const displayName = user.name?.trim() || 'Admin';
  const roleName = user.role.trim().toLowerCase() === 'admin'
    ? 'Administrator'
    : user.role || 'User';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'A';

  const openEditor = () => {
    setName(user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone || user.mobile || user.phone_number || '');
    setIsEditing(true);
  };

  const saveProfile = async () => {
    const updatedUser: AuthenticatedUser = {
      ...user,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };

    setIsSaving(true);
    try {
      await AsyncStorage.setItem('authUser', JSON.stringify(updatedUser));
      onUserUpdated(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Save failed', 'Could not save your profile on this device. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="grow items-center px-5 py-8"
      >
        <View className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <View className="h-2 flex-row">
            <View className="flex-1 bg-primary" />
            <View className="w-16 bg-accent" />
            <View className="flex-1 bg-primary-light" />
          </View>

          <View className="items-center px-5 pb-5 pt-7">
            <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-accent bg-amber-50 shadow-sm">
              <Text className="text-2xl font-black text-primary">{initials}</Text>
            </View>
            <Text className="mt-3 text-xl font-black uppercase text-slate-900">
              {displayName}
            </Text>
            <Text className="mt-1 text-sm font-medium text-slate-500">{roleName}</Text>
          </View>

          <View className="mx-4 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <ProfileRow icon="♙" label="Full Name" value={user.name || 'Not provided'} />
            <ProfileRow icon="✉" label="Email" value={user.email || 'Not provided'} />
            <ProfileRow
              icon="☎"
              label="Phone"
              value={user.phone || user.mobile || user.phone_number || 'Not provided'}
            />
            <ProfileRow icon="▣" label="Role" value={roleName} last />
          </View>

          <View className="gap-3 px-4 pb-5 pt-4">
            <Pressable
              className="min-h-12 flex-row items-center justify-center rounded-full bg-primary px-5 active:opacity-80"
              onPress={openEditor}
              accessibilityRole="button"
            >
              <Text className="mr-2 text-base text-white">✎</Text>
              <Text className="text-sm font-bold text-white">Edit Profile</Text>
            </Pressable>
            <Pressable
              className="min-h-12 flex-row items-center justify-center rounded-full border border-red-500 bg-white px-5 active:bg-red-50"
              onPress={onLogout}
              accessibilityRole="button"
            >
              <Text className="mr-2 text-base font-bold text-red-600">⇥</Text>
              <Text className="text-sm font-bold text-red-600">Logout</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isEditing}
        animationType="slide"
        onRequestClose={() => { if (!isSaving) setIsEditing(false); }}
        statusBarTranslucent
      >
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="flex-row items-center justify-between border-b border-border bg-surface px-5 py-4">
              <View>
                <Text className="text-lg font-black text-slate-900">Edit Profile</Text>
                <Text className="mt-1 text-xs text-slate-500">
                  Update the profile details saved on this device.
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
              contentContainerClassName="gap-5 px-5 py-6"
              keyboardShouldPersistTaps="handled"
            >
              <ProfileInput label="Full Name" value={name} onChangeText={setName} />
              <ProfileInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <ProfileInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </ScrollView>

            <View className="flex-row justify-end gap-3 border-t border-border bg-surface px-5 py-4">
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
  icon,
  label,
  value,
  last = false,
}: {
  icon: string;
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
      <Text className="w-8 text-base font-bold text-primary">{icon}</Text>
      <Text className="w-20 text-xs font-medium text-slate-600">{label}</Text>
      <Text className="min-w-0 flex-1 text-right text-xs font-semibold text-slate-900" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ProfileInput({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'words',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
}) {
  return (
    <View>
      <Text className="mb-2 text-xs font-bold text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor="#94A3B8"
        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-slate-800"
      />
    </View>
  );
}

export default Profile;
