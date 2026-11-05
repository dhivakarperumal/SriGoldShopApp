import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
            <View className="z-10 mb-10 w-full self-center">
              <View className="mb-6 items-center">
                <Image
                  source={require('../../Images/logo.png')}
                  className="h-[88px] w-32 self-center"
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
                  Admin Login
                </Text>
              </View>

              <View className="gap-y-3">
                <View>
                  <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700">
                    Username / Email
                  </Text>
                  <View className="h-14 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                    <Text className="mr-4 text-2xl text-slate-800">✉</Text>
                    <TextInput
                      className="flex-1 py-0 text-base text-slate-900"
                      placeholder="Enter your username or email"
                      placeholderTextColor="#64748B"
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      accessibilityLabel="Username or email"
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
                      <Text className="text-xl text-slate-800">
                        {showPassword ? '◉' : '◎'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View className="my-5 flex-row items-center justify-between px-1">
                <Pressable
                  className="flex-row items-center"
                  onPress={() => setRememberMe(!rememberMe)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                >
                  <View className="mr-2.5 h-5 w-5 items-center justify-center rounded border-2 border-primary">
                    {rememberMe ? (
                      <Text className="-mt-1 text-base font-bold text-primary">
                        ✓
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-sm font-medium text-slate-800">
                    Remember me
                  </Text>
                </Pressable>
                <Pressable accessibilityRole="button">
                  <Text className="text-sm font-bold text-primary">
                    Forgot Password?
                  </Text>
                </Pressable>
              </View>

              <Pressable
                className="h-14 flex-row items-center justify-center rounded-full bg-primary px-6 shadow-lg"
                accessibilityRole="button"
              >
                <Text className="mr-3 text-2xl font-semibold text-white">
                  ↪
                </Text>
                <Text className="text-lg font-bold text-white">Login</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default Login;
