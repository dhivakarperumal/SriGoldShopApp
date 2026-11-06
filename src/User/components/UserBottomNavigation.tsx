import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type UserTab = 'home' | 'explore' | 'enquiry' | 'more';

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

type UserBottomNavigationProps = {
  activeTab: UserTab;
  onSelect: (tab: UserTab) => void;
};

function UserBottomNavigation({
  activeTab,
  onSelect,
}: UserBottomNavigationProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);

  return (
    <View
      className="flex-row border-t border-[#d9b568]/40 bg-primary"
      style={{ height: 62 + bottomPadding, paddingBottom: bottomPadding }}
      accessibilityRole="tablist"
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        const color = isActive ? '#F5C45E' : '#A8C9C1';

        return (
          <Pressable
            key={tab.id}
            className="flex-1 items-center justify-center pt-1"
            onPress={() => onSelect(tab.id)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <View className="mb-1 h-1 w-6 items-center justify-center">
              {isActive ? (
                <View className="h-1 w-5 rounded-full bg-accent-light" />
              ) : null}
            </View>
            <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
              <Path
                d={tab.path}
                stroke={color}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text
              className={`mt-1 text-[10px] ${
                isActive
                  ? 'font-bold text-accent-light'
                  : 'font-medium text-[#A8C9C1]'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default UserBottomNavigation;
