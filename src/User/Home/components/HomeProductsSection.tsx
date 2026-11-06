import { useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';
import ProductCard from '../../../Components/ProductCard';
import type { ProductCardData } from '../../../Components/ProductCard';
import type { HomeProduct } from '../types';
import HomeSkeleton from './HomeSkeleton';

const styles = StyleSheet.create({
  products: { gap: 12, paddingBottom: 8 },
});

const PRODUCT_GAP = 12;
const HOME_HORIZONTAL_PADDING = 32;

type HomeProductsSectionProps = {
  products: HomeProduct[];
  metal: 'Gold' | 'Silver' | 'Platinum' | 'Diamond';
  isLoading: boolean;
  error?: string;
  onSelectProduct: (productId: string) => void;
  onEnquireProduct: (product: ProductCardData) => void;
  isFavorite: (productId: string) => boolean;
  onToggleFavorite: (product: ProductCardData) => void;
};

const PRODUCT_AUTO_SLIDE_INTERVALS = {
  Gold: 5500,
  Silver: 6500,
  Platinum: 7500,
  Diamond: 8500,
} as const;

function productText(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function matchesMetal(product: HomeProduct, metal: HomeProductsSectionProps['metal']) {
  const isDiamond = [
    product.name,
    product.category,
    product.subcategory,
    product.metal_type,
  ].some(value => productText(value).includes('diamond'));

  if (metal === 'Diamond') return isDiamond;
  return productText(product.metal_type).includes(metal.toLowerCase()) &&
    (metal !== 'Gold' || !isDiamond);
}

function HomeProductsSection({
  products,
  metal,
  isLoading,
  error,
  onSelectProduct,
  onEnquireProduct,
  isFavorite,
  onToggleFavorite,
}: HomeProductsSectionProps) {
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const physicalIndexRef = useRef(0);
  const sectionProducts = products.filter(product => matchesMetal(product, metal));
  const listWidth = width - HOME_HORIZONTAL_PADDING;
  const cardWidth = (listWidth - PRODUCT_GAP) / 2;
  const itemStep = cardWidth + PRODUCT_GAP;
  const autoSlideInterval = PRODUCT_AUTO_SLIDE_INTERVALS[metal];
  const carouselProducts =
    sectionProducts.length > 2
      ? [...sectionProducts, ...sectionProducts, ...sectionProducts]
      : sectionProducts;
  const title =
    metal === 'Silver'
      ? 'Silver Articles'
      : `${metal} Jewellery`;

  useEffect(() => {
    if (sectionProducts.length <= 2) return undefined;

    const timer = setInterval(() => {
      const nextIndex = physicalIndexRef.current + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * itemStep,
        animated: true,
      });
      physicalIndexRef.current = nextIndex;
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [autoSlideInterval, itemStep, sectionProducts.length]);

  const syncCarouselIndex = (offset: number) => {
    const physicalIndex = Math.max(0, Math.round(offset / itemStep));
    const loopStart = sectionProducts.length;
    const loopEnd = sectionProducts.length * 2;

    if (sectionProducts.length > 2 && physicalIndex >= loopEnd) {
      const nextIndex = physicalIndex - sectionProducts.length;
      physicalIndexRef.current = nextIndex;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * itemStep,
        animated: false,
      });
      return;
    }

    if (sectionProducts.length > 2 && physicalIndex < loopStart) {
      const nextIndex = physicalIndex + sectionProducts.length;
      physicalIndexRef.current = nextIndex;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * itemStep,
        animated: false,
      });
      return;
    }

    physicalIndexRef.current = physicalIndex;
  };

  return (
    <View className="mb-5">
      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-lg font-bold text-[#153b2e]">{title}</Text>
          <Text className="mt-0.5 text-xs text-[#777066]">
            Curated collection
          </Text>
        </View>
      </View>
      {error ? (
        <Text className="text-xs text-red-700" accessibilityRole="alert">
          {error}
        </Text>
      ) : isLoading && sectionProducts.length === 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: listWidth }}
          contentContainerStyle={styles.products}
          accessibilityLabel={`Loading ${metal.toLowerCase()} products`}
        >
          {[0, 1].map(index => (
            <View
              key={index}
              className="mb-3 h-[420px] overflow-hidden rounded-xl border border-[#eadfc8] bg-white"
              style={{ width: cardWidth }}
            >
              <HomeSkeleton className="h-40 w-full rounded-none bg-[#eee8dc]" />
              <View className="flex-1 justify-between p-3">
                <HomeSkeleton className="h-3 w-4/5 bg-[#e8dfd0]" />
                <HomeSkeleton className="h-3 w-1/2 bg-[#e8dfd0]" />
                <HomeSkeleton className="h-4 w-2/3 bg-[#e8dfd0]" />
                <HomeSkeleton className="h-11 w-full rounded-lg bg-[#e8dfd0]" />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : sectionProducts.length === 0 ? (
        <Text className="text-sm text-[#777066]">
          No {metal.toLowerCase()} products available.
        </Text>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          snapToInterval={itemStep}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          style={{ width: listWidth }}
          contentContainerStyle={styles.products}
          onMomentumScrollEnd={event =>
            syncCarouselIndex(event.nativeEvent.contentOffset.x)
          }
        >
          {carouselProducts.map((product, index) => (
            <ProductCard
              key={`${product.id}-${index}`}
              product={product}
              layout="carousel"
              carouselWidth={cardWidth}
              onPress={() => onSelectProduct(String(product.id))}
              onEnquire={onEnquireProduct}
              isFavorite={isFavorite(String(product.id))}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default HomeProductsSection;
