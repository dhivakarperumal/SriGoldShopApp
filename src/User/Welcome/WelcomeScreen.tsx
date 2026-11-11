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
  const isFirstSlide = activeIndex === 0;
  const textColor = isFirstSlide ? 'text-[#073b2f]' : 'text-white';

  return (
    <View className={`flex-1 ${isFirstSlide ? 'bg-[#fffaf3]' : 'bg-[#003b2d]'}`}>
      <StatusBar barStyle={isFirstSlide ? 'dark-content' : 'light-content'} />
      <SafeAreaView className="flex-1 px-6 pb-5">
        <View className="flex-row items-center justify-between pt-2">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl border border-[#d6c8ad] bg-white p-1.5">
              <Image
                source={require('../../Images/logo.png')}
                className="h-full w-full"
                resizeMode="contain"
                accessibilityLabel="Sri Golds logo"
              />
            </View>
            <View className="ml-3">
              <Text className={`text-base font-black tracking-wide ${textColor}`}>
                SRI GOLDS
              </Text>
              <Text className="mt-0.5 text-[9px] font-bold tracking-[2px] text-[#b77a17]">
                GOLD · JEWELLERY · LOANS
              </Text>
            </View>
          </View>
          {!isLastSlide ? (
            <Pressable
              className={`rounded-full border px-4 py-2 ${
                isFirstSlide
                  ? 'border-[#315d50] bg-white/70'
                  : 'border-white/20'
              }`}
              onPress={onComplete}
              accessibilityRole="button"
              accessibilityLabel="Skip welcome screens"
            >
              <Text
                className={`text-sm font-semibold ${
                  isFirstSlide ? 'text-[#073b2f]' : 'text-white/85'
                }`}
              >
                Skip
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-1 justify-center">
          <View className="items-center">
            {isFirstSlide ? (
              <>
                <Image
                  source={require('../../Images/welcome1.png')}
                  className="h-56 w-full"
                  resizeMode="contain"
                  accessibilityLabel="Gold wedding rings on a display stand"
                />
                <View className="mt-5 w-full items-center">
                  <View className="flex-row items-center">
                    <View className="mr-3 h-px w-8 bg-[#d9a441]" />
                    <Text className="text-xs font-extrabold tracking-[3px] text-[#073b2f]">
                      {slide.eyebrow}
                    </Text>
                    <View className="ml-3 h-px w-8 bg-[#d9a441]" />
                  </View>
                  <Text className="mt-4 text-center font-serif text-[32px] font-bold leading-[38px] text-[#073b2f]">
                    Find jewellery
                    {'\n'}that{' '}
                    <Text className="italic text-[#c47e12]">feels like you</Text>
                  </Text>
                  <View className="mt-3 flex-row items-center">
                    <View className="mr-3 h-px w-12 bg-[#d9a441]" />
                    <Ionicons name="diamond-outline" size={23} color="#c47e12" />
                    <View className="ml-3 h-px w-12 bg-[#d9a441]" />
                  </View>
                  <Text className="mt-3 max-w-[340px] text-center text-base leading-6 text-[#555555]">
                    {slide.description}
                  </Text>
                </View>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        </View>

        <View>
          <View className="mb-6 flex-row justify-center gap-2">
            {WELCOME_SLIDES.map((item, index) => (
              <View
                key={item.eyebrow}
                className={`h-1.5 rounded-full ${
                  index === activeIndex
                    ? `w-8 ${isFirstSlide ? 'bg-[#073b2f]' : 'bg-[#f2d58a]'}`
                    : `w-1.5 ${isFirstSlide ? 'bg-[#e7cda0]' : 'bg-white/35'}`
                }`}
              />
            ))}
          </View>
          <Pressable
            className={`h-14 flex-row items-center justify-center rounded-full px-6 ${
              isFirstSlide
                ? 'border border-[#e1a318] bg-[#004533]'
                : 'bg-[#f2d58a]'
            }`}
            onPress={() =>
              isLastSlide
                ? onComplete()
                : setActiveIndex(index => index + 1)
            }
            accessibilityRole="button"
          >
            <Text
              className={`text-base font-extrabold ${
                isFirstSlide ? 'text-white' : 'text-[#123c2d]'
              }`}
            >
              {isLastSlide ? 'Explore Sri Golds' : 'Continue'}
            </Text>
            <View className="ml-2">
              <Ionicons
                name="arrow-forward"
                size={18}
                color={isFirstSlide ? '#FFFFFF' : '#123c2d'}
              />
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
