import { ActivityIndicator, Text, View } from 'react-native';
import ProductCard from '../../../Components/ProductCard';
import type { ProductCardData } from '../../../Components/ProductCard';
import type { HomeProduct } from '../types';

type HomeProductsSectionProps = {
  products: HomeProduct[];
  isLoading: boolean;
  error?: string;
  onSelectProduct: (productId: string) => void;
  onEnquireProduct: (product: ProductCardData) => void;
  isFavorite: (productId: string) => boolean;
  onToggleFavorite: (product: ProductCardData) => void;
};

function HomeProductsSection({
  products,
  isLoading,
  error,
  onSelectProduct,
  onEnquireProduct,
  isFavorite,
  onToggleFavorite,
}: HomeProductsSectionProps) {
  return (
    <View className="mb-5">
      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-lg font-bold text-[#153b2e]">Featured jewellery</Text>
          <Text className="mt-0.5 text-xs text-[#777066]">
            A selection from our collection
          </Text>
        </View>
        {isLoading && products.length === 0 ? (
          <ActivityIndicator size="small" color="#004D40" />
        ) : null}
      </View>
      {error ? (
        <Text className="text-xs text-red-700" accessibilityRole="alert">
          {error}
        </Text>
      ) : products.length === 0 && !isLoading ? (
        <Text className="text-sm text-[#777066]">No products available.</Text>
      ) : (
        <View className="flex-row flex-wrap justify-between">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              layout="catalog"
              onPress={() => onSelectProduct(String(product.id))}
              onEnquire={onEnquireProduct}
              isFavorite={isFavorite(String(product.id))}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default HomeProductsSection;
