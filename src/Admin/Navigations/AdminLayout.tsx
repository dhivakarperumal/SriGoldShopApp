import type { ReactNode } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthenticatedUser } from '../Auth/Login';
import AppHeader, { type AdminRoute } from './TopHeader';
import BottomNavigation, { type MainTabRoute } from './Bottombar';
import type { TodayOrder } from './NotificationDropdown';

type AdminLayoutProps = {
  user: AuthenticatedUser;
  currentRoute?: AdminRoute;
  route?: AdminRoute;
  children: ReactNode;
  onNavigate: (route: AdminRoute, order?: TodayOrder) => void;
  onLogout: () => void;
  ordersEndpoint?: string;
};

function AdminLayout({
  user,
  currentRoute,
  route,
  children,
  onNavigate,
  onLogout,
  ordersEndpoint,
}: AdminLayoutProps) {
  const activeRoute = route || currentRoute;

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <AppHeader
        user={user}
        currentRoute={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
        ordersEndpoint={ordersEndpoint}
      />
      <SafeAreaView
        className="flex-1 bg-surface"
        edges={['bottom', 'left', 'right']}
      >
        <View className="flex-1">
          {children}
          {activeRoute && isMainTab(activeRoute) ? (
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
