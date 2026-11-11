import { useRef, useState } from 'react';
import type { ComponentRef, RefObject } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api';

type RegisterProps = {
  onRegistered: () => void;
  onBack: () => void;
};

type FieldProps = {
  label: string;
  placeholder: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  onToggleVisibility?: () => void;
  isVisible?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  inputRef?: RefObject<ComponentRef<typeof TextInput> | null>;
};

function RegisterField({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  secureTextEntry,
  onToggleVisibility,
  isVisible,
  keyboardType = 'default',
  autoCapitalize = 'none',
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
}: FieldProps) {
  return (
    <View>
      <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700">
        {label}
      </Text>
      <View className="h-14 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
        <Ionicons name={icon} size={20} color="#64748B" />
        <TextInput
          ref={inputRef}
          className="ml-3 flex-1 py-0 text-base text-slate-900"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          accessibilityLabel={label}
        />
        {onToggleVisibility ? (
          <Pressable
            className="ml-2 min-w-8 items-center"
            onPress={onToggleVisibility}
            accessibilityRole="button"
            accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={isVisible ? 'eye-off-outline' : 'eye-outline'}
              size={21}
              color="#64748B"
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Register({ onRegistered, onBack }: RegisterProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const confirmPasswordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const handleRegister = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedUsername || !trimmedEmail || !trimmedPhone || !password) {
      setErrorMessage('Please complete all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await api.post('/auth/register', {
        username: trimmedUsername,
        email: trimmedEmail,
        phone: trimmedPhone,
        status: 'Active',
        password,
      });
      onRegistered();
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Registration failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f8f6f1]">
      <View className="absolute left-0 right-0 top-0 h-72 rounded-b-[48px] bg-[#004D40]" />
      <View className="absolute -right-12 top-16 h-48 w-48 rounded-full border border-white/10" />
      <View className="absolute -left-16 top-32 h-52 w-52 rounded-full border border-white/10" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="grow px-5 pb-8"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator={false}
          >
        

            <View className="items-center pb-8 pt-5">
              <View className="overflow-hidden rounded-full bg-white">
                <Image
                  source={require('../../Images/logo.png')}
                  className="h-20 w-20"
                  resizeMode="contain"
                  accessibilityLabel="Sri Golds"
                />
              </View>
              <View className="mt-1 flex-row items-center">
                <View className="mr-2 h-px w-7 bg-[#E8BC59]" />
                <Text className="text-[11px] font-bold tracking-[2px] text-[#F5D98D]">
                  GOLD · JEWELLERY · LOANS
                </Text>
                <View className="ml-2 h-px w-7 bg-[#E8BC59]" />
              </View>
            </View>

            <View className="rounded-[28px] border border-[#eee8dc] bg-white px-3 pb-6 pt-6 shadow-lg">
              <View className="mb-5 items-center">
              
                <Text className="text-2xl font-bold text-slate-900">
                  Create your account
                </Text>
                <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
                  Join us and find something special for every moment.
                </Text>
              </View>

              <View className="gap-y-3.5">
                <RegisterField
                  label="Full name"
                  placeholder="Enter your full name"
                  icon="person-outline"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="words"
                />
                <RegisterField
                  label="Email address"
                  placeholder="you@example.com"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <RegisterField
                  label="Mobile number"
                  placeholder="Enter your mobile number"
                  icon="call-outline"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <RegisterField
                  label="Password"
                  placeholder="Create a password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onToggleVisibility={() => setShowPassword(value => !value)}
                  isVisible={showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                />
                <RegisterField
                  inputRef={confirmPasswordRef}
                  label="Confirm password"
                  placeholder="Enter your password again"
                  icon="shield-checkmark-outline"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  onToggleVisibility={() =>
                    setShowConfirmPassword(value => !value)
                  }
                  isVisible={showConfirmPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
              </View>

              {errorMessage ? (
                <View className="mt-4 flex-row items-center rounded-xl bg-red-50 px-3 py-2.5">
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#DC2626"
                  />
                  <Text
                    className="ml-2 flex-1 text-sm text-red-700"
                    accessibilityRole="alert"
                  >
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              <Pressable
                className={`mt-5 h-14 flex-row items-center justify-center rounded-full bg-primary px-6 shadow-md ${
                  isLoading ? 'opacity-70' : 'active:bg-primary-dark'
                }`}
                onPress={handleRegister}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text className="ml-2.5 text-base font-bold text-white">
                      Create account
                    </Text>
                  </>
                )}
              </Pressable>

              <View className="mt-5 flex-row justify-center">
                <Text className="text-sm text-slate-500">
                  Already have an account?{' '}
                </Text>
                <Pressable
                  onPress={onBack}
                  accessibilityRole="button"
                  accessibilityLabel="Go to login"
                >
                  <Text className="text-sm font-bold text-primary">Login</Text>
                </Pressable>
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-center">
              <Ionicons name="shield-checkmark-outline" size={16} color="#64748B" />
              <Text className="ml-2 text-xs text-slate-500">
                Your details are kept safe and secure
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default Register;