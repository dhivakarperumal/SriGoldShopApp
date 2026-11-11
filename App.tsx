/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StatusBar,
  Text,
  View,
} from 'react-native';
import AppAlertHost, { Alert } from './src/Components/AppAlert';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login, { type AuthenticatedUser } from './src/Admin/Auth/Login';
import Register from './src/Admin/Auth/Register';
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
import Dealers from './src/Admin/MorePages/Dealers';
import AddDealers from './src/Admin/MorePages/AddDealers';
import LoanCustomerManagement from './src/Admin/Loanmanegements/LoanCustomerManagement';
import OverdueLoans from './src/Admin/Loanmanegements/OverdueLoans';
import LoanRenewal from './src/Admin/Loanmanegements/LoanRenewal';
import GoldRelease from './src/Admin/Loanmanegements/GoldRelease';
import LoanDetails from './src/Admin/Loanmanegements/LoanDetails';
import StockDetails from './src/Admin/MorePages/StockDetails';
import AllEnquries from './src/Admin/Enquries/AllEnquries';
import FundManagement from './src/Admin/FundManagement/Fundmanegement';
import Receipt from './src/Admin/MorePages/Receipt';
import Report from './src/Admin/MorePages/Report';
import HomeSections from './src/Admin/MorePages/HomeSections';
import AllReview from './src/Admin/Review/AllReview';
import More from './src/Admin/Screens/More';
import AdminLayout from './src/Admin/Navigations/AdminLayout';
import type { AdminRoute } from './src/Admin/Navigations/TopHeader';
import UserLayout from './src/User/UserLayout';
import WelcomeScreen from './src/User/Welcome/WelcomeScreen';
import { clearTokenCache, setTokenCache } from './src/api';

const ADMIN_BACK_ROUTES: Record<AdminRoute, AdminRoute | null> = {
  home: null,
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
  dealers: 'more',
  addDealer: 'dealers',
  loanCustomers: 'more',
  overdueLoans: 'loans',
  loanRenewal: 'loans',
  goldRelease: 'loans',
  completeLoan: 'loans',
  loanDetails: 'loans',
  stockDetails: 'more',
  enquiries: 'more',
  fundManagement: 'more',
  receipt: 'more',
  reports: 'more',
  homeSections: 'more',
  reviews: 'more',
  more: 'home',
};

