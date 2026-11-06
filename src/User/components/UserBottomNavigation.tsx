import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type UserTab = 'home' | 'explore' | 'favorites' | 'enquiry' | 'more';

const TABS: { id: UserTab; label: string; path: string }[] = [
  {
    id: 'home',
    label: 'Home',
    path: 'M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-7h6v7',
  },
  {
    id: 'explore',
    label: 'Explore',
    path: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM21 21l-4.35-4.35',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    path: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z',
  },
  {
    id: 'enquiry',
    label: 'Enquiry',
    path: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
  },
  {
    id: 'more',
    label: 'More',
    path: 'M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z',
  },
];

// Height of the pill bar itself (not counting bottom safe area extension)
const PILL_HEIGHT = 72;
// Horizontal margin so the pill floats inside the screen
const PILL_MARGIN_H = 10;

const styles = StyleSheet.create({
  outerWrapper: {
    // Transparent outer wrapper that also covers the bottom safe area
    backgroundColor: '#fffaf0',
  },
  pillWrapper: {
    height: PILL_HEIGHT,
    marginHorizontal: PILL_MARGIN_H,
    overflow: 'hidden',
    borderRadius: 36,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // Small horizontal padding so tabs don't sit on the gold border decoration
    paddingHorizontal: 6,
  },
  activeTabBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  activeIndicator: {
    height: 3,
    width: 20,
    borderRadius: 2,
    backgroundColor: '#F5C45E',
    marginBottom: 2,
  },
});

type UserBottomNavigationProps = {
  activeTab: UserTab;
  onSelect: (tab: UserTab) => void;
};

function UserBottomNavigation({
  activeTab,
  onSelect,
}: UserBottomNavigationProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pillWidth = width - PILL_MARGIN_H * 2;

  return (
    <View
      style={[
        styles.outerWrapper,
        { paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8 },
      ]}
      accessibilityRole="tablist"
    >
      <View style={styles.pillWrapper}>
        {/* Footer background image */}
        <Image
          source={require('../Home/assets/footer.png')}
          style={[styles.bgImage, { width: pillWidth, height: PILL_HEIGHT }]}
          resizeMode="stretch"
          pointerEvents="none"
          accessible={false}
        />

        {/* Tabs row */}
        <View style={styles.tabsRow}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const iconColor = isActive ? '#F5C45E' : '#FFFFFF';

            return (
              <Pressable
                key={tab.id}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => onSelect(tab.id)}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive }}
              >
                {/* Active tab rounded square highlight */}
                <View
                  style={{
                    position: 'relative',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    backgroundColor: isActive
                      ? 'rgba(0, 0, 0, 0.28)'
                      : 'transparent',
                  }}
                >
                  {/* Gold indicator line above icon when active */}
                  {isActive ? (
                    <View style={styles.activeIndicator} />
                  ) : (
                    <View style={{ height: 5 }} />
                  )}

                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Path
                      d={tab.path}
                      stroke={iconColor}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>

                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 10,
                      fontWeight: isActive ? '700' : '500',
                      color: iconColor,
                    }}
                  >
                    {tab.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default UserBottomNavigation;
