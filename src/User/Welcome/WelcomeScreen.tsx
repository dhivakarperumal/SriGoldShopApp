import { useMemo, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  firstSlideArtwork: {
    shadowColor: '#f6b900',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 10,
  },
  firstSlideButton: {
    shadowColor: '#d99a00',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 11,
    elevation: 8,
  },
  secondSlideArtwork: {
    shadowColor: '#ffd84d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.72,
    shadowRadius: 18,
    elevation: 12,
  },
  secondSlideButton: {
    shadowColor: '#f4bb24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 10,
  },
});

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
  onHome: () => void;
  onSignIn: () => void;
};

function WelcomeScreen({ onComplete, onHome, onSignIn }: WelcomeScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx < -50) {
            setActiveIndex(index =>
              Math.min(index + 1, WELCOME_SLIDES.length - 1),
            );
          } else if (gestureState.dx > 50) {
            setActiveIndex(index => Math.max(index - 1, 0));
          }
        },
      }),
    [],
  );
  const slide = WELCOME_SLIDES[activeIndex];
  const isLastSlide = activeIndex === WELCOME_SLIDES.length - 1;
  const isFirstSlide = activeIndex === 0;
  const isSecondSlide = activeIndex === 1;
  const isLightSlide = isFirstSlide || isLastSlide;
  const slideArtwork = isFirstSlide
    ? require('../../Images/welcome1.png')
    : isSecondSlide
      ? require('../../Images/welcome2.png')
      : require('../../Images/welcome3.png');
  const textColor = isLightSlide ? 'text-[#073b2f]' : 'text-white';

  return (
    <View
      {...swipeResponder.panHandlers}
      className={`flex-1 ${
        isLightSlide
          ? 'bg-[#f4eadb]'
          : 'bg-[#002f25]'
      }`}
    >
      {isLightSlide || isSecondSlide ? (
        <Image
          source={
            isLightSlide
              ? require('../../Images/welcome1bg.png')
              : require('../../Images/welcomebg3.png')
          }
          className="absolute inset-0 h-full w-full"
          resizeMode="cover"
          pointerEvents="none"
          accessible={false}
        />
      ) : null}
      <StatusBar barStyle={isLightSlide ? 'dark-content' : 'light-content'} />
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
                isLightSlide
                  ? 'border-[#315d50] bg-white/70'
                  : 'border-white/20'
              }`}
              onPress={onComplete}
              accessibilityRole="button"
              accessibilityLabel="Skip welcome screens"
            >
              <Text
                className={`text-sm font-semibold ${
                  isLightSlide ? 'text-[#073b2f]' : 'text-white/85'
                }`}
              >
                Skip
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-1 justify-center">
          <View className="items-center">
            <Image
              source={slideArtwork}
              className="h-56 w-full"
              resizeMode="contain"
              accessibilityLabel={
                isFirstSlide
                  ? 'Gold wedding rings on a display stand'
                  : isSecondSlide
                    ? 'Gold jewellery displayed in a presentation box'
                    : 'Gold necklace and earrings on display'
              }
              style={
                isSecondSlide
                  ? styles.secondSlideArtwork
                  : styles.firstSlideArtwork
              }
            />
            <View className="mt-5 w-full items-center">
              <View className="flex-row items-center">
                <View
                  className={`mr-3 h-px w-8 ${
                    isLightSlide ? 'bg-[#d9a441]' : 'bg-[#f2d58a]'
                  }`}
                />
                <Text
                  className={`text-xs font-extrabold tracking-[3px] ${
                    isLightSlide ? 'text-[#073b2f]' : 'text-[#f2d58a]'
                  }`}
                >
                  {slide.eyebrow}
                </Text>
                <View
                  className={`ml-3 h-px w-8 ${
                    isLightSlide ? 'bg-[#d9a441]' : 'bg-[#f2d58a]'
                  }`}
                />
              </View>
              <Text
                className={`mt-4 text-center font-serif text-[32px] font-bold leading-[38px] ${
                  isLightSlide ? 'text-[#073b2f]' : 'text-white'
                }`}
              >
                {slide.title.split('\n').map((line, index) => (
                  <Text key={line}>
                    {index > 0 ? '\n' : ''}
                    {line}
                  </Text>
                ))}
              </Text>
              <View className="mt-3 flex-row items-center">
                <View
                  className={`mr-3 h-px w-12 ${
                    isLightSlide ? 'bg-[#d9a441]' : 'bg-[#f2d58a]'
                  }`}
                />
                <Ionicons
                  name="diamond-outline"
                  size={23}
                  color={isLightSlide ? '#c47e12' : '#f2d58a'}
                />
                <View
                  className={`ml-3 h-px w-12 ${
                    isLightSlide ? 'bg-[#d9a441]' : 'bg-[#f2d58a]'
                  }`}
                />
              </View>
              <Text
                className={`mt-3 max-w-[340px] text-center text-base leading-6 ${
                  isLightSlide ? 'text-[#555555]' : 'text-emerald-50/90'
                }`}
              >
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
                    ? `w-8 ${isLightSlide ? 'bg-[#073b2f]' : 'bg-[#f2d58a]'}`
                    : `w-1.5 ${isLightSlide ? 'bg-[#e7cda0]' : 'bg-white/35'}`
                }`}
              />
            ))}
          </View>
          <Pressable
            className={`h-14 flex-row items-center justify-center rounded-full px-6 ${
              isLightSlide
                ? 'border border-[#e1a318] bg-[#004533]'
                : 'bg-[#f2c64b]'
            }`}
            onPress={() =>
              isLastSlide
                ? onHome()
                : setActiveIndex(index => index + 1)
            }
            accessibilityRole="button"
            style={
              isLightSlide
                ? styles.firstSlideButton
                : styles.secondSlideButton
            }
          >
            <Text
              className={`text-base font-extrabold ${
                isLightSlide ? 'text-white' : 'text-[#123c2d]'
              }`}
            >
              {isLastSlide ? 'Go to Home' : 'Continue'}
            </Text>
            <View className="ml-2">
              <Ionicons
                name="arrow-forward"
                size={18}
                color={isLightSlide ? '#FFFFFF' : '#123c2d'}
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
