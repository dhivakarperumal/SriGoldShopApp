import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { resolveImageUrl } from '../homeUtils';
import type { HomeBanner as HomeBannerData } from '../types';

const BANNER_HEIGHT = 220;
const styles = StyleSheet.create({
  slide: {
    height: BANNER_HEIGHT,
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  image: { position: 'absolute', top: 0, left: 0, zIndex: 0 },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    backgroundColor: 'rgba(0, 40, 32, 0.48)',
  },
  text: { zIndex: 2 },
});

type HomeBannerProps = {
  banners: HomeBannerData[];
  userName?: string;
  error?: string;
};

function HomeBanner({ banners, userName, error }: HomeBannerProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isEntering, setIsEntering] = useState(false);
  const activeIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const transitionProgress = useRef(new Animated.Value(0)).current;
  const firstName = userName?.trim().split(/\s+/)[0];
  const slides = banners.length > 0 ? banners : [undefined];

  const turnToSlide = useCallback(
    (nextIndex: number) => {
      if (
        slides.length < 2 ||
        isTransitioningRef.current ||
        nextIndex === activeIndexRef.current
      ) {
        return;
      }

      isTransitioningRef.current = true;
      Animated.timing(transitionProgress, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          isTransitioningRef.current = false;
          return;
        }

        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
        setIsEntering(true);
        Animated.timing(transitionProgress, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setIsEntering(false);
          isTransitioningRef.current = false;
        });
      });
    },
    [slides.length, transitionProgress],
  );

  useEffect(() => {
    if (slides.length < 2) return undefined;

    const timer = setInterval(() => {
      turnToSlide((activeIndexRef.current + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [slides.length, turnToSlide]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          slides.length > 1 &&
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -30) {
            turnToSlide((activeIndexRef.current + 1) % slides.length);
          } else if (gesture.dx > 30) {
            turnToSlide(
              (activeIndexRef.current - 1 + slides.length) % slides.length,
            );
          }
        },
      }),
    [slides.length, turnToSlide],
  );

  const rotateY = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: isEntering ? ['0deg', '90deg'] : ['0deg', '-90deg'],
  });

  return (
    <View className="mb-5">
      <Animated.View
        {...panResponder.panHandlers}
        className="relative overflow-hidden border-y border-[#d9b568] bg-[#003b30] px-5 pt-5 pb-4"
        style={[
          styles.slide,
          {
            width,
            transform: [{ perspective: 1000 }, { rotateY }],
          },
        ]}
        accessibilityLabel="Featured jewellery banners"
      >
        {(() => {
          const banner = slides[activeIndex];
          const image = resolveImageUrl(banner?.mobile_image || banner?.image);
          return (
            <>
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={[styles.image, { width, height: BANNER_HEIGHT }]}
                  resizeMode="cover"
                  accessibilityLabel={banner?.title || 'Sri Golds featured jewellery'}
                />
              ) : null}
              <View style={styles.overlay} />
              <View
                className="relative"
                style={[styles.text, { width: width * 0.58 }]}
              >
                <Text className="text-[10px] font-bold uppercase tracking-[2px] text-accent-light">
                  Sri Golds · Jewellery
                </Text>
                <Text
                  className="mt-1 text-2xl font-bold leading-8 text-white"
                  numberOfLines={2}
                >
                  {banner?.title ||
                    `Welcome${firstName ? `, ${firstName}` : ''}`}
                </Text>
                <Text
                  className="mt-1 text-sm leading-5 text-emerald-50"
                  numberOfLines={2}
                >
                  {banner?.subtitle ||
                    banner?.description ||
                    'Discover timeless designs and beautifully crafted jewellery.'}
                </Text>
                {error ? (
                  <Text
                    className="mt-2 text-xs text-amber-100"
                    accessibilityRole="alert"
                  >
                    {error}
                  </Text>
                ) : null}
              </View>
            </>
          );
        })()}
      </Animated.View>
      {slides.length > 1 ? (
        <View className="mt-2 flex-row justify-center gap-1.5">
          {slides.map((banner, index) => (
            <View
              key={banner?.id ?? index}
              className={`h-1.5 rounded-full ${
                index === activeIndex ? 'w-5 bg-[#bd8732]' : 'w-1.5 bg-[#d9c9a8]'
              }`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default HomeBanner;
