import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { resolveImageUrl } from '../homeUtils';
import type { HomeBanner as HomeBannerData } from '../types';
import HomeSkeleton from './HomeSkeleton';

const BANNER_HEIGHT = 220;
const styles = StyleSheet.create({
  slide: {
    height: BANNER_HEIGHT,
    justifyContent: 'center',
  },
  backgroundScroll: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    height: BANNER_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 40, 32, 0.48)',
  },
  text: {
    backfaceVisibility: 'hidden',
    zIndex: 2,
  },
});

type HomeBannerProps = {
  banners: HomeBannerData[];
  userName?: string;
  error?: string;
  isLoading: boolean;
};

function HomeBanner({ banners, userName, error, isLoading }: HomeBannerProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isEntering, setIsEntering] = useState(false);
  const [turnDirection, setTurnDirection] = useState<1 | -1>(1);
  const slides = banners.length > 0 ? banners : [undefined];
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const activeIndexRef = useRef(0);
  const lastOffsetRef = useRef(0);
  const isTurningTextRef = useRef(false);
  const textTurnProgress = useRef(new Animated.Value(0)).current;
  const firstName = userName?.trim().split(/\s+/)[0];

  const turnTextToSlide = useCallback(
    (nextIndex: number, direction: 1 | -1) => {
      if (nextIndex === activeIndexRef.current || isTurningTextRef.current) {
        return;
      }

      isTurningTextRef.current = true;
      setTurnDirection(direction);
      textTurnProgress.setValue(0);
      Animated.timing(textTurnProgress, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          isTurningTextRef.current = false;
          return;
        }

        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
        setIsEntering(true);
        Animated.timing(textTurnProgress, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }).start(() => {
          setIsEntering(false);
          isTurningTextRef.current = false;
        });
      });
    },
    [textTurnProgress],
  );

  useEffect(() => {
    if (slides.length < 2) return undefined;

    const timer = setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % slides.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        y: 0,
        animated: true,
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [slides.length, width]);

  const rotateY = textTurnProgress.interpolate({
    inputRange: [0, 1],
    outputRange: isEntering
      ? [`${turnDirection * 90}deg`, '0deg']
      : ['0deg', `${-turnDirection * 90}deg`],
  });
  const banner = slides[activeIndex];

  return (
    <View className="mb-5">
      <View
        className="relative overflow-hidden border-y border-[#d9b568] bg-[#003b30] px-5 pt-5 pb-4"
        style={styles.slide}
        accessibilityLabel="Featured jewellery banners"
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={[styles.backgroundScroll, { width, height: BANNER_HEIGHT }]}
          onScrollBeginDrag={event => {
            lastOffsetRef.current = event.nativeEvent.contentOffset.x;
          }}
          onMomentumScrollEnd={event => {
            const offset = event.nativeEvent.contentOffset.x;
            const nextIndex = Math.max(
              0,
              Math.min(slides.length - 1, Math.round(offset / width)),
            );
            const direction: 1 | -1 =
              offset >= lastOffsetRef.current ? 1 : -1;
            lastOffsetRef.current = offset;
            turnTextToSlide(nextIndex, direction);
          }}
        >
          {slides.map((slide, index) => {
            const image = resolveImageUrl(slide?.mobile_image || slide?.image);
            return (
              <View key={slide?.id ?? `welcome-${index}`} style={{ width }}>
                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={[styles.image, { width }]}
                    resizeMode="cover"
                    accessibilityLabel={
                      slide?.title || 'Sri Golds featured jewellery'
                    }
                  />
                ) : null}
              </View>
            );
          })}
        </ScrollView>
        <View pointerEvents="none" style={styles.overlay} />
        {isLoading ? (
          <View
            pointerEvents="none"
            className="relative"
            style={{ width: width * 0.58 }}
            accessibilityLabel="Loading featured banners"
          >
            <HomeSkeleton className="h-2 w-24 bg-white/30" />
            <HomeSkeleton className="mt-3 h-6 w-4/5 bg-white/35" />
            <HomeSkeleton className="mt-2 h-6 w-3/5 bg-white/35" />
            <HomeSkeleton className="mt-3 h-3 w-full bg-white/25" />
            <HomeSkeleton className="mt-2 h-3 w-4/5 bg-white/25" />
          </View>
        ) : (
          <Animated.View
            pointerEvents="none"
            className="relative"
            style={[
              styles.text,
              {
                width: width * 0.58,
                transform: [{ perspective: 1000 }, { rotateY }],
              },
            ]}
          >
            <Text className="text-[10px] font-bold uppercase tracking-[2px] text-accent-light">
              Sri Golds · Jewellery
            </Text>
            <Text
              className="mt-1 text-2xl font-bold leading-8 text-white"
              numberOfLines={2}
            >
              {banner?.title || `Welcome${firstName ? `, ${firstName}` : ''}`}
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
          </Animated.View>
        )}
      </View>
    </View>
  );
}

export default HomeBanner;
