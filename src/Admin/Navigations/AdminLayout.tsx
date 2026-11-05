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
  children: ReactNode;
  onNavigate: (route: AdminRoute) => void;
  onLogout: () => void;
};

function AdminLayout({
  user,
  currentRoute,
  route,
  children,
  onNavigate,
  onLogout,
}: AdminLayoutProps) {
  const activeRoute = route || currentRoute;
  const showBottomNav = activeRoute ? isMainTab(activeRoute) : false;
  const showAppHeader =
    activeRoute !== 'categories' &&
    activeRoute !== 'addCategory' &&
    activeRoute !== 'editCategory' &&
    activeRoute !== 'metalTypes' &&
    activeRoute !== 'dailyGoldRates' &&
    activeRoute !== 'addGoldrate';

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
          {showBottomNav && activeRoute && isMainTab(activeRoute) ? (
            <BottomNavigation
              activeRoute={activeRoute}
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
