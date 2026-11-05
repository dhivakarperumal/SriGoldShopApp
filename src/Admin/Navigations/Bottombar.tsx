import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { AdminRoute } from './TopHeader';

const colors: typeof import('../../theme/colors') = require('../../theme/colors');

export type MainTabRoute = 'home' | 'loans' | 'billing' | 'products' | 'more';

type BottomNavigationProps = {
  activeRoute: MainTabRoute;
  onSelect: (route: AdminRoute) => void;
};

const tabs: { route: MainTabRoute; label: string; icon: TabIconName }[] = [
  { route: 'home', label: 'Home', icon: 'home' },
  { route: 'loans', label: 'Loans', icon: 'loans' },
  { route: 'billing', label: 'Pulse', icon: 'pulse' },
  { route: 'products', label: 'Products', icon: 'products' },
  { route: 'more', label: 'More', icon: 'more' },
];

function BottomNavigation({ activeRoute, onSelect }: BottomNavigationProps) {
  return (
    <View className="h-[68px] flex-row border-t border-navigation-border bg-surface shadow-lg">
      {tabs.map(tab => (
        <TabButton
          key={tab.route}
          {...tab}
          isActive={activeRoute === tab.route}
          onPress={() => onSelect(tab.route)}
        />
      ))}
    </View>
  );
}

type TabIconName = 'home' | 'loans' | 'pulse' | 'products' | 'more';

type TabButtonProps = {
  route: MainTabRoute;
  label: string;
  icon: TabIconName;
  isActive: boolean;
  onPress: () => void;
};

function TabButton({ label, icon, isActive, onPress }: TabButtonProps) {
  const scale = useRef(new Animated.Value(isActive ? 1 : 0.9)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? 1 : 0.9,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  }, [isActive, scale]);

  return (
    <Pressable
      className="flex-1 items-center pt-1"
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
    >
      <View className="mb-1 h-1 w-6 items-center justify-center">
        {isActive ? (
          <View className="h-1 w-5 rounded-full bg-navigation-active" />
        ) : null}
      </View>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TabIcon name={icon} active={isActive} />
      </Animated.View>
      <Text
        className={`mt-1 text-[10px] ${
          isActive
            ? 'font-semibold text-navigation-active'
            : 'font-medium text-navigation-inactive'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TabIcon({ name, active }: { name: TabIconName; active: boolean }) {
  const stroke = active
    ? colors.navigation.active
    : colors.navigation.inactive;

  const paths: Record<TabIconName, string[]> = {
    home: [
      'M3 10.5 12 3l9 7.5',
      'M5.5 9.5V21h13V9.5',
      'M9 21v-7h6v7',
    ],
    loans: [
      'M4 7.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z',
      'M16 12h5v4h-5a2 2 0 0 1 0-4Z',
      'M5 7.5V5.8a2 2 0 0 1 2-2h10',
    ],
    pulse: ['M3 12h4l3-7 4 14 3-7h4'],
    products: [
      'M4 8h16l-1 13H5L4 8Z',
      'M9 8V6a3 3 0 0 1 6 0v2',
      'M2.5 8h19',
    ],
    more: [
      'M5 5h4v4H5z',
      'M15 5h4v4h-4z',
      'M5 15h4v4H5z',
      'M15 15h4v4h-4z',
    ],
  };

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {paths[name].map(path => (
        <Path
          key={path}
          d={path}
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export default BottomNavigation;