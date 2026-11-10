import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { AdminRoute } from './TopHeader';
import AddBotton from '../Componets/AddBotton';

export type MainTabRoute = 'home' | 'products' | 'billing' | 'loans' | 'more';

export const MAIN_TABS: {
  route: MainTabRoute;
  label: string;
  icon: TabIconName | 'add';
}[] = [
  { route: 'home', label: 'Home', icon: 'home' },
  { route: 'loans', label: 'Loans', icon: 'loans' },
  { route: 'billing', label: 'Pulse', icon: 'add' },
  { route: 'products', label: 'Products', icon: 'products' },
  { route: 'more', label: 'More', icon: 'more' },
];

const TOP_OVERHANG = 16;
const BAR_CONTENT_HEIGHT = 58;

type BottomNavigationProps = {
  activeRoute: MainTabRoute;
  onSelect: (route: AdminRoute) => void;
};

function BottomNavigation({ activeRoute, onSelect }: BottomNavigationProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(windowWidth);

  const bottomPadding = Math.max(insets.bottom, 6);
  const W = containerWidth || windowWidth;
  const totalHeight = TOP_OVERHANG + BAR_CONTENT_HEIGHT + bottomPadding;

  const topY = TOP_OVERHANG;
  const cx = W / 2;
  const notchRadius = 40; // half-width of notch
  const notchDepth = 28; // depth of dip

  const pathD = [
    `M 0 ${topY}`,
    `L ${cx - notchRadius} ${topY}`,
    `C ${cx - 22} ${topY}, ${cx - 22} ${topY + notchDepth}, ${cx} ${topY + notchDepth}`,
    `C ${cx + 22} ${topY + notchDepth}, ${cx + 22} ${topY}, ${cx + notchRadius} ${topY}`,
    `L ${W} ${topY}`,
    `L ${W} ${totalHeight}`,
    `L 0 ${totalHeight}`,
    'Z',
  ].join(' ');

  return (
    <View
      style={[styles.container, { height: totalHeight }]}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Curved SVG Background matching the design */}
      <Svg
        width={W}
        height={totalHeight}
        viewBox={`0 0 ${W} ${totalHeight}`}
        style={StyleSheet.absoluteFill}
      >
        <Path d={pathD} fill="#004D40" />
      </Svg>

      {/* Tabs Row */}
      <View
        style={[
          styles.tabsRow,
          {
            paddingTop: topY + 6,
            paddingBottom: bottomPadding,
          },
        ]}
      >
        {MAIN_TABS.map(tab => (
          <TabButton
            key={tab.route}
            {...tab}
            isActive={activeRoute === tab.route}
            onPress={() => onSelect(tab.route)}
          />
        ))}
      </View>
    </View>
  );
}

type TabIconName = 'home' | 'products' | 'loans' | 'more';

type TabButtonProps = {
  route: MainTabRoute;
  label: string;
  icon: TabIconName | 'add';
  isActive: boolean;
  onPress: () => void;
};

function TabButton({ label, icon, isActive, onPress }: TabButtonProps) {
  const isAdd = icon === 'add';
  const scale = useRef(new Animated.Value(isActive ? 1 : 0.9)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? 1 : 0.9,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  }, [isActive, scale]);

  if (isAdd) {
    return (
      <Pressable
        style={styles.addButtonContainer}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Pulse"
        accessibilityState={{ selected: isActive }}
      >
        <View style={styles.activeIndicatorSlot}>
          {isActive ? <View style={styles.activeIndicator} /> : null}
        </View>
        <AddBotton />
        <Text style={[styles.tabLabel, styles.tabLabelActive]}>Pulse</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.tabButton}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.activeIndicatorSlot}>
        {isActive ? <View style={styles.activeIndicator} /> : null}
      </View>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TabIcon name={icon} active={isActive} />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          isActive ? styles.tabLabelActive : styles.tabLabelInactive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TabIcon({ name, active }: { name: TabIconName; active: boolean }) {
  const stroke = active ? '#EDB628' : '#FFFFFF';

  if (name === 'home') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M3 10.5 12 3l9 7.5" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5.5 9.5V21h13V9.5" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 21v-7h6v7" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'loans') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M4 7.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5 7.5V5.8a2 2 0 0 1 2-2h10" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'products') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M4 8h16l-1 13H5L4 8Z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 8V6a3 3 0 0 1 6 0v2" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M2.5 8h19" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'more') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M5 5h4v4H5z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M15 5h4v4h-4z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5 15h4v4H5z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M15 15h4v4h-4z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    overflow: 'visible',
    width: '100%',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicatorSlot: {
    height: 8,
    width: 24,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    height: 4,
    width: 20,
    borderRadius: 2,
    backgroundColor: '#EDB628',
  },
  addButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 10,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: '#EDB628',
  },
  tabLabelInactive: {
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default BottomNavigation;
