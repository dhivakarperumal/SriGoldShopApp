/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login, { type AuthenticatedUser } from './src/Admin/Auth/Login';
import AdminHome from './src/Admin/Screens/Home';
import Profile from './src/Admin/Screens/Profile';
import Loans from './src/Admin/Screens/Loans';
import Billing from './src/Admin/Screens/Billing';
import Products from './src/Admin/Screens/Products';
import CategoriesAll, { type Category } from './src/Admin/Categories/CategoriesAll';
import AddCategories from './src/Admin/Categories/Addcategories';
import MetalType from './src/Admin/Categories/MetalType';
import AllGoldRate, {
  type CurrentRateSet,
} from './src/Admin/DailyGoldRate/AllGoldRate';
import AddGoldrate from './src/Admin/DailyGoldRate/AddGoldrate';
import More from './src/Admin/Screens/More';
import AdminLayout from './src/Admin/Navigations/AdminLayout';
import type { AdminRoute } from './src/Admin/Navigations/TopHeader';
import UserLayout from './src/User/UserLayout';
import { clearTokenCache, setTokenCache } from './src/api';

function App() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [adminRoute, setAdminRoute] = useState<AdminRoute>('home');
  const [newCategoryId, setNewCategoryId] = useState('CAT001');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGoldRateSet, setEditingGoldRateSet] = useState<CurrentRateSet | null>(null);
  const isLoggingOut = useRef(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const values = await AsyncStorage.getMany(['userToken', 'authUser']);
        const token = values.userToken;
        const savedUser = values.authUser;

        if (token) {
          setTokenCache(token);
          let restoredUser: AuthenticatedUser = { role: 'customer' };
          if (savedUser) {
            try {
              const parsedUser: unknown = JSON.parse(savedUser);
              if (
                typeof parsedUser === 'object' &&
                parsedUser !== null &&
                'role' in parsedUser &&
                typeof parsedUser.role === 'string'
              ) {
                restoredUser = {
                  role: parsedUser.role,
                  name:
                    'name' in parsedUser && typeof parsedUser.name === 'string'
                      ? parsedUser.name
                      : undefined,
                  email:
                    'email' in parsedUser && typeof parsedUser.email === 'string'
                      ? parsedUser.email
                      : undefined,
                  phone:
                    'phone' in parsedUser && typeof parsedUser.phone === 'string'
                      ? parsedUser.phone
                      : undefined,
                  mobile:
                    'mobile' in parsedUser && typeof parsedUser.mobile === 'string'
                      ? parsedUser.mobile
                      : undefined,
                  phone_number:
                    'phone_number' in parsedUser && typeof parsedUser.phone_number === 'string'
                      ? parsedUser.phone_number
                      : undefined,
                };
              }
            } catch {
              // Keep the saved token and restore a limited session if user data is malformed.
            }
          }
          setUser(restoredUser);
        }
      } catch {
        Alert.alert(
          'Session error',
          'Your saved session could not be read. Please check your device storage and try again.',
        );
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut.current) {
      return;
    }
    isLoggingOut.current = true;
    try {
      await AsyncStorage.removeMany(['userToken', 'authUser']);
      clearTokenCache();
      setUser(null);
      setAdminRoute('home');
    } catch {
      Alert.alert('Sign out failed', 'Please try again.');
    } finally {
      isLoggingOut.current = false;
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: handleLogout },
    ]);
  };

  const navigateAdmin = (route: AdminRoute) => {
    setAdminRoute(route);
  };

  const handleLoginSuccess = (authenticatedUser: AuthenticatedUser) => {
    setUser(authenticatedUser);
    setAdminRoute('home');
  };

  const isAdmin = user?.role.trim().toLowerCase() === 'admin';
  const adminContent = user
    ? adminRoute === 'profile'
      ? (
        <Profile
          user={user}
          onUserUpdated={setUser}
          onLogout={confirmLogout}
        />
      )
      : adminRoute === 'loans'
        ? <Loans />
        : adminRoute === 'billing'
          ? <Billing />
          : adminRoute === 'products'
            ? <Products onNavigate={navigateAdmin} />
            : adminRoute === 'categories'
              ? (
                <CategoriesAll
                  onBack={() => navigateAdmin('products')}
                  onAddCategory={categoryId => {
                    setEditingCategory(null);
                    setNewCategoryId(categoryId);
                    navigateAdmin('addCategory');
                  }}
                  onEditCategory={category => {
                    setEditingCategory(category);
                    navigateAdmin('editCategory');
                  }}
                />
              )
              : adminRoute === 'addCategory'
                ? (
                  <AddCategories
                    categoryId={newCategoryId}
                    onCancel={() => navigateAdmin('categories')}
                    onSaved={() => navigateAdmin('categories')}
                  />
                )
                : adminRoute === 'editCategory' && editingCategory
                  ? (
                    <AddCategories
                      key={editingCategory.catId}
                      categoryId={editingCategory.catId}
                      category={editingCategory}
                      onCancel={() => navigateAdmin('categories')}
                      onSaved={() => {
                        setEditingCategory(null);
                        navigateAdmin('categories');
                      }}
                    />
                  )
              : adminRoute === 'metalTypes'
                ? <MetalType onBack={() => navigateAdmin('more')} />
                : adminRoute === 'dailyGoldRates'
                  ? (
                    <AllGoldRate
                      onBack={() => navigateAdmin('more')}
                      onAddRate={() => {
                        setEditingGoldRateSet(null);
                        navigateAdmin('addGoldrate');
                      }}
                      onEditRate={rateSet => {
                        setEditingGoldRateSet(rateSet);
                        navigateAdmin('addGoldrate');
                      }}
                    />
                  )
                  : adminRoute === 'addGoldrate'
                    ? (
                      <AddGoldrate
                        key={editingGoldRateSet?.updated_at ?? 'new-rate-set'}
                        initialRateSet={editingGoldRateSet ?? undefined}
                        onCancel={() => {
                          setEditingGoldRateSet(null);
                          navigateAdmin('dailyGoldRates');
                        }}
                        onSaved={() => {
                          setEditingGoldRateSet(null);
                          navigateAdmin('dailyGoldRates');
                        }}
                      />
                    )
                    : adminRoute === 'more'
                      ? <More onNavigate={navigateAdmin} />
                      : <AdminHome user={user} onNavigate={navigateAdmin} />
    : null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {isRestoringSession ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#004D40" />
          <Text className="mt-3 text-sm font-medium text-muted">Restoring your session…</Text>
        </View>
      ) : user ? (
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
          <UserLayout user={user} onLogout={handleLogout} />
        )
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
