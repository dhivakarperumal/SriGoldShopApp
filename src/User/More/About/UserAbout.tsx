import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type UserAboutProps = {
  onBack: () => void;
};

const VALUES = [
  {
    number: '01',
    title: 'Quality You Can Trust',
    description:
      'Clear product details and a quality-first approach help you shop with confidence.',
  },
  {
    number: '02',
    title: 'Beautiful Craftsmanship',
    description:
      'Explore timeless designs that bring traditional inspiration and modern elegance together.',
  },
  {
    number: '03',
    title: 'Personal Attention',
    description:
      'Find jewellery suited to your style, preferences, and meaningful occasions.',
  },
  {
    number: '04',
    title: 'For Every Occasion',
    description:
      'Discover pieces for everyday wear, celebrations, gifting, and special milestones.',
  },
];

const JOURNEY = [
  {
    label: 'Since 1984',
    title: 'The Beginning',
    description:
      'Sri Golds began its journey with a commitment to jewellery, personal service, and customer trust.',
  },
  {
    label: 'Growing Together',
    title: 'Expanding Our Collections',
    description:
      'Jewellery inspired by tradition and contemporary style, for everyday wear and special occasions.',
  },
  {
    label: 'A Lasting Promise',
    title: 'Building Customer Trust',
    description:
      'We focus on quality, thoughtful service, and helping customers find jewellery for life’s meaningful moments.',
  },
  {
    label: 'Looking Ahead',
    title: 'Our Future Journey',
    description:
      'We look forward to celebrating every generation with beautiful collections and a warm, personal experience.',
  },
];

function UserAbout({ onBack }: UserAboutProps) {
  return (
    <View className="flex-1 bg-[#fffaf0]">
      <View className="flex-row items-center bg-[#003B2D] px-4 py-3">
        <Pressable
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/15"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Text className="text-2xl leading-7 text-white">‹</Text>
        </Pressable>
        <Text className="text-lg font-bold text-white">About Us</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="m-4 overflow-hidden rounded-3xl bg-[#00382a] p-5">
          <View className="mb-4 h-11 w-11 items-center justify-center rounded-xl border border-[#e9c66d]/50 bg-white/10">
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"
                stroke="#f2d58a"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text className="text-[11px] font-bold uppercase tracking-[2px] text-[#f2d58a]">
            About Sri Golds
          </Text>
          <Text className="mt-2 text-2xl font-bold leading-8 text-white">
            Crafting Brighter Moments
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/90">
            Sri Golds is a trusted jewellery brand offering gold, diamond, and
            silver jewellery for every occasion. Thoughtful designs and a
            tradition of craftsmanship help you find pieces worth treasuring.
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/90">
            From everyday favourites to life’s biggest celebrations, discover
            jewellery chosen with care and a personal touch.
          </Text>
          <View className="mt-5 flex-row flex-wrap gap-2">
            {['Since 1984', 'Exquisite Designs', 'Quality Focused'].map(
              value => (
                <View
                  key={value}
                  className="rounded-full border border-[#f2d58a]/40 bg-white/10 px-3 py-2"
                >
                  <Text className="text-xs font-semibold text-[#f2d58a]">
                    {value}
                  </Text>
                </View>
              ),
            )}
          </View>
        </View>

        <View className="px-4">
          <Text className="text-xl font-bold text-primary-dark">
            Why Choose Sri Golds?
          </Text>
          <Text className="mt-1 text-sm leading-5 text-slate-600">
            More than jewellery, we offer thoughtful designs and a personal
            experience for life’s special moments.
          </Text>
          <View className="mt-4 gap-3">
            {VALUES.map(value => (
              <View
                key={value.number}
                className="rounded-2xl border border-[#eadcc0] bg-white p-4"
              >
                <View className="flex-row items-center">
                  <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-[#fff4d9]">
                    <Text className="text-xs font-bold text-[#a87418]">
                      {value.number}
                    </Text>
                  </View>
                  <Text className="flex-1 text-base font-bold text-primary-dark">
                    {value.title}
                  </Text>
                </View>
                <Text className="mt-3 text-sm leading-5 text-slate-600">
                  {value.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mx-4 mt-6 rounded-2xl bg-[#fff2d3] p-4">
          <Text className="text-[11px] font-bold uppercase tracking-[2px] text-[#ae7617]">
            The Sri Golds Journey
          </Text>
          <Text className="mt-1 text-2xl font-bold text-primary-dark">
            Our History
          </Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">
            A journey shaped by tradition, meaningful moments, and a commitment
            to bringing beautiful jewellery into your life.
          </Text>
          <View className="mt-4 gap-4">
            {JOURNEY.map((moment, index) => (
              <View key={moment.title} className="flex-row">
                <View className="mr-3 items-center">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
                    <Text className="text-[10px] font-bold text-white">
                      {index + 1}
                    </Text>
                  </View>
                  {index < JOURNEY.length - 1 ? (
                    <View className="mt-1 w-px flex-1 bg-[#d6a63c]" />
                  ) : null}
                </View>
                <View className="flex-1 pb-2">
                  <Text className="text-xs font-bold uppercase tracking-wide text-[#ae7617]">
                    {moment.label}
                  </Text>
                  <Text className="mt-1 text-base font-bold text-primary-dark">
                    {moment.title}
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-slate-600">
                    {moment.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default UserAbout;
