import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ProductCardData } from '../../Components/ProductCard';
import { getProductImageUrl } from '../../utils/productImage';

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
  onRemoveFavorite: (product: ProductCardData) => void;
};

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee3d2',
    backgroundColor: '#fff',
    shadowColor: '#513c1d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 66,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#f5edde',
  },
  imagePlaceholder: {
    width: 66,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#f5edde',
  },
  skeletonBlock: {
    borderRadius: 6,
    backgroundColor: '#eee8dd',
  },
  skeletonTitle: {
    width: '72%',
    height: 12,
  },
  skeletonDetail: {
    width: '54%',
    height: 9,
    marginTop: 9,
  },
  skeletonRating: {
    width: '42%',
    height: 9,
    marginTop: 8,
  },
  skeletonPrice: {
    width: '58%',
    height: 12,
    marginTop: 8,
  },
  skeletonDelete: {
    width: 16,
    height: 18,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ead8ad',
    backgroundColor: '#fffaf0',
  },
});

function displayText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

function getNumericPrice(item: WishlistItem): number | null {
  const value =
    item.offer_price ??
    item.final_selling_price ??
    item.price ??
    item.mrp;
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function formatPrice(value: number): string {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function WishlistSkeletonCard() {
  return (
    <View style={styles.card} accessibilityLabel="Loading wishlist item">
      <View style={[styles.skeletonBlock, styles.image]} />
      <View className="ml-3 flex-1">
        <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
        <View style={[styles.skeletonBlock, styles.skeletonDetail]} />
        <View style={[styles.skeletonBlock, styles.skeletonRating]} />
        <View style={[styles.skeletonBlock, styles.skeletonPrice]} />
      </View>
      <View style={[styles.skeletonBlock, styles.skeletonDelete]} />
    </View>
  );
}

function WishlistCard({
  item,
  onPress,
  onRemove,
}: {
  item: WishlistItem;
  onPress: () => void;
  onRemove: () => void;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageUrl = getProductImageUrl(item);
  const name = displayText(item.name) || 'Jewellery';
  const metal = displayText(
    item.category_name || item.category || item.metal_type || item.purity,
  );
  const weight = displayText(
    item.net_gold_weight || item.gross_weight || item.net_weight,
  );
  const details = [
    metal,
    weight ? `${weight}g` : '',
  ].filter(Boolean).join(' · ');
  const rating = Number(
    item.rating ?? item.average_rating ?? item.avg_rating,
  );
  const hasRating = Number.isFinite(rating) && rating > 0;
  const sellingPrice = getNumericPrice(item);
  const originalPrice = Number(item.mrp);
  const hasDiscount =
    sellingPrice !== null &&
    Number.isFinite(originalPrice) &&
    originalPrice > sellingPrice;
  const discount = hasDiscount
    ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <Pressable
        className="flex-1 flex-row items-center"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${name}`}
      >
        {imageUrl && !hasImageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setHasImageError(true)}
            accessibilityLabel={`${name} product image`}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="sparkles-outline" size={24} color="#bd8732" />
          </View>
        )}
        <View className="ml-3 min-w-0 flex-1 justify-center">
          <Text
            className="text-sm font-extrabold text-[#252525]"
            numberOfLines={1}
          >
            {name}
          </Text>
          {details ? (
            <Text className="mt-1 text-[10px] text-[#35695e]" numberOfLines={1}>
              {details}
            </Text>
          ) : null}
          <View className="mt-1 flex-row items-center">
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={hasRating && star <= Math.round(rating) ? 'star' : 'star-outline'}
                size={12}
                color={
                  hasRating && star <= Math.round(rating)
                    ? '#e0a51b'
                    : '#c9c4ba'
                }
              />
            ))}
            <Text className="ml-1 text-[10px] text-slate-500">
              {hasRating ? rating.toFixed(1) : '—'}
            </Text>
          </View>
          <View className="mt-1 flex-row flex-wrap items-center">
            <Text
              className="text-xs font-extrabold text-[#00594a]"
              numberOfLines={1}
            >
              {sellingPrice === null
                ? 'Price on request'
                : formatPrice(sellingPrice)}
            </Text>
            {hasDiscount ? (
              <>
                <Text
                  className="ml-1.5 text-[10px] text-slate-400 line-through"
                  numberOfLines={1}
                >
                  {formatPrice(originalPrice)}
                </Text>
                <View className="ml-1.5 rounded bg-[#08796a] px-1.5 py-0.5">
                  <Text className="text-[9px] font-bold text-white">
                    {discount}% OFF
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        className="ml-2 h-9 w-8 items-center justify-center"
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${name} from wishlist`}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={17} color="#f05a62" />
      </Pressable>
    </View>
  );
}

function UserFavorites({
  items,
  isLoading,
  error,
  isRefreshing,
  onRefresh,
  onRetry,
  onSelectProduct,
  onRemoveFavorite,
}: UserFavoritesProps) {
  const [itemToRemove, setItemToRemove] = useState<WishlistItem | null>(null);
  const productToRemove = itemToRemove
    ? {
        ...itemToRemove,
        id: itemToRemove.product_id,
        image: itemToRemove.image || undefined,
      }
    : null;

  const confirmRemoval = () => {
    if (!productToRemove) return;
    onRemoveFavorite(productToRemove);
    setItemToRemove(null);
  };

  return (
    <View className="flex-1 bg-[#f7f3ed]">
      <ScrollView
        className="flex-1"
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
        {isLoading && items.length === 0 ? (
          <View className="pt-3">
            {[0, 1, 2].map(index => (
              <WishlistSkeletonCard key={index} />
            ))}
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
            <View className="h-20 w-20 items-center justify-center rounded-full bg-[#fff0c8]">
              <Ionicons name="heart-outline" size={42} color="#d3a238" />
            </View>
            <Text className="mt-4 text-lg font-bold text-primary-dark">
              Your wishlist is empty
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
              Save jewellery you love by tapping the heart on a product.
            </Text>
          </View>
        ) : (
          <View className="pt-1">
            {items.map(item => {
              const productId = String(
                item.product_id ?? item.productId ?? item.id,
              );
              return (
                <WishlistCard
                  key={productId}
                  item={item}
                  onPress={() => onSelectProduct(productId)}
                  onRemove={() => setItemToRemove(item)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={itemToRemove !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setItemToRemove(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#fce8e7]">
              <Ionicons name="trash-outline" size={25} color="#c74444" />
            </View>
            <Text className="text-center text-lg font-extrabold text-[#003b2d]">
              Remove from wishlist?
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-600">
              {itemToRemove
                ? `Remove "${displayText(itemToRemove.name) || 'Jewellery'}" from your saved items?`
                : 'Remove this item from your saved items?'}
            </Text>
            <View className="mt-6 w-full flex-row">
              <Pressable
                className="mr-2 min-h-11 flex-1 items-center justify-center rounded-full border border-[#d9c9a5] bg-white px-4"
                onPress={() => setItemToRemove(null)}
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-[#35564d]">Cancel</Text>
              </Pressable>
              <Pressable
                className="ml-2 min-h-11 flex-1 items-center justify-center rounded-full bg-[#a93232] px-4"
                onPress={confirmRemoval}
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-white">Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default UserFavorites;
