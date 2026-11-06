import { ActivityIndicator, Image, Text, View } from 'react-native';
import { getProductImageUrl } from '../../../utils/productImage';
import { formatPrice } from '../homeUtils';
import type { HomeProduct } from '../types';

type HomeProductsSectionProps = {
  products: HomeProduct[];
  isLoading: boolean;
  error?: string;
};

function HomeProductsSection({
  products,
  isLoading,
  error,
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
          {products.map(product => {
            const imageUrl = getProductImageUrl(product);
            const productDetails = [
              product.purity || product.metal_type,
              product.gross_weight ? `${product.gross_weight} g` : '',
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <View
                key={product.id}
                className="mb-3 w-[48.5%] overflow-hidden rounded-xl border border-[#eadfc8] bg-white"
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    className="h-36 w-full bg-[#f7f2e8]"
                    resizeMode="cover"
                    accessibilityLabel={product.name || 'Jewellery product'}
                  />
                ) : (
                  <View className="h-36 items-center justify-center bg-[#f7f2e8]">
                    <Text className="text-3xl text-[#bd8732]">✦</Text>
                  </View>
                )}
                <View className="p-3">
                  <Text
                    className="text-sm font-semibold text-[#29231c]"
                    numberOfLines={2}
                  >
                    {product.name || 'Jewellery'}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#777066]" numberOfLines={1}>
                    {productDetails}
                  </Text>
                  <Text className="mt-2 text-sm font-bold text-[#a66b00]">
                    {formatPrice(
                      product.offer_price ??
                        product.final_selling_price ??
                        product.mrp,
                    )}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default HomeProductsSection;
