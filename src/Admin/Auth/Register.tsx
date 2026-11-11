import { useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { Alert } from '../../Components/AppAlert';

type RegisterProps = {
  onLogin: () => void;
  onCancel?: () => void;
};

type FieldProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  secureTextEntry?: boolean;
  accessibilityLabel: string;
  rightElement?: ReactNode;
};

function RegisterField({
  label,
  icon,
  value,
  placeholder,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  accessibilityLabel,
  rightElement,
}: FieldProps) {
  return (
    <View>
      <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700">
        {label}
      </Text>
      <View className="h-14 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
        <Ionicons name={icon} size={21} color="#64748B" />
        <TextInput
          className="ml-3 flex-1 py-0 text-base text-slate-900"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          accessibilityLabel={accessibilityLabel}
          returnKeyType="next"
        />
        {rightElement}
      </View>
    </View>
  );
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Registration failed. Please try again.';
}

function Register({ onLogin, onCancel }: RegisterProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedUsername || !trimmedEmail || !trimmedPhone || !password) {
      setErrorMessage('Complete all fields to create your account.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Your password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

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
      Alert.alert(
        'Registration successful',
        'Your account has been created. Please log in to continue.',
        [{ text: 'Go to Login', onPress: onLogin }],
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordToggle = (
    visible: boolean,
    setVisible: (next: boolean) => void,
    label: string,
  ) => (
    <Pressable
      className="ml-2 min-w-8 items-center"
      onPress={() => setVisible(!visible)}
      accessibilityRole="button"
      accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label}`}
    >
      <Ionicons
        name={visible ? 'eye-off-outline' : 'eye-outline'}
        size={21}
        color="#64748B"
      />
    </Pressable>
  );

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

            <View className="w-full self-center rounded-[28px] border border-[#eee8dc] bg-white px-3 pb-6 pt-6 shadow-lg">
              <View className="mb-5 items-center">
               
                <Text className="text-center text-2xl font-bold text-slate-900">
                  Create your account
                </Text>
                <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
                  Join us and find something special for every moment.
                </Text>
              </View>

              <View className="gap-y-3.5">
                <RegisterField
                  label="Full name"
                  icon="person-outline"
                  value={username}
                  placeholder="Enter your full name"
                  onChangeText={setUsername}
                  autoCapitalize="words"
                  accessibilityLabel="Full name"
                />
                <RegisterField
                  label="Email address"
                  icon="mail-outline"
                  value={email}
                  placeholder="you@example.com"
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accessibilityLabel="Email address"
                />
                <RegisterField
                  label="Mobile number"
                  icon="call-outline"
                  value={phone}
                  placeholder="Enter your mobile number"
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  accessibilityLabel="Mobile number"
                />
                <RegisterField
                  label="Password"
                  icon="lock-closed-outline"
                  value={password}
                  placeholder="At least 8 characters"
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  accessibilityLabel="Password"
                  rightElement={passwordToggle(
                    showPassword,
                    setShowPassword,
                    'password',
                  )}
                />
                <RegisterField
                  label="Confirm password"
                  icon="shield-checkmark-outline"
                  value={confirmPassword}
                  placeholder="Enter your password again"
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  accessibilityLabel="Confirm password"
                  rightElement={passwordToggle(
                    showConfirmPassword,
                    setShowConfirmPassword,
                    'confirm password',
                  )}
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
                  onPress={onLogin}
                  accessibilityRole="button"
                  accessibilityLabel="Go to login"
                >
                  <Text className="text-sm font-bold text-primary">Login</Text>
                </Pressable>
              </View>
              {onCancel ? (
                <Pressable
                  className="mt-3 items-center py-2"
                  onPress={onCancel}
                  accessibilityRole="button"
                  accessibilityLabel="Go to Home"
                >
                  <Text className="text-sm font-semibold text-slate-500">
                    Back to Home
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View className="mt-5 flex-row items-center justify-center">
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#64748B"
              />
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
