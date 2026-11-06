import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { getCategoryImage } from '../homeUtils';
import type { HomeCategory as HomeCategoryData } from '../types';

type HomeCategoryProps = {
  categories: HomeCategoryData[];
  isLoading: boolean;
  error?: string;
};

function HomeCategory({ categories, isLoading, error }: HomeCategoryProps) {
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
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 pb-2"
        >
          {categories.map((category, index) => {
            const image = getCategoryImage(category);
            return (
              <View
                key={category.catId ?? category.id ?? `${category.name}-${index}`}
                className="w-[92px] items-center"
              >
                <View className="h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border-2 border-[#e9ce98] bg-white p-1">
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