function App() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [showWelcomePreview, setShowWelcomePreview] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [shouldShowWelcome, setShouldShowWelcome] = useState(false);
  const [adminRoute, setAdminRoute] = useState<AdminRoute>('home');
  const [adminRouteHistory, setAdminRouteHistory] = useState<AdminRoute[]>([]);
  const [visitedAdminRoutes, setVisitedAdminRoutes] = useState<Set<AdminRoute>>(
    () => new Set(['home']),
  );
  const [newCategoryId, setNewCategoryId] = useState('CAT001');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGoldRateSet, setEditingGoldRateSet] = useState<CurrentRateSet | null>(null);
  const [isBillingFormOpen, setIsBillingFormOpen] = useState(false);
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(false);
  const [isLoanCustomerCreateRequested, setIsLoanCustomerCreateRequested] = useState(false);
  const [selectedLoanDetailsId, setSelectedLoanDetailsId] = useState<string | number | null>(null);
  const isLoggingOut = useRef(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const values = await AsyncStorage.getMany([
          'userToken',
          'authUser',
          'hasSeenWelcome',
        ]);
        const token = values.userToken;
        const savedUser = values.authUser;
        setShouldShowWelcome(values.hasSeenWelcome !== 'true');

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
        setShouldShowWelcome(true);
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
      setAdminRouteHistory([]);
      setVisitedAdminRoutes(new Set(['home']));
      setShowLoginModal(false);
      setAuthScreen('login');
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
    if (route !== adminRoute) {
      setAdminRouteHistory(history => [...history, adminRoute]);
    }
    setVisitedAdminRoutes(current => {
      if (current.has(route)) return current;
      return new Set(current).add(route);
    });
    setAdminRoute(route);
  };

  const goBackAdmin = useCallback(() => {
    const previousRoute = adminRouteHistory[adminRouteHistory.length - 1];
    if (!previousRoute) {
      setAdminRoute(ADMIN_BACK_ROUTES[adminRoute] ?? 'home');
      return;
    }

    setAdminRouteHistory(history => history.slice(0, -1));
    setAdminRoute(previousRoute);
  }, [adminRoute, adminRouteHistory]);

  const handleLoginSuccess = (authenticatedUser: AuthenticatedUser) => {
    setUser(authenticatedUser);
    setAdminRoute('home');
    setAdminRouteHistory([]);
    setVisitedAdminRoutes(new Set(['home']));
  };

  const completeWelcome = async (openLogin = false) => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      setShouldShowWelcome(false);
      if (openLogin) setShowLoginModal(true);
    } catch (error) {
      console.error('Failed to save welcome screen completion:', error);
      Alert.alert(
        'Could not save your preference',
        'Please try again to continue.',
      );
    }
  };

  const isAdmin = (() => {
    const role = typeof user?.role === 'string' ? user.role.trim().toLowerCase() : '';
    return role === 'admin';
  })();

  useEffect(() => {
    if (!user || !isAdmin) return undefined;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (adminRoute === 'loanCustomers') {
          goBackAdmin();
          return true;
        }
        const backRoute = ADMIN_BACK_ROUTES[adminRoute];
        if (!backRoute) {
          Alert.alert('Exit app?', 'Do you want to close Sri Golds?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Exit',
              style: 'destructive',
              onPress: () => BackHandler.exitApp(),
            },
          ]);
          return true;
        }
        setAdminRoute(backRoute);
        return true;
      },
    );

    return () => subscription.remove();
  }, [adminRoute, adminRouteHistory, goBackAdmin, isAdmin, user]);

  const renderAdminScreen = (route: AdminRoute) => {
    if (!user) return null;

    return route === 'profile'
      ? (
        <Profile
          user={user}
          onUserUpdated={setUser}
          onLogout={confirmLogout}
          onBack={() => navigateAdmin('home')}
        />
      )
      : route === 'loans'
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
        : route === 'overdueLoans'
          ? <OverdueLoans onBack={() => navigateAdmin('loans')} />
        : route === 'loanRenewal'
          ? <LoanRenewal onBack={() => navigateAdmin('loans')} />
        : route === 'goldRelease'
          ? <GoldRelease onBack={() => navigateAdmin('loans')} />
        : route === 'completeLoan'
          ? <GoldRelease completionPage onBack={() => navigateAdmin('loans')} />
        : route === 'loanDetails' && selectedLoanDetailsId !== null
          ? (
            <LoanDetails
              loanId={selectedLoanDetailsId}
              onBack={() => navigateAdmin('loans')}
              onOpenRenewal={() => navigateAdmin('loanRenewal')}
              onOpenGoldRelease={() => navigateAdmin('goldRelease')}
            />
          )
        : route === 'billing'
          ? <Billing onFormVisibilityChange={setIsBillingFormOpen} />
          : route === 'products'
            ? <Products onNavigate={navigateAdmin} />
            : route === 'categories'
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
              : route === 'addCategory'
                ? (
                  <AddCategories
                    categoryId={newCategoryId}
                    onCancel={() => navigateAdmin('categories')}
                    onSaved={() => navigateAdmin('categories')}
                  />
                )
                : route === 'editCategory' && editingCategory
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
              : route === 'metalTypes'
                ? <MetalType onBack={() => navigateAdmin('more')} />
                : route === 'dailyGoldRates'
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
                  : route === 'addGoldrate'
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
                    : route === 'more'
                      ? <More onNavigate={navigateAdmin} />
                      : route === 'customers'
                        ? (
                          <Customers
                            onBack={() => navigateAdmin('more')}
                          />
                        )
                      : route === 'dealers'
                        ? (
                          <Dealers
                            onBack={() => navigateAdmin('more')}
                            onAddDealer={() => navigateAdmin('addDealer')}
                          />
                        )
                      : route === 'addDealer'
                        ? (
                          <AddDealers
                            onBack={() => navigateAdmin('dealers')}
                            onCreated={() => navigateAdmin('dealers')}
                          />
                        )
                      : route === 'loanCustomers'
                          ? (
                            <LoanCustomerManagement
                              onBack={goBackAdmin}
                              openCreateOnMount={isLoanCustomerCreateRequested}
                              onCreateOpened={() => setIsLoanCustomerCreateRequested(false)}
                            />
                          )
                        : route === 'stockDetails'
                          ? <StockDetails onBack={() => navigateAdmin('more')} />
                        : route === 'enquiries'
                          ? <AllEnquries onBack={() => navigateAdmin('more')} />
                        : route === 'fundManagement'
                          ? <FundManagement onBack={() => navigateAdmin('more')} />
                        : route === 'receipt'
                          ? <Receipt onBack={() => navigateAdmin('more')} />
                          : route === 'reports'
                            ? <Report onBack={() => navigateAdmin('more')} />
                          : route === 'reviews'
                            ? <AllReview onBack={() => navigateAdmin('more')} />
                        : route === 'homeSections'
                          ? <HomeSections onBack={() => navigateAdmin('more')} />
                    : <AdminHome
                        user={user}
                        onNavigate={navigateAdmin}
                        isActive={adminRoute === 'home'}
                      />
  };

  const adminContent = user ? (
    <View className="flex-1">
      {[...visitedAdminRoutes].map(route => (
        <View
          key={route}
          className={adminRoute === route ? 'flex-1' : 'hidden'}
        >
          {renderAdminScreen(route)}
        </View>
      ))}
    </View>
  ) : null;

  return (
    <SafeAreaProvider>
      <AppAlertHost />
      <StatusBar barStyle="dark-content" />
      {isRestoringSession ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#004D40" />
          <Text className="mt-3 text-sm font-medium text-muted">Restoring your session...</Text>
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
            onShowLogin={() => {
              setAuthScreen('login');
              setShowLoginModal(true);
            }}
          />
        )
      ) : shouldShowWelcome ? (
        <WelcomeScreen
          onComplete={() => completeWelcome()}
          onHome={() => completeWelcome()}
        />
      ) : showLoginModal && showWelcomePreview ? (
        <WelcomeScreen
          onComplete={() => setShowWelcomePreview(false)}
          onHome={() => {
            setShowWelcomePreview(false);
            setShowLoginModal(false);
          }}
        />
      ) : showLoginModal && authScreen === 'register' ? (
        <Register
          onLogin={() => setAuthScreen('login')}
          onCancel={() => {
            setAuthScreen('login');
            setShowLoginModal(false);
          }}
        />
      ) : showLoginModal ? (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => setShowLoginModal(false)}
          onRegister={() => setAuthScreen('register')}
        />
      ) : (
        <UserLayout
          user={null}
          onUserUpdated={setUser}
          onLogout={handleLogout}
          onShowLogin={() => {
            setAuthScreen('login');
            setShowLoginModal(true);
          }}
        />
      )}
    </SafeAreaProvider>
  );
}

export default App;
