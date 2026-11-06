import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ProductCard from '../../../Components/ProductCard';
import type { ProductCardData } from '../../../Components/ProductCard';
import type { HomeProduct } from '../types';

const styles = StyleSheet.create({
  products: { gap: 12, paddingBottom: 8 },
});

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
  const sectionProducts = products.filter(product => matchesMetal(product, metal));
  const title =
    metal === 'Silver'
      ? 'Silver Articles'
      : `${metal} Jewellery`;

  return (
    <View className="mb-5">
      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-lg font-bold text-[#153b2e]">{title}</Text>
          <Text className="mt-0.5 text-xs text-[#777066]">
            Curated collection
          </Text>
        </View>
        {isLoading && sectionProducts.length === 0 ? (
          <ActivityIndicator size="small" color="#004D40" />
        ) : null}
      </View>
      {error ? (
        <Text className="text-xs text-red-700" accessibilityRole="alert">
          {error}
        </Text>
      ) : sectionProducts.length === 0 && !isLoading ? (
        <Text className="text-sm text-[#777066]">
          No {metal.toLowerCase()} products available.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.products}
        >
          {sectionProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              layout="carousel"
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
