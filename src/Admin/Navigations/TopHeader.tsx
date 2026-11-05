import { useCallback, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthenticatedUser } from '../Auth/Login';
import {
  BellIcon,
  ChevronRightIcon,
  CloseIcon,
  DashboardIcon,
  LogoutIcon,
  MenuIcon,
  OrdersIcon,
  ProfileIcon,
} from './NavIcons';
import NotificationDropdown, {
  type TodayOrder,
} from './NotificationDropdown';
import ProfileDropdown from './ProfileDropdown';

export type AdminRoute =
  | 'home'
  | 'loans'
  | 'billing'
  | 'products'
  | 'more'
  | 'profile'
  | 'orders'
  | 'orderDetails';

type AppHeaderProps = {
  user: AuthenticatedUser;
  currentRoute?: AdminRoute;
  onNavigate: (route: AdminRoute, order?: TodayOrder) => void;
  onLogout: () => void;
  ordersEndpoint?: string;
};

function AppHeader({
  user,
  currentRoute = 'home',
  onNavigate,
  onLogout,
  ordersEndpoint,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [areNotificationsVisible, setAreNotificationsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const displayName = user.name?.trim() || 'Admin';
  const initial = (displayName.charAt(0) || 'A').toUpperCase();

  const updateUnreadCount = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  const navigate = (route: AdminRoute) => {
    setIsDrawerVisible(false);
    setIsProfileVisible(false);
    setAreNotificationsVisible(false);
    onNavigate(route);
  };

  const openProfile = () => {
    setAreNotificationsVisible(false);
    setIsProfileVisible(true);
  };

  const openNotifications = () => {
    setIsProfileVisible(false);
    setAreNotificationsVisible(true);
  };

  return (
    <>
      {/* Main Top Header Bar */}
      <View
        style={{
          shadowColor: '#002F28',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 4,
        }}
        className="z-10 h-16 flex-row items-center justify-between border-b border-slate-200/90 bg-surface px-4"
      >
        {/* Left: Menu & Sri Golds Logo */}
        <View className="flex-row items-center">
          <Pressable
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 active:bg-slate-100"
            onPress={() => setIsDrawerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
          >
            <MenuIcon color="#004D40" accentColor="#D4A017" />
          </Pressable>

          <Pressable
            className="flex-row items-center"
            onPress={() => navigate('home')}
            accessibilityRole="button"
            accessibilityLabel="Go to Sri Golds Dashboard"
          >
            <View className="mr-2.5 h-10 w-10 items-center justify-center rounded-xl border border-amber-200/70 bg-amber-50/70 p-1 shadow-sm">
              <Image
                source={require('../../Images/logo.png')}
                className="h-8 w-8"
                resizeMode="contain"
                accessibilityLabel="Sri Golds logo"
              />
            </View>

            <View>
              <Text className="text-[15px] font-black tracking-wider text-primary-dark">
                SRI GOLDS
              </Text>
              <View className="flex-row items-center">
                <Text className="mr-1 text-[7px] text-accent">◆</Text>
                <Text className="text-[9px] font-extrabold tracking-widest text-accent-dark">
                  JEWELLERS
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Right: Notifications & User Avatar */}
        <View className="flex-row items-center">
          {/* Notifications Button */}
          <Pressable
            className="relative mr-2 h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 active:bg-slate-100"
            onPress={openNotifications}
            accessibilityRole="button"
            accessibilityLabel="Today's order notifications"
          >
            <BellIcon color="#004D40" clapperColor="#D4A017" />
            {unreadCount > 0 ? (
              <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1">
                <Text className="text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {/* User Profile Avatar */}
          <Pressable
            className="relative h-10 w-10 items-center justify-center rounded-xl border-2 border-accent bg-primary shadow-sm active:opacity-90"
            onPress={openProfile}
            accessibilityRole="button"
            accessibilityLabel="Open user profile menu"
          >
            <Text className="text-sm font-bold text-white">{initial}</Text>
            <View className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-success" />
          </Pressable>
        </View>
      </View>

      {/* Navigation Drawer Modal */}
      <Modal
        visible={isDrawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerVisible(false)}
        statusBarTranslucent
      >
        <View className="flex-1 flex-row">
          <Pressable
            className="absolute inset-0 bg-slate-950/40"
            onPress={() => setIsDrawerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
          />

          <View
            style={{
              paddingTop: insets.top + 16,
              shadowColor: '#002F28',
              shadowOffset: { width: 4, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 16,
            }}
            className="h-full w-[82%] max-w-[320px] bg-surface px-5 pb-8 justify-between"
          >
            {/* Top drawer content */}
            <View>
              {/* Drawer Brand Header with Close Button */}
              <View className="mb-6 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 p-1.5 shadow-sm">
                    <Image
                      source={require('../../Images/logo.png')}
                      className="h-9 w-9"
                      resizeMode="contain"
                      accessibilityLabel="Sri Golds logo"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-black tracking-wider text-primary-dark">
                      SRI GOLDS
                    </Text>
                    <Text className="text-[10px] font-bold tracking-widest text-accent-dark uppercase">
                      Admin Console
                    </Text>
                  </View>
                </View>

                <Pressable
                  className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
                  onPress={() => setIsDrawerVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close drawer"
                >
                  <CloseIcon color="#64748B" size={13} />
                </Pressable>
              </View>

              {/* Signed-in user card */}
              <View className="mb-6 flex-row items-center rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg border border-accent bg-primary shadow-xs">
                  <Text className="text-sm font-bold text-white">{initial}</Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-xs font-bold text-slate-800"
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  <View className="mt-0.5 flex-row items-center">
                    <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-success" />
                    <Text className="text-[10px] font-semibold text-primary capitalize">
                      {user.role || 'Admin'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Drawer Menu Title */}
              <Text className="mb-2 px-1 text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">
                Navigation
              </Text>

              {/* Navigation Items */}
              <DrawerItem
                label="Dashboard"
                icon={<DashboardIcon color={currentRoute === 'home' ? '#004D40' : '#64748B'} size={18} />}
                isActive={currentRoute === 'home'}
                onPress={() => navigate('home')}
              />
              <DrawerItem
                label="Orders"
                icon={<OrdersIcon color={currentRoute === 'orders' || currentRoute === 'orderDetails' ? '#004D40' : '#64748B'} size={18} />}
                isActive={currentRoute === 'orders' || currentRoute === 'orderDetails'}
                onPress={() => navigate('orders')}
              />
              <DrawerItem
                label="Profile"
                icon={<ProfileIcon color={currentRoute === 'profile' ? '#004D40' : '#64748B'} size={18} />}
                isActive={currentRoute === 'profile'}
                onPress={() => navigate('profile')}
              />
            </View>

            {/* Bottom Drawer Footer */}
            <View className="pt-4 border-t border-slate-200/80">
              <Pressable
                className="flex-row items-center rounded-xl px-3 py-3 bg-rose-50/70 border border-rose-100 active:bg-rose-100"
                onPress={() => {
                  setIsDrawerVisible(false);
                  onLogout();
                }}
                accessibilityRole="button"
              >
                <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                  <LogoutIcon color="#DC2626" size={16} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-danger">
                    Sign Out
                  </Text>
                  <Text className="text-[10px] text-rose-400">
                    Exit admin account
                  </Text>
                </View>
              </Pressable>

              <Text className="mt-4 text-center text-[10px] font-medium text-slate-400">
                Sri Golds • Jewellers Admin v1.0
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Dropdown */}
      <ProfileDropdown
        visible={isProfileVisible}
        user={user}
        onClose={() => setIsProfileVisible(false)}
        onProfile={() => navigate('profile')}
        onLogout={() => {
          setIsProfileVisible(false);
          onLogout();
        }}
      />

      {/* Notifications Dropdown */}
      <NotificationDropdown
        visible={areNotificationsVisible}
        ordersEndpoint={ordersEndpoint}
        onClose={() => setAreNotificationsVisible(false)}
        onViewAllOrders={() => navigate('orders')}
        onUnreadCountChange={updateUnreadCount}
        onSelectOrder={order => {
          setAreNotificationsVisible(false);
          onNavigate('orderDetails', order);
        }}
      />
    </>
  );
}

function DrawerItem({
  label,
  icon,
  isActive = false,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`mb-2 flex-row items-center justify-between rounded-xl px-3.5 py-3 ${
        isActive
          ? 'bg-primary/10 border-l-4 border-accent'
          : 'bg-transparent active:bg-slate-100'
      }`}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View className="flex-row items-center">
        <View
          className={`mr-3.5 h-9 w-9 items-center justify-center rounded-lg ${
            isActive ? 'bg-primary/15' : 'bg-slate-100'
          }`}
        >
          {icon}
        </View>
        <Text
          className={`text-sm ${
            isActive
              ? 'font-bold text-primary'
              : 'font-semibold text-slate-700'
          }`}
        >
          {label}
        </Text>
      </View>

      <ChevronRightIcon
        color={isActive ? '#004D40' : '#CBD5E1'}
        size={13}
      />
    </Pressable>
  );
}

export default AppHeader;
