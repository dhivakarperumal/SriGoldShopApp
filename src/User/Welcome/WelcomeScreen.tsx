import { useState } from 'react';
import {
  Image,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const WELCOME_SLIDES = [
  {
    icon: 'sparkles-outline',
    eyebrow: 'CRAFTED TO LAST',
    title: 'Find jewellery\nthat feels like you',
    description:
      'Explore thoughtful designs in gold, silver and platinum, made for every special moment.',
  },
  {
    icon: 'trending-up-outline',
    eyebrow: 'RATES AT A GLANCE',
    title: 'Know the value\nbefore you choose',
    description:
      'Check the latest precious metal rates and product details while you explore our collection.',
  },
  {
    icon: 'shield-checkmark-outline',
    eyebrow: 'HERE WHEN YOU NEED US',
    title: 'Jewellery and loans,\nwith trusted care',
    description:
      'Discover gold loan services and connect with our team whenever you need a helping hand.',
  },
] as const;

type WelcomeScreenProps = {
  onComplete: () => void;
  onSignIn: () => void;
};

function WelcomeScreen({ onComplete, onSignIn }: WelcomeScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slide = WELCOME_SLIDES[activeIndex];
  const isLastSlide = activeIndex === WELCOME_SLIDES.length - 1;

  return (
    <View className="flex-1 bg-[#003b2d]">
      <StatusBar barStyle="light-content" />
      <SafeAreaView className="flex-1 px-6 pb-5">
        <View className="flex-row items-center justify-between pt-2">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white p-1.5">
              <Image
                source={require('../../Images/logo.png')}
                className="h-full w-full"
                resizeMode="contain"
                accessibilityLabel="Sri Golds logo"
              />
            </View>
            <View className="ml-3">
              <Text className="text-base font-black tracking-wide text-white">
                SRI GOLDS
              </Text>
              <Text className="mt-0.5 text-[9px] font-bold tracking-[2px] text-[#f2d58a]">
                GOLD · JEWELLERY · LOANS
              </Text>
            </View>
          </View>
          {!isLastSlide ? (
            <Pressable
              className="rounded-full border border-white/20 px-4 py-2"
              onPress={onComplete}
              accessibilityRole="button"
              accessibilityLabel="Skip welcome screens"
            >
              <Text className="text-sm font-semibold text-white/85">Skip</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-1 justify-center">
          <View className="items-center">
            <View className="h-60 w-60 items-center justify-center rounded-full border border-[#d9a441]/50 bg-[#064c3d]">
              <View className="h-44 w-44 items-center justify-center rounded-full border border-[#f2d58a]/40 bg-[#003b2d]">
                <Ionicons name={slide.icon} size={86} color="#f2d58a" />
              </View>
              <View className="absolute right-8 top-8 h-4 w-4 rounded-full bg-[#f2d58a]" />
              <View className="absolute bottom-10 left-5 h-2.5 w-2.5 rounded-full bg-[#d9a441]" />
            </View>
            <View className="mt-10 items-center">
              <Text className="text-xs font-extrabold tracking-[3px] text-[#f2d58a]">
                {slide.eyebrow}
              </Text>
              <Text className="mt-4 text-center text-3xl font-black leading-10 text-white">
                {slide.title}
              </Text>
              <Text className="mt-4 max-w-[320px] text-center text-base leading-7 text-emerald-50/80">
                {slide.description}
              </Text>
            </View>
          </View>
        </View>

        <View>
          <View className="mb-6 flex-row justify-center gap-2">
            {WELCOME_SLIDES.map((item, index) => (
              <View
                key={item.eyebrow}
                className={`h-1.5 rounded-full ${
                  index === activeIndex
                    ? 'w-8 bg-[#f2d58a]'
                    : 'w-1.5 bg-white/35'
                }`}
              />
            ))}
          </View>
          <Pressable
            className="h-14 flex-row items-center justify-center rounded-full bg-[#f2d58a] px-6"
            onPress={() =>
              isLastSlide
                ? onComplete()
                : setActiveIndex(index => index + 1)
            }
            accessibilityRole="button"
          >
            <Text className="text-base font-extrabold text-[#123c2d]">
              {isLastSlide ? 'Explore Sri Golds' : 'Continue'}
            </Text>
            <View className="ml-2">
              <Ionicons name="arrow-forward" size={18} color="#123c2d" />
            </View>
          </Pressable>
          {isLastSlide ? (
            <Pressable
              className="mt-4 items-center py-2"
              onPress={onSignIn}
              accessibilityRole="button"
            >
              <Text className="text-sm font-semibold text-white/80">
                Already have an account?{' '}
                <Text className="font-extrabold text-[#f2d58a]">Sign in</Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default WelcomeScreen;
