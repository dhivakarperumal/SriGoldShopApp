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
    <View className="flex-1 bg-[#f4eadb]">
      <Image
        source={require('../../Images/welcome1bg.png')}
        className="absolute inset-0 h-full w-full"
        resizeMode="cover"
        accessible={false}
      />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="grow justify-center px-5 py-6"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            <View className="w-full max-w-[480px] self-center rounded-3xl border border-[#eadfc9] bg-white/95 px-5 py-6 shadow-xl">
              <View className="mb-5 flex-row items-center">
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-[#f4eadb]"
                  onPress={onLogin}
                  accessibilityRole="button"
                  accessibilityLabel="Back to login"
                >
                  <Ionicons name="arrow-back" size={20} color="#004D40" />
                </Pressable>
                <View className="ml-3 flex-1">
                  <Text className="text-xs font-bold uppercase tracking-[2px] text-[#A66B00]">
                    Sri Golds
                  </Text>
                  <Text className="mt-0.5 text-sm text-slate-500">
                    Gold · Jewellery · Loans
                  </Text>
                </View>
                <Ionicons name="diamond-outline" size={25} color="#D4A017" />
              </View>

              <View className="mb-5 items-center">
                <Image
                  source={require('../../Images/logo.png')}
                  className="h-16 w-44"
                  resizeMode="contain"
                  accessibilityLabel="Sri Golds"
                />
                <Text className="mt-2 text-2xl font-bold text-primary-dark">
                  Create Your Account
                </Text>
                <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
                  Join us and discover jewellery for every occasion.
                </Text>
              </View>

              <View className="gap-y-3">
                <RegisterField
                  label="Full Name"
                  icon="person-outline"
                  value={username}
                  placeholder="Enter your full name"
                  onChangeText={setUsername}
                  accessibilityLabel="Full name"
                />
                <RegisterField
                  label="Email Address"
                  icon="mail-outline"
                  value={email}
                  placeholder="Enter your email address"
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accessibilityLabel="Email address"
                />
                <RegisterField
                  label="Mobile Number"
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
                  label="Confirm Password"
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
                <Text
                  className="mt-4 text-center text-sm leading-5 text-red-600"
                  accessibilityRole="alert"
                >
                  {errorMessage}
                </Text>
              ) : null}

              <Pressable
                className={`mt-5 h-14 flex-row items-center justify-center rounded-full bg-primary px-6 shadow-lg ${
                  isLoading ? 'opacity-70' : ''
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
                    <Text className="ml-2 text-base font-bold text-white">
                      Create Account
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
                  <Text className="text-sm font-bold text-primary">
                    Login
                  </Text>
                </Pressable>
              </View>
              {onCancel ? (
                <Pressable
                  className="mt-4 items-center py-2"
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default Register;
