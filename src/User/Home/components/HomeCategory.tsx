import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { getCategoryImage } from '../homeUtils';
import type { HomeCategory as HomeCategoryData } from '../types';

const VISIBLE_CATEGORIES = 4;
const CATEGORY_GAP = 8;
const HOME_HORIZONTAL_PADDING = 32;
const AUTO_SLIDE_INTERVAL = 2200;
const styles = StyleSheet.create({
  content: { gap: CATEGORY_GAP, paddingBottom: 8 },
});

type HomeCategoryProps = {
  categories: HomeCategoryData[];
  isLoading: boolean;
  error?: string;
};

function HomeCategory({ categories, isLoading, error }: HomeCategoryProps) {
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const physicalIndexRef = useRef(0);
  const listWidth = width - HOME_HORIZONTAL_PADDING;
  const cardWidth =
    (listWidth - CATEGORY_GAP * (VISIBLE_CATEGORIES - 1)) /
    VISIBLE_CATEGORIES;
  const itemStep = cardWidth + CATEGORY_GAP;
  const imageSize = Math.min(76, cardWidth - 8);
  const repeatedCategories =
    categories.length > VISIBLE_CATEGORIES
      ? [...categories, ...categories, ...categories]
      : categories;

  useEffect(() => {
    if (categories.length <= VISIBLE_CATEGORIES) return undefined;

    const timer = setInterval(() => {
      const nextIndex = physicalIndexRef.current + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * itemStep,
        animated: true,
      });
      physicalIndexRef.current = nextIndex;
    }, AUTO_SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [categories.length, itemStep]);

  return (
    <View className="mb-5">
      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-lg font-bold text-[#153b2e]">Shop by category</Text>
          <Text className="mt-0.5 text-xs text-[#777066]">
            Explore our jewellery collections
          </Text>
        </View>
        {isLoading && categories.length === 0 ? (
          <ActivityIndicator size="small" color="#004D40" />
        ) : null}
      </View>
      {error ? (
        <Text className="text-xs text-red-700" accessibilityRole="alert">
          {error}
        </Text>
      ) : categories.length === 0 && !isLoading ? (
        <Text className="text-sm text-[#777066]">No categories available.</Text>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          snapToInterval={itemStep}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          style={{ width: listWidth }}
          contentContainerStyle={styles.content}
          onMomentumScrollEnd={event => {
            const physicalIndex = Math.max(
              0,
              Math.round(event.nativeEvent.contentOffset.x / itemStep),
            );
            const nextIndex =
              categories.length > VISIBLE_CATEGORIES
                ? physicalIndex % categories.length
                : physicalIndex;

            physicalIndexRef.current = nextIndex;
            if (
              categories.length > VISIBLE_CATEGORIES &&
              physicalIndex !== nextIndex
            ) {
              scrollViewRef.current?.scrollTo({
                x: nextIndex * itemStep,
                animated: false,
              });
            }
          }}
        >
          {repeatedCategories.map((category, index) => {
            const image = getCategoryImage(category);
            return (
              <View
                key={`${category.catId ?? category.id ?? category.name}-${index}`}
                className="items-center"
                style={{ width: cardWidth }}
              >
                <View
                  className="items-center justify-center overflow-hidden rounded-full border-2 border-[#e9ce98] bg-white p-1"
                  style={{ width: imageSize, height: imageSize }}
                >
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      className="h-full w-full rounded-full"
                      resizeMode="cover"
                      accessibilityLabel={category.name}
                    />
                  ) : (
                    <Text
                      className="text-2xl text-[#bd8732]"
                      accessibilityLabel="Jewellery category"
                    >
                      ✦
                    </Text>
                  )}
                </View>
                <Text
                  className="mt-2 text-center text-xs font-semibold text-[#29231c]"
                  numberOfLines={2}
                >
                  {category.name}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export default HomeCategory;
