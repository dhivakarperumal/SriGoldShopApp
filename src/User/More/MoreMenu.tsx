import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export type MorePage = 'about' | 'contact' | 'privacy' | 'profile' | null;

type MoreMenuProps = {
  onSelect: (page: MorePage) => void;
};

const MORE_ITEMS: {
  id: Exclude<MorePage, null>;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: 'profile',
    title: 'My Profile',
    description: 'View your account details and gold loan information.',
    icon: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description: 'Learn how we collect, use, and protect your information.',
    icon: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4',
  },
  {
    id: 'about',
    title: 'About Us',
    description: 'Our story, heritage, and what makes Sri Golds special.',
    icon: 'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  {
    id: 'contact',
    title: 'Contact Us',
    description: 'Call, message, or find our Tirupattur showroom.',
    icon: 'M21 10.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.5 8.5 0 0 1 8.5 8.5Z',
  },
];

function MoreMenu({ onSelect }: MoreMenuProps) {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="gap-4 mt-4 px-4 py-6"
      showsVerticalScrollIndicator={false}
    >
      {/* <View className="mb-1">
        <Text className="text-2xl font-bold text-[#003b2d]">More</Text>
        <Text className="mt-1 text-sm leading-5 text-slate-600">
          Get to know Sri Golds or reach our team.
        </Text>
      </View> */}
      {MORE_ITEMS.map(item => (
        <Pressable
          key={item.id}
          className="min-h-24 flex-row items-center rounded-2xl border border-[#e7e0d5] bg-white p-4 active:bg-[#f2f7f4]"
          onPress={() => onSelect(item.id)}
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-[#edf5f1]">
            <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
              <Path
                d={item.icon}
                stroke="#08796a"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-primary-dark">
              {item.title}
            </Text>
            <Text className="mt-1 text-xs leading-5 text-slate-600">
              {item.description}
            </Text>
          </View>
          <Text className="ml-3 text-xl font-semibold text-[#08796a]">›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export default MoreMenu;
