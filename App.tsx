/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login, { type AuthenticatedUser } from './src/Admin/Auth/Login';
import AdminHome from './src/Admin/Screens/Home';
import OrderDetails from './src/Admin/Screens/OrderDetails';
import Orders from './src/Admin/Screens/Orders';
import Profile from './src/Admin/Screens/Profile';
import Loans from './src/Admin/Screens/Loans';
import Billing from './src/Admin/Screens/Billing';
import Products from './src/Admin/Screens/Products';
import More from './src/Admin/Screens/More';
import AdminLayout from './src/Admin/Navigations/AdminLayout';
import type { AdminRoute } from './src/Admin/Navigations/TopHeader';
import type { TodayOrder } from './src/Admin/Navigations/NotificationDropdown';
import { clearTokenCache } from './src/api';

function App() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [adminRoute, setAdminRoute] = useState<AdminRoute>('home');
  const [selectedOrder, setSelectedOrder] = useState<TodayOrder | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const values = await AsyncStorage.getMany(['userToken', 'authUser']);
        const token = values.userToken;
        const savedUser = values.authUser;

        if (token && savedUser) {
          const parsedUser = JSON.parse(savedUser) as AuthenticatedUser;
          if (typeof parsedUser.role === 'string') {
            setUser(parsedUser);
          } else {
            await AsyncStorage.removeMany(['userToken', 'authUser']);
          }
        }
      } catch {
        Alert.alert(
          'Session error',
          'Your saved login could not be restored. Please sign in again.',
        );
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeMany(['userToken', 'authUser']);
      clearTokenCache();
      setUser(null);
      setAdminRoute('home');
      setSelectedOrder(null);
    } catch {
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: handleLogout },
    ]);
  };

  const navigateAdmin = (route: AdminRoute, order?: TodayOrder) => {
    setAdminRoute(route);
    setSelectedOrder(order ?? null);
  };

  const handleLoginSuccess = (authenticatedUser: AuthenticatedUser) => {
    setUser(authenticatedUser);
    setAdminRoute('home');
  };

  const isAdmin = user?.role.trim().toLowerCase() === 'admin';
  const adminContent = user
    ? adminRoute === 'profile'
      ? <Profile user={user} />
      : adminRoute === 'orders'
        ? <Orders />
        : adminRoute === 'orderDetails'
          ? <OrderDetails order={selectedOrder} />
          : adminRoute === 'loans'
            ? <Loans />
            : adminRoute === 'billing'
              ? <Billing />
              : adminRoute === 'products'
                ? <Products />
                : adminRoute === 'more'
                  ? <More />
                  : <AdminHome user={user} />
    : null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {isRestoringSession ? null : user ? (
        isAdmin ? (
          <AdminLayout
            user={user}
            route={adminRoute}
            onNavigate={navigateAdmin}
            onLogout={confirmLogout}
          >
            {adminContent}
          </AdminLayout>
        ) : (
          <CustomerHome user={user} onLogout={handleLogout} />
        )
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </SafeAreaProvider>
  );
}

type RoleHomeProps = {
  user: AuthenticatedUser;
  onLogout: () => void;
};

function CustomerHome({ user, onLogout }: RoleHomeProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="mb-2 text-2xl font-bold text-primary-dark">
        Sri Golds
      </Text>
      <Text className="mb-8 text-center text-base text-slate-600">
        {user.name ? `Welcome, ${user.name}. ` : ''}
        You are signed in to your account.
      </Text>
      <Pressable
        className="rounded-full bg-primary px-8 py-3"
        onPress={onLogout}
        accessibilityRole="button"
      >
        <Text className="font-semibold text-white">Sign out</Text>
      </Pressable>
    </View>
  );
}

export default App;
