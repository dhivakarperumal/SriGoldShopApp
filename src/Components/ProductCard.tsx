import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { getProductImageUrl } from '../utils/productImage';

export type ProductCardData = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  category?: string;
  category_name?: string;
  metal_type?: string;
  purity?: string;
  gross_weight?: string | number;
  total_stock?: string | number;
  product_code?: string;
  offer_price?: string | number;
  final_selling_price?: string | number;
  mrp?: string | number;
};

type ProductCardProps = {
  product: ProductCardData;
  layout?: 'catalog' | 'inventory' | 'compact';
  title?: string;
  subtitle?: string;
  trailingText?: string;
  price?: unknown;
  priceFallback?: string;
  showStockBadge?: boolean;
  footer?: ReactNode;
  className?: string;
  onPress?: () => void;
};

function getText(value: unknown, fallback = '') {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : fallback;
}

function getPrice(product: ProductCardData, price: unknown) {
  const value =
    price ??
    product.offer_price ??
    product.final_selling_price ??
    product.mrp;
  if (value === undefined || value === null || value === '') return null;

  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : null;
}

function ProductCard({
  product,
  layout = 'catalog',
  title,
  subtitle,
  trailingText,
  price,
  priceFallback = 'Price on request',
  showStockBadge = false,
  footer,
  className,
  onPress,
}: ProductCardProps) {
  const imageUrl = getProductImageUrl(product);
  const [hasImageError, setHasImageError] = useState(false);
  const productName = title || getText(product.name, 'Jewellery');
  const formattedPrice = getPrice(product, price);
  const productSubtitle =
    subtitle ||
    [product.purity || product.metal_type, product.gross_weight ? `${product.gross_weight} g` : '']
      .filter(Boolean)
      .join(' · ');
  const stock = Number(product.total_stock);
  const stockLabel =
    stock <= 0 ? 'Out of stock' : stock < 10 ? 'Low stock' : 'In stock';
  const stockClass =
    stock <= 0
      ? 'bg-rose-50 text-rose-700'
      : stock < 10
        ? 'bg-amber-50 text-amber-700'
        : 'bg-emerald-50 text-emerald-700';

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  if (layout === 'compact') {
    return (
      <View className={`flex-row items-center border-b border-slate-100 py-3 last:border-b-0 ${className || ''}`}>
        <ProductImage
          imageUrl={imageUrl}
          name={productName}
          hasError={hasImageError}
          onError={() => setHasImageError(true)}
          size="compact"
        />
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
            {productName}
          </Text>
          {productSubtitle ? (
            <Text className="mt-0.5 text-[10px] text-slate-500" numberOfLines={1}>
              {productSubtitle}
            </Text>
          ) : null}
        </View>
        {trailingText ? (
          <Text className="ml-2 text-xs font-medium text-slate-500">
            {trailingText}
          </Text>
        ) : null}
      </View>
    );
  }

  if (layout === 'inventory') {
    const cardContent = (
      <View className="flex-row p-3.5">
        <ProductImage
          imageUrl={imageUrl}
          name={productName}
          hasError={hasImageError}
          onError={() => setHasImageError(true)}
          size="inventory"
        />
        <View className="min-w-0 flex-1 justify-center">
          <Text className="text-sm font-bold text-slate-800" numberOfLines={2}>
            {productName}
          </Text>
          <Text className="mt-1 text-[10px] text-muted" numberOfLines={1}>
            {productSubtitle || 'Uncategorized'}
          </Text>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-primary-dark">
              {formattedPrice || priceFallback}
            </Text>
            {showStockBadge ? (
              <View className={`rounded-full px-2.5 py-1 ${stockClass}`}>
                <Text className="text-[9px] font-bold">{stockLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );

    return (
      <View className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-sm ${className || ''}`}>
        {onPress ? (
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${productName}`}
          >
            {cardContent}
          </Pressable>
        ) : (
          cardContent
        )}
        {footer}
      </View>
    );
  }

  const cardContent = (
    <>
      <ProductImage
        imageUrl={imageUrl}
        name={productName}
        hasError={hasImageError}
        onError={() => setHasImageError(true)}
        size="catalog"
      />
      <View className="p-3">
        <Text className="text-sm font-semibold text-[#29231c]" numberOfLines={2}>
          {productName}
        </Text>
        {productSubtitle ? (
          <Text className="mt-1 text-[10px] text-[#777066]" numberOfLines={1}>
            {productSubtitle}
          </Text>
        ) : null}
        <Text className="mt-2 text-sm font-bold text-[#a66b00]">
          {formattedPrice || priceFallback}
        </Text>
      </View>
    </>
  );

  return (
    <View className={`mb-3 w-[48.5%] overflow-hidden rounded-xl border border-[#eadfc8] bg-white ${className || ''}`}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${productName}`}
        >
          {cardContent}
        </Pressable>
      ) : (
        cardContent
      )}
      {footer}
    </View>
  );
}

function ProductImage({
  imageUrl,
  name,
  hasError,
  onError,
  size,
}: {
  imageUrl?: string;
  name: string;
  hasError: boolean;
  onError: () => void;
  size: 'catalog' | 'inventory' | 'compact';
}) {
  const dimensions = {
    catalog: 'h-36 w-full',
    inventory: 'mr-3 h-[82px] w-[72px]',
    compact: 'mr-3 h-12 w-12',
  }[size];
  const containerStyle =
    size === 'catalog'
      ? 'bg-[#f7f2e8]'
      : size === 'inventory'
        ? 'rounded-xl border border-amber-100 bg-amber-50'
        : 'rounded-xl bg-amber-50';

  return (
    <View
      className={`${dimensions} items-center justify-center overflow-hidden ${containerStyle}`}
    >
      {imageUrl && !hasError ? (
        <Image
          source={{ uri: imageUrl }}
          className="h-full w-full"
          resizeMode="cover"
          onError={onError}
          accessibilityLabel={`${name} product image`}
        />
      ) : (
        <Text className="text-2xl text-[#bd8732]" accessibilityLabel="Product image unavailable">
          ✦
        </Text>
      )}
    </View>
  );
}

export default ProductCard;
