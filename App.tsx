/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StatusBar,
  Text,
  View,
} from 'react-native';
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
import Customers from './src/Admin/MorePages/Customer';
import LoanCustomerManagement from './src/Admin/Loanmanegements/LoanCustomerManagement';
import OverdueLoans from './src/Admin/Loanmanegements/OverdueLoans';
import LoanRenewal from './src/Admin/Loanmanegements/LoanRenewal';
import GoldRelease from './src/Admin/Loanmanegements/GoldRelease';
import LoanDetails from './src/Admin/Loanmanegements/LoanDetails';
import StockDetails from './src/Admin/MorePages/StockDetails';
import AllEnquries from './src/Admin/Enquries/AllEnquries';
import FundManagement from './src/Admin/FundManagement/Fundmanegement';
import Receipt from './src/Admin/MorePages/Receipt';
import HomeSections from './src/Admin/MorePages/HomeSections';
import AllReview from './src/Admin/Review/AllReview';
import More from './src/Admin/Screens/More';
import AdminLayout from './src/Admin/Navigations/AdminLayout';
import type { AdminRoute } from './src/Admin/Navigations/TopHeader';
import UserLayout from './src/User/UserLayout';
import { clearTokenCache, setTokenCache } from './src/api';

const ADMIN_BACK_ROUTES: Partial<Record<AdminRoute, AdminRoute>> = {
  profile: 'home',
  loans: 'home',
  billing: 'home',
  products: 'home',
  categories: 'products',
  addCategory: 'categories',
  editCategory: 'categories',
  metalTypes: 'more',
  dailyGoldRates: 'more',
  addGoldrate: 'dailyGoldRates',
  customers: 'more',
  receipt: 'more',
  more: 'home',
};

function App() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [adminRoute, setAdminRoute] = useState<AdminRoute>('home');
  const [newCategoryId, setNewCategoryId] = useState('CAT001');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGoldRateSet, setEditingGoldRateSet] = useState<CurrentRateSet | null>(null);
  const [billingSession, setBillingSession] = useState(0);
  const [isBillingFormOpen, setIsBillingFormOpen] = useState(false);
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(false);
  const [isLoanCustomerCreateRequested, setIsLoanCustomerCreateRequested] = useState(false);
  const [selectedLoanDetailsId, setSelectedLoanDetailsId] = useState<string | number | null>(null);
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
                  user_id:
                    'user_id' in parsedUser &&
                    (typeof parsedUser.user_id === 'string' ||
                      typeof parsedUser.user_id === 'number')
                      ? parsedUser.user_id
                      : undefined,
                  username:
                    'username' in parsedUser &&
                    typeof parsedUser.username === 'string'
                      ? parsedUser.username
                      : undefined,
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
                  address:
                    'address' in parsedUser && typeof parsedUser.address === 'string'
                      ? parsedUser.address
                      : undefined,
                  status:
                    'status' in parsedUser && typeof parsedUser.status === 'string'
                      ? parsedUser.status
                      : undefined,
                  created_at:
                    'created_at' in parsedUser && typeof parsedUser.created_at === 'string'
                      ? parsedUser.created_at
                      : undefined,
                  profile_image:
                    'profile_image' in parsedUser &&
                    (typeof parsedUser.profile_image === 'string' ||
                      parsedUser.profile_image === null)
                      ? parsedUser.profile_image
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
    if (route === 'billing') {
      setBillingSession(current => current + 1);
    }
    setAdminRoute(route);
  };

  const handleLoginSuccess = (authenticatedUser: AuthenticatedUser) => {
    setUser(authenticatedUser);
    setAdminRoute('home');
  };

  const isAdmin = user?.role.trim().toLowerCase() === 'admin';

  useEffect(() => {
    if (!user || !isAdmin) return undefined;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        const backRoute = ADMIN_BACK_ROUTES[adminRoute];
        if (!backRoute) return false;
        setAdminRoute(backRoute);
        return true;
      },
    );

    return () => subscription.remove();
  }, [adminRoute, isAdmin, user]);

  const adminContent = user
    ? adminRoute === 'profile'
      ? (
        <Profile
          user={user}
          onUserUpdated={setUser}
          onLogout={confirmLogout}
          onBack={() => navigateAdmin('home')}
        />
      )
      : adminRoute === 'loans'
        ? (
          <Loans
            onFormVisibilityChange={setIsLoanFormOpen}
            onOpenOverdueLoans={() => navigateAdmin('overdueLoans')}
            onOpenLoanRenewal={() => navigateAdmin('loanRenewal')}
            onOpenGoldRelease={() => navigateAdmin('goldRelease')}
            onOpenCompleteLoan={() => navigateAdmin('completeLoan')}
            onOpenLoanDetails={loanId => {
              setSelectedLoanDetailsId(loanId);
              navigateAdmin('loanDetails');
            }}
            onCreateCustomer={() => {
              setIsLoanCustomerCreateRequested(true);
              navigateAdmin('loanCustomers');
            }}
          />
        )
        : adminRoute === 'overdueLoans'
          ? <OverdueLoans onBack={() => navigateAdmin('loans')} />
        : adminRoute === 'loanRenewal'
          ? <LoanRenewal onBack={() => navigateAdmin('loans')} />
        : adminRoute === 'goldRelease'
          ? <GoldRelease onBack={() => navigateAdmin('loans')} />
        : adminRoute === 'completeLoan'
          ? <GoldRelease completionPage onBack={() => navigateAdmin('loans')} />
        : adminRoute === 'loanDetails' && selectedLoanDetailsId !== null
          ? (
            <LoanDetails
              loanId={selectedLoanDetailsId}
              onBack={() => navigateAdmin('loans')}
              onOpenRenewal={() => navigateAdmin('loanRenewal')}
              onOpenGoldRelease={() => navigateAdmin('goldRelease')}
            />
          )
        : adminRoute === 'billing'
          ? <Billing key={billingSession} onFormVisibilityChange={setIsBillingFormOpen} />
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
                      : adminRoute === 'customers'
                        ? (
                          <Customers
                            onBack={() => navigateAdmin('more')}
                          />
                        )
                        : adminRoute === 'loanCustomers'
                          ? (
                            <LoanCustomerManagement
                              onBack={() => navigateAdmin('more')}
                              openCreateOnMount={isLoanCustomerCreateRequested}
                              onCreateOpened={() => setIsLoanCustomerCreateRequested(false)}
                            />
                          )
                        : adminRoute === 'stockDetails'
                          ? <StockDetails onBack={() => navigateAdmin('more')} />
                        : adminRoute === 'enquiries'
                          ? <AllEnquries onBack={() => navigateAdmin('more')} />
                        : adminRoute === 'fundManagement'
                          ? <FundManagement onBack={() => navigateAdmin('more')} />
                        : adminRoute === 'receipt'
                          ? <Receipt onBack={() => navigateAdmin('more')} />
                          : adminRoute === 'reviews'
                            ? <AllReview onBack={() => navigateAdmin('more')} />
                        : adminRoute === 'homeSections'
                          ? <HomeSections onBack={() => navigateAdmin('more')} />
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
            isBillingFormOpen={isBillingFormOpen}
            isLoanFormOpen={isLoanFormOpen}
            onNavigate={navigateAdmin}
            onLogout={confirmLogout}
          >
            {adminContent}
          </AdminLayout>
        ) : (
          <UserLayout
            user={user}
            onUserUpdated={setUser}
            onLogout={handleLogout}
          />
        )
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
