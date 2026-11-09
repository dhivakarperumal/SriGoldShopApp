import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
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
import api, { setTokenCache } from '../../api';

export type AuthenticatedUser = {
  role: string;
  user_id?: string | number;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  phone_number?: string;
  address?: string;
  status?: string;
  created_at?: string;
  profile_image?: string | null;
};

type LoginProps = {
  onLoginSuccess: (user: AuthenticatedUser) => void;
};

function Login({ onLoginSuccess }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setErrorMessage('Enter your username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await api.post('/auth/login', {
        identifier: trimmedIdentifier,
        password,
      });
      const user = response.data?.user as AuthenticatedUser | undefined;
      const token = response.data?.token as string | undefined;

      if (!user || typeof user.role !== 'string' || !token) {
        throw new Error('The server returned an invalid login response.');
      }

      await AsyncStorage.setMany({
        userToken: token,
        authUser: JSON.stringify(user),
      });
      setTokenCache(token);
      onLoginSuccess(user);
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Login failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Image
        source={require('../../Images/login.png')}
        className="absolute inset-0 h-full w-full"
        resizeMode="stretch"
        accessible={false}
      />
      <SafeAreaView className="flex-1 bg-transparent">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="grow justify-center px-6 py-8"
            keyboardShouldPersistTaps="handled"
          >
            <View className="z-10 mb-[100px] w-full self-center">
              <View className="mb-6 items-center">
                <Image
                  source={require('../../Images/logo.png')}
                  className="h-[100px] w-60 self-center mb-2"
                  resizeMode="contain"
                  accessibilityLabel="Sri Golds"
                />
                <View className="-mt-2 flex-row items-center">
                  <View className="mr-2 h-0.5 w-6 bg-accent" />
                  <Text className="text-sm font-medium text-slate-800">
                    Gold · Jewellery · Loans
                  </Text>
                  <View className="ml-2 h-0.5 w-6 bg-accent" />
                </View>
                <Text className="mt-5 text-2xl font-bold text-slate-950">
                 Login
                </Text>
              </View>

              <View className="gap-y-3">
                <View>
                  <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700">
                    Username
                  </Text>
                  <View className="h-14 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                    <View className="mr-4">
                      <Ionicons
                        name="mail-outline"
                        size={22}
                        color="#1e293b"
                      />
                    </View>
                    <TextInput
                      className="flex-1 py-0 text-base text-slate-900"
                      placeholder="Enter your username or email"
                      placeholderTextColor="#64748B"
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      accessibilityLabel="Username or email or mobile number"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View>
                  <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700">
                    Password
                  </Text>
                  <View className="h-14 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                    <View className="mr-4 items-center">
                      <View className="h-2.5 w-3 rounded-t-full border-x-2 border-t-2 border-slate-800" />
                      <View className="h-3.5 w-5 items-center justify-center rounded-sm border-2 border-slate-800">
                        <View className="h-1 w-1 rounded-full bg-slate-800" />
                      </View>
                    </View>
                    <TextInput
                      className="flex-1 py-0 text-base text-slate-900"
                      placeholder="Enter your password"
                      placeholderTextColor="#64748B"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      accessibilityLabel="Password"
                      returnKeyType="done"
                    />
                    <Pressable
                      className="ml-3 min-w-8 items-center"
                      onPress={() => setShowPassword(!showPassword)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#1e293b"
                      />
                    </Pressable>
                  </View>
                </View>
              </View>

              <View className="my-5 flex-row items-center justify-between px-1">
                <View className="flex-row items-center">
                  <View className="mr-2.5 h-5 w-5 items-center justify-center rounded border-2 border-primary bg-primary/10">
                    <Text className="-mt-1 text-base font-bold text-primary">✓</Text>
                  </View>
                  <Text className="text-sm font-medium text-slate-800">
                    Stay signed in
                  </Text>
                </View>
                <Pressable accessibilityRole="button">
                  <Text className="text-sm font-bold text-primary">
                    Forgot Password?
                  </Text>
                </Pressable>
              </View>

              {errorMessage ? (
                <Text
                  className="mb-3 text-center text-sm text-red-600"
                  accessibilityRole="alert"
                >
                  {errorMessage}
                </Text>
              ) : null}

              <Pressable
                className={`h-14 flex-row items-center justify-center rounded-full bg-primary px-6 shadow-lg ${
                  isLoading ? 'opacity-70' : ''
                }`}
                onPress={handleLogin}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text className="mr-3 text-2xl font-semibold text-white">
                      ↪
                    </Text>
                    <Text className="text-lg font-bold text-white">Login</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default Login;
