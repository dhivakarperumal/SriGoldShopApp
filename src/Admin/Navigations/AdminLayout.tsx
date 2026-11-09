import type { ReactNode } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthenticatedUser } from '../Auth/Login';
import AppHeader, { type AdminRoute } from './TopHeader';
import BottomNavigation, { type MainTabRoute } from './Bottombar';

type AdminLayoutProps = {
  user: AuthenticatedUser;
  currentRoute?: AdminRoute;
  route?: AdminRoute;
  isBillingFormOpen?: boolean;
  isLoanFormOpen?: boolean;
  children: ReactNode;
  onNavigate: (route: AdminRoute) => void;
  onLogout: () => void;
};

function AdminLayout({
  user,
  currentRoute,
  route,
  isBillingFormOpen = false,
  isLoanFormOpen = false,
  children,
  onNavigate,
  onLogout,
}: AdminLayoutProps) {
  const activeRoute = route || currentRoute;
  const bottomNavRoute =
    activeRoute && isMainTab(activeRoute) ? activeRoute : undefined;
  const showBottomNav =
    bottomNavRoute !== undefined &&
    (bottomNavRoute !== 'billing' || !isBillingFormOpen) &&
    (bottomNavRoute !== 'loans' || !isLoanFormOpen);
  const showAppHeader =
    activeRoute !== 'profile' &&
    (activeRoute !== 'billing' || !isBillingFormOpen) &&
    (activeRoute !== 'loans' || !isLoanFormOpen) &&
    activeRoute !== 'categories' &&
    activeRoute !== 'addCategory' &&
    activeRoute !== 'editCategory' &&
    activeRoute !== 'metalTypes' &&
    activeRoute !== 'dailyGoldRates' &&
    activeRoute !== 'addGoldrate' &&
    activeRoute !== 'customers' &&
    activeRoute !== 'loanCustomers' &&
    activeRoute !== 'overdueLoans' &&
    activeRoute !== 'loanRenewal' &&
    activeRoute !== 'stockDetails' &&
    activeRoute !== 'enquiries' &&
    activeRoute !== 'fundManagement' &&
    activeRoute !== 'reviews' &&
    activeRoute !== 'homeSections';

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      {showAppHeader ? (
        <AppHeader
          user={user}
          currentRoute={activeRoute}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      ) : null}
      <SafeAreaView
        className="flex-1 bg-background"
        edges={showBottomNav ? ['left', 'right'] : ['bottom', 'left', 'right']}
      >
        <View className="flex-1">
          {children}
          {showBottomNav && bottomNavRoute ? (
            <BottomNavigation
              activeRoute={bottomNavRoute}
              onSelect={tabRoute => onNavigate(tabRoute)}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function isMainTab(route: AdminRoute): route is MainTabRoute {
  return (
    route === 'home' ||
    route === 'loans' ||
    route === 'billing' ||
    route === 'products' ||
    route === 'more'
  );
}

export default AdminLayout;
