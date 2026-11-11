import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Keyboard,
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
  onCancel?: () => void;
};

type ScrollViewHandle = {
  scrollToEnd: (options?: { animated?: boolean }) => void;
};

type PreciousRate = {
  metal_type: string;
  purity: string;
  rate_per_gram?: number | string;
  rate_per_unit?: number | string;
  rate_unit?: string;
};

type PreciousRateSet = {
  rates: PreciousRate[];
  rate_date?: string;
  effective_from?: string;
};

const RATE_METALS = ['Gold', 'Silver', 'Platinum', 'Diamond'];
const GOLD_PURITY_LABELS: Record<string, string> = {
  '999': '24K (999)',
  '24K': '24K (999)',
  '916': '22K (916)',
  '22K': '22K (916)',
  '833': '20K (833)',
  '20K': '20K (833)',
  '750': '18K (750)',
  '18K': '18K (750)',
  '585': '14K (585)',
  '14K': '14K (585)',
};
const GOLD_PURITY_ORDER = ['585', '750', '833', '916', '999'];

const formatRateDate = (value?: string) => {
  if (!value) return 'Today';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const formatRateAmount = (value?: number | string) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';
};

function PreciousRatesSnapshot() {
  const [rateSet, setRateSet] = useState<PreciousRateSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError('');

    const fetchRates = async () => {
      try {
        const { data } = await api.get<PreciousRateSet>('/gold-rates/current');
        if (!Array.isArray(data?.rates)) {
          throw new Error('The server returned an invalid rate set.');
        }
        if (isMounted) {
          setRateSet({
            ...data,
            rates: data.rates.filter(
              rate =>
                typeof rate?.metal_type === 'string' &&
                typeof rate?.purity === 'string',
            ),
          });
        }
      } catch (error) {
        console.error('Error fetching precious metal rates:', error);
        if (isMounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Could not load precious metal rates.',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRates();
    return () => {
      isMounted = false;
    };
  }, [reloadVersion]);

  return (
    <View className="mt-8 rounded-3xl border border-[#d6b66e] bg-[#003b2d] p-3">
      <View className="mb-3 flex-row items-center">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-950">
          <Ionicons name="diamond-outline" size={27} color="#f2d58a" />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#f2d58a]">
            Daily market snapshot
          </Text>
          <Text className="mt-0.5 text-lg font-extrabold text-white">
            Sri Golds Precious Rates
          </Text>
          <View className="mt-1 flex-row items-center">
            <Ionicons name="calendar-outline" size={13} color="#f2d58a" />
            <Text className="ml-1 text-xs text-emerald-50">
              Effective {formatRateDate(rateSet?.rate_date ?? rateSet?.effective_from)}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View className="items-center rounded-2xl bg-[#fff9e9] py-6">
          <ActivityIndicator color="#004D40" />
          <Text className="mt-2 text-sm text-slate-600">Loading today&apos;s rates...</Text>
        </View>
      ) : loadError ? (
        <View className="rounded-2xl bg-[#fff9e9] px-4 py-5">
          <Text className="text-center text-sm font-semibold text-red-700">
            {loadError}
          </Text>
          <Pressable
            className="mt-3 self-center rounded-lg bg-[#004533] px-4 py-2"
            onPress={() => setReloadVersion(version => version + 1)}
            accessibilityRole="button"
          >
            <Text className="text-xs font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : rateSet?.rates.length ? (
        <View className="gap-2.5">
          {RATE_METALS.map(metal => {
            const rates = rateSet.rates
              .filter(
                rate => rate.metal_type.toLowerCase() === metal.toLowerCase(),
              )
              .sort((first, second) => {
                if (metal !== 'Gold') return 0;
                const normalize = (purity: string) =>
                  purity
                    .trim()
                    .toUpperCase()
                    .replace(/\s+/g, '')
                    .replace('14K', '585')
                    .replace('18K', '750')
                    .replace('20K', '833')
                    .replace('22K', '916')
                    .replace('24K', '999');
                return (
                  GOLD_PURITY_ORDER.indexOf(normalize(first.purity)) -
                  GOLD_PURITY_ORDER.indexOf(normalize(second.purity))
                );
              });
            if (!rates.length) return null;

            return (
              <View
                key={metal}
                className="rounded-2xl border border-[#f0dfb8] bg-[#fff9e9] p-2.5"
              >
                <Text className="mb-2 ml-1 text-lg font-extrabold text-[#123c2d]">
                  {metal}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-1.5"
                >
                  {rates.map(rate => {
                    const goldPurity = rate.purity
                      .trim()
                      .toUpperCase()
                      .replace(/\s+/g, '');
                    const label =
                      metal === 'Gold'
                        ? GOLD_PURITY_LABELS[goldPurity] ?? rate.purity
                        : rate.purity;
                    const unit = rate.rate_unit?.toLowerCase();

                    return (
                      <View
                        key={`${rate.metal_type}-${rate.purity}-${rate.rate_unit ?? ''}`}
                        className="min-w-[112px] items-center justify-center rounded-xl border border-[#d9a441] bg-[#004533] px-2 py-2.5"
                      >
                        <Text
                          className="text-center text-xs font-bold text-white"
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                        <Text className="mt-1 text-sm font-extrabold text-white">
                          {formatRateAmount(rate.rate_per_unit ?? rate.rate_per_gram)}
                        </Text>
                        <Text className="text-[10px] font-semibold text-emerald-50">
                          /{unit === 'carat' || unit === 'ct' ? 'ct' : 'g'}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })}
        </View>
      ) : (
        <View className="rounded-2xl bg-[#fff9e9] px-4 py-5">
          <Text className="text-center text-sm font-semibold text-[#123c2d]">
            No precious metal rates are configured yet.
          </Text>
        </View>
      )}
    </View>
  );
}

function Login({ onLoginSuccess, onCancel }: LoginProps) {
  const scrollViewRef = useRef<ScrollViewHandle | null>(null);
  const isPasswordFocused = useRef(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      if (isPasswordFocused.current) {
        requestAnimationFrame(() =>
          scrollViewRef.current?.scrollToEnd({ animated: true }),
        );
      }
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      isPasswordFocused.current = false;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
            ref={scrollViewRef as any}
            className="flex-1"
            contentContainerClassName={
              keyboardVisible
              ? 'grow justify-start px-6 pt-2'
                : 'grow justify-start px-6 pt-[90px] pb-0'
            }
            onContentSizeChange={() => {
              if (keyboardVisible && isPasswordFocused.current) {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }
            }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            nestedScrollEnabled
          >
            <View className="z-10 w-full self-center">
              <View
                className={`items-center ${keyboardVisible ? 'mb-3' : 'mb-4'}`}
              >
                <Image
                  source={require('../../Images/logo.png')}
                  className={`self-center ${
                    keyboardVisible ? 'h-16 w-48' : 'mb-2 h-20 w-52'
                  }`}
                  resizeMode="contain"
                  accessibilityLabel="Sri Golds"
                />
                {!keyboardVisible ? (
                  <View className="-mt-2 flex-row items-center">
                    <View className="mr-2 h-0.5 w-6 bg-accent" />
                    <Text className="text-sm font-medium text-slate-800">
                      Gold · Jewellery · Loans
                    </Text>
                    <View className="ml-2 h-0.5 w-6 bg-accent" />
                  </View>
                ) : null}
                <Text
                  className={`text-2xl font-bold text-slate-950 ${
                    keyboardVisible ? 'mt-2' : 'mt-3'
                  }`}
                >
                  Login
                </Text>
              </View>

              <View className={keyboardVisible ? 'gap-y-2' : 'gap-y-3'}>
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
                      onFocus={() => {
                        isPasswordFocused.current = true;
                        if (keyboardVisible) {
                          requestAnimationFrame(() =>
                            scrollViewRef.current?.scrollToEnd({
                              animated: true,
                            }),
                          );
                        }
                      }}
                      onBlur={() => {
                        isPasswordFocused.current = false;
                      }}
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

              <View
                className={`flex-row items-center justify-between px-1 ${
                  keyboardVisible ? 'my-3' : 'my-4'
                }`}
              >
                <View className="flex-row items-center">
                  <View className="mr-2.5 h-5 w-5 items-center justify-center rounded border-2 border-primary bg-primary/10">
                    <Ionicons name="checkmark" size={14} color="#004D40" />
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
                    <Ionicons
                      name="log-in-outline"
                      size={22}
                      color="#FFFFFF"
                      style={{ marginRight: 12 }}
                    />
                    <Text className="text-lg font-bold text-white">Login</Text>
                  </>
                )}
              </Pressable>
              {onCancel ? (
                <>
                  <View className="mt-4 flex-row items-center gap-3">
                    <View className="h-px flex-1 bg-slate-200" />
                    <Text className="text-xs font-medium text-slate-400">or</Text>
                    <View className="h-px flex-1 bg-slate-200" />
                  </View>
                  <Pressable
                    className="mt-3 h-14 flex-row items-center justify-center rounded-full border-2 border-primary/30 bg-white/80 shadow-sm active:bg-primary/5"
                    onPress={onCancel}
                    accessibilityRole="button"
                    accessibilityLabel="Go to Home"
                  >
                    <Ionicons name="home-outline" size={18} color="#004D40" />
                    <Text className="ml-2 text-sm font-bold text-primary">
                      Go to Home
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
            {!keyboardVisible ? <PreciousRatesSnapshot /> : null}
            {keyboardVisible ? <View className="h-32" /> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default Login;
