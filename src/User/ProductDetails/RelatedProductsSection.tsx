import { useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';
import ProductCard from '../../Components/ProductCard';
import type { ProductCardData } from '../../Components/ProductCard';

const PRODUCT_GAP = 12;
const HORIZONTAL_PADDING = 32;

const styles = StyleSheet.create({
  products: {
    gap: PRODUCT_GAP,
    paddingBottom: 8,
  },
});

type RelatedProductsSectionProps = {
  eyebrow: string;
  title: string;
  products: ProductCardData[];
  error?: string;
  onSelectProduct: (productId: string) => void;
  onEnquireProduct: (product: ProductCardData) => void;
  isFavorite: (productId: string) => boolean;
  onToggleFavorite: (product: ProductCardData) => void;
};

function RelatedProductsSection({
  eyebrow,
  title,
  products,
  error,
  onSelectProduct,
  onEnquireProduct,
  isFavorite,
  onToggleFavorite,
}: RelatedProductsSectionProps) {
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const physicalIndexRef = useRef(0);
  const listWidth = width - HORIZONTAL_PADDING;
  const cardWidth = (listWidth - PRODUCT_GAP) / 2;
  const itemStep = cardWidth + PRODUCT_GAP;
  const carouselProducts =
    products.length > 2 ? [...products, ...products, ...products] : products;

  useEffect(() => {
    physicalIndexRef.current = 0;
    scrollViewRef.current?.scrollTo({ x: 0, animated: false });
  }, [products]);

  useEffect(() => {
    if (products.length <= 2) return undefined;

    const timer = setInterval(() => {
      const nextIndex = physicalIndexRef.current + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * itemStep,
        animated: true,
      });
      physicalIndexRef.current = nextIndex;
    }, 5500);

    return () => clearInterval(timer);
  }, [itemStep, products.length]);

  const syncCarouselIndex = (offset: number) => {
    const physicalIndex = Math.max(0, Math.round(offset / itemStep));
    const loopStart = products.length;
    const loopEnd = products.length * 2;

    if (products.length > 2 && physicalIndex >= loopEnd) {
      const nextIndex = physicalIndex - products.length;
      physicalIndexRef.current = nextIndex;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * itemStep,
        animated: false,
      });
      return;
    }

    if (products.length > 2 && physicalIndex < loopStart) {
      const nextIndex = physicalIndex + products.length;
      physicalIndexRef.current = nextIndex;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * itemStep,
        animated: false,
      });
      return;
    }

    physicalIndexRef.current = physicalIndex;
  };

  if (!error && products.length === 0) return null;

  return (
    <View className="mb-5">
      <View className="mb-3">
        <Text className="text-[9px] font-bold uppercase tracking-[2px] text-[#a67b2e]">
          {eyebrow}
        </Text>
        <Text className="mt-1 text-lg font-bold text-[#153b2e]">{title}</Text>
      </View>
      {error ? (
        <Text className="text-xs text-red-700" accessibilityRole="alert">
          {error}
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
          accessibilityLabel={title}
        >
          {carouselProducts.map((relatedProduct, index) => (
            <ProductCard
              key={`${relatedProduct.id}-${index}`}
              product={relatedProduct}
              layout="carousel"
              carouselWidth={cardWidth}
              onPress={() => onSelectProduct(String(relatedProduct.id))}
              onEnquire={onEnquireProduct}
              isFavorite={isFavorite(String(relatedProduct.id))}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default RelatedProductsSection;
