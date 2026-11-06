import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import ProductCard from '../../Components/ProductCard';
import type { ProductCardData } from '../../Components/ProductCard';

export type WishlistItem = ProductCardData & {
  id?: string | number;
  product_id: string | number;
  productId?: string | number;
  image?: string | null;
  price?: number | string;
};

type UserFavoritesProps = {
  items: WishlistItem[];
  isLoading: boolean;
  error?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onSelectProduct: (productId: string) => void;
  onEnquireProduct: (product: ProductCardData) => void;
  onRemoveFavorite: (product: ProductCardData) => void;
  onContinueShopping: () => void;
};

function UserFavorites({
  items,
  isLoading,
  error,
  isRefreshing,
  onRefresh,
  onRetry,
  onSelectProduct,
  onEnquireProduct,
  onRemoveFavorite,
  onContinueShopping,
}: UserFavoritesProps) {
  return (
    <ScrollView
      className="flex-1 bg-[#f7f3ed]"
      contentContainerClassName="grow pb-5"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#004D40"
          colors={['#004D40']}
        />
      }
    >
      <View className="flex-row items-center bg-primary px-4 py-4">
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#f5c45e]">
          <Text className="text-2xl leading-7 text-primary">♥</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-white">My Wishlist</Text>
          <Text className="text-[10px] text-[#f5c45e]">
            Your favourite jewellery, always close.
          </Text>
        </View>
        <View className="rounded-full bg-[#08796a] px-3 py-1">
          <Text className="text-[10px] font-bold text-white">
            {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'} SAVED
          </Text>
        </View>
      </View>

      <View className="mx-4 mt-4 h-px flex-row items-center justify-center bg-[#e7d8b8]">
        <View className="absolute bg-[#f7f3ed] px-2">
          <Text className="text-xs text-[#d3a238]">✦</Text>
        </View>
      </View>

      {isLoading && items.length === 0 ? (
        <View className="items-center py-14">
          <ActivityIndicator size="large" color="#004D40" />
          <Text className="mt-3 text-xs text-slate-500">
            Loading your favorites…
          </Text>
        </View>
      ) : error && items.length === 0 ? (
        <View className="mx-4 mt-5 items-center rounded-2xl border border-rose-200 bg-white px-5 py-8">
          <Text
            className="text-center text-sm text-rose-700"
            accessibilityRole="alert"
          >
            {error}
          </Text>
          <Pressable
            className="mt-4 rounded-full bg-primary px-5 py-2.5"
            onPress={onRetry}
            accessibilityRole="button"
          >
            <Text className="text-xs font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 py-16">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#fff0c8]">
            <Text className="text-4xl text-[#d3a238]">♡</Text>
          </View>
          <Text className="mt-4 text-lg font-bold text-primary-dark">
            Your wishlist is empty
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
            Save jewellery you love by tapping the heart on a product.
          </Text>
          <Pressable
            className="mt-6 min-h-11 items-center justify-center rounded-full bg-[#08796a] px-6 py-3"
            onPress={onContinueShopping}
            accessibilityRole="button"
          >
            <Text className="text-xs font-bold text-white">
              Continue Shopping
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="px-4 pt-4">
          <View className="flex-row flex-wrap justify-between">
            {items.map(item => {
              const productId = String(
                item.product_id ?? item.productId ?? item.id,
              );
              const product: ProductCardData = {
                ...item,
                id: item.product_id,
                image: item.image || undefined,
              };
              return (
                <ProductCard
                  key={productId}
                  product={product}
                  price={item.price}
                  layout="catalog"
                  onPress={() => onSelectProduct(productId)}
                  onEnquire={onEnquireProduct}
                  isFavorite
                  onToggleFavorite={onRemoveFavorite}
                />
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

export default UserFavorites;
