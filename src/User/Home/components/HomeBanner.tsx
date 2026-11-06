import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { resolveImageUrl } from '../homeUtils';
import type { HomeBanner as HomeBannerData } from '../types';

const BANNER_HEIGHT = 220;
const styles = StyleSheet.create({
  slide: { height: BANNER_HEIGHT },
  image: { ...StyleSheet.absoluteFillObject, height: BANNER_HEIGHT },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 40, 32, 0.55)',
  },
});

type HomeBannerProps = {
  banners: HomeBannerData[];
  userName?: string;
  error?: string;
};

function HomeBanner({ banners, userName, error }: HomeBannerProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const firstName = userName?.trim().split(/\s+/)[0];
  const slides = banners.length > 0 ? banners : [undefined];

  return (
    <View className="mb-5">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={event => {
          setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        accessibilityLabel="Featured jewellery banners"
      >
        {slides.map((banner, index) => {
          const image = resolveImageUrl(banner?.mobile_image || banner?.image);
          return (
            <View
              key={banner?.id ?? `welcome-${index}`}
              className="relative justify-center overflow-hidden border-y border-[#d9b568] bg-[#003b30] px-5 py-5"
              style={[styles.slide, { width }]}
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={[styles.image, { width }]}
                  resizeMode="cover"
                  accessibilityLabel={banner?.title || 'Sri Golds featured jewellery'}
                />
              ) : null}
              <View style={styles.overlay} />
              <View className="relative">
                <Text className="text-[10px] font-bold uppercase tracking-[2px] text-accent-light">
                  Sri Golds · Jewellery
                </Text>
                <Text className="mt-2 max-w-[280px] text-2xl font-bold text-white">
                  {banner?.title ||
                    `Welcome${firstName ? `, ${firstName}` : ''}`}
                </Text>
                <Text className="mt-2 max-w-[280px] text-sm leading-5 text-emerald-50">
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
            </View>
          );
        })}
      </ScrollView>
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
