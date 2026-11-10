import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getProductImageUrl } from '../utils/productImage';

export type ProductCardData = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  category?: string;
  category_name?: string;
  metal_type?: string;
  purity?: string;
  gross_weight?: string | number;
  net_weight?: string | number;
  total_stock?: string | number;
  product_code?: string;
  offer_price?: string | number;
  final_selling_price?: string | number;
  mrp?: string | number;
  rating?: string | number;
};

type ProductCardProps = {
  product: ProductCardData;
  layout?: 'catalog' | 'carousel' | 'inventory' | 'compact';
  carouselWidth?: number;
  title?: string;
  subtitle?: string;
  trailingText?: string;
  price?: unknown;
  priceFallback?: string;
  showStockBadge?: boolean;
  footer?: ReactNode;
  className?: string;
  onPress?: () => void;
  onEnquire?: (product: ProductCardData) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (product: ProductCardData) => void;
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
    ? { amount, formatted: `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` }
    : null;
}

function getMrp(product: ProductCardData) {
  const value = product.mrp;
  if (value === undefined || value === null || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function getDiscount(sellingPrice: number, mrp: number) {
  if (mrp <= sellingPrice) return null;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eadfc8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
    // Fixed height so every card in the grid is identical
    height: 310,
  },
  carouselCard: {
    overflow: 'hidden',
    marginBottom: 0,
    height: 320,
  },
  imageBox: {
    width: '100%',
    height: 148,
    backgroundColor: '#1a1a1a',
  },
  carouselImageBox: {
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.4,
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCodeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#B8860B',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  productCodeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  body: {
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 2,
  },
  carouselBody: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  carouselNameRow: {
    marginBottom: 4,
  },
  productName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 16,
    marginRight: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselRatingRow: {
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    marginLeft: 2,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
    marginRight: 3,
  },
  stockText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#2E7D32',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  carouselPriceRow: {
    marginTop: 5,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#003B2D',
  },
  mrpText: {
    fontSize: 10,
    color: '#999',
    textDecorationLine: 'line-through',
    flexShrink: 1,
  },
  discountBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  discountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2E7D32',
  },
  specsRow: {
    flexDirection: 'row',
    marginTop: 7,
    marginBottom: 8,
    gap: 6,
  },
  carouselSpecsRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  carouselSpecsPlaceholder: {
    height: 10,
  },
  specItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f6f0',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 5,
  },
  specLabel: {
    fontSize: 8,
    color: '#888',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
    marginTop: 1,
  },
  enquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003B2D',
    borderRadius: 9,
    paddingVertical: 9,
    marginHorizontal: 10,
    marginBottom: 10,
    gap: 5,
    // Pin to bottom of fixed-height card
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  carouselEnquireBtn: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  enquireBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─── Catalog / Carousel card (new design) ───────────────────────────────────
function CatalogCard({
  product,
  layout,
  carouselWidth,
  title,
  price,
  priceFallback,
  footer,
  onPress,
  onEnquire,
  isFavorite,
  onToggleFavorite,
}: ProductCardProps) {
  const imageUrl = getProductImageUrl(product);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  const productName = title || getText(product.name, 'Jewellery');
  const priceData = getPrice(product, price);
  const mrpAmount = getMrp(product);
  const discountPct =
    priceData && mrpAmount ? getDiscount(priceData.amount, mrpAmount) : null;

  const categoryLabel =
    getText(product.category_name) ||
    getText(product.category) ||
    getText(product.metal_type);

  const productCode = getText(product.product_code);

  const weight =
    getText(product.gross_weight) || getText(product.net_weight);
  const purity = getText(product.purity);

  const stock = Number(product.total_stock);
  const isInStock = stock > 0;

  const rating = Number(product.rating);
  const ratingDisplay = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null;

  const cardWidth =
    layout === 'carousel' && carouselWidth
      ? { width: carouselWidth }
      : layout === 'carousel'
      ? { width: 220 }
      : { width: '48.5%' as const };

  return (
    <View
      style={[
        styles.card,
        cardWidth,
        layout === 'carousel' && styles.carouselCard,
      ]}
    >
      {/* ── Image area ── */}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${productName}`}
      >
        <View
          style={[
            styles.imageBox,
            layout === 'carousel' && styles.carouselImageBox,
          ]}
        >
          {imageUrl && !hasImageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setHasImageError(true)}
              accessibilityLabel={`${productName} product image`}
            />
          ) : (
            <View style={[styles.image, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }]}>
              <Text style={{ fontSize: 36, color: '#B8860B' }}>✦</Text>
            </View>
          )}

          {/* Category badge — top left */}
          {categoryLabel ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {categoryLabel.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {/* Favorite button — top right */}
          {onToggleFavorite ? (
            <Pressable
              style={styles.favBtn}
              onPress={() => onToggleFavorite(product)}
              accessibilityRole="button"
              accessibilityLabel={`${isFavorite ? 'Remove from' : 'Add to'} favorites`}
              accessibilityState={{ selected: isFavorite }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill={isFavorite ? '#e53935' : 'none'}>
                <Path
                  d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"
                  stroke={isFavorite ? '#e53935' : '#555'}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          ) : null}

          {/* Product code badge — bottom right */}
          {productCode ? (
            <View style={styles.productCodeBadge}>
              <Text style={styles.productCodeText}>{productCode}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* ── Body ── */}
      <View
        style={[
          styles.body,
          layout === 'carousel' && styles.carouselBody,
        ]}
      >
        {/* Name row + stock badge */}
        <View
          style={[
            styles.nameRow,
            layout === 'carousel' && styles.carouselNameRow,
          ]}
        >
          <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
            {productName}
          </Text>
        </View>

        {/* Rating + Stock in same row */}
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 2,
            },
            layout === 'carousel' && styles.carouselRatingRow,
          ]}
        >
          {ratingDisplay ? (
            <View style={styles.ratingRow}>
              <Text style={{ fontSize: 13, color: '#FFC107' }}>★</Text>
              <Text style={styles.ratingText}>{ratingDisplay}</Text>
            </View>
          ) : <View />}

          <View style={[styles.stockBadge, !isInStock && { backgroundColor: '#FEE2E2' }]}>
            <View style={[styles.stockDot, !isInStock && { backgroundColor: '#DC2626' }]} />
            <Text style={[styles.stockText, !isInStock && { color: '#DC2626' }]}>
              {isInStock ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>

        {/* Price row */}
        <View
          style={[
            styles.priceRow,
            layout === 'carousel' && styles.carouselPriceRow,
          ]}
        >
          <Text style={styles.priceText}>
            {priceData ? priceData.formatted : priceFallback ?? 'Price on request'}
          </Text>
          {mrpAmount && discountPct ? (
            <>
              <Text style={styles.mrpText} numberOfLines={1}>
                ₹{mrpAmount.toLocaleString('en-IN')}
              </Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discountPct}% OFF</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Weight & Purity specs */}
        {(weight || purity) ? (
          <View
            style={[
              styles.specsRow,
              layout === 'carousel' && styles.carouselSpecsRow,
            ]}
          >
            {weight ? (
              <View style={styles.specItem}>
                {/* Weight icon */}
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 20h14l-2-9H7L5 20ZM9 11V9a3 3 0 0 1 6 0v2"
                    stroke="#888"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <View>
                  <Text style={styles.specLabel}>Weight</Text>
                  <Text style={styles.specValue}>{weight} g</Text>
                </View>
              </View>
            ) : null}
            {purity ? (
              <View style={styles.specItem}>
                {/* Purity / shield icon */}
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 2L4 6v6c0 5 3.6 9.7 8 11 4.4-1.3 8-6 8-11V6l-8-4Z"
                    stroke="#888"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <View>
                  <Text style={styles.specLabel}>Purity</Text>
                  <Text style={styles.specValue}>{purity}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View
            style={
              layout === 'carousel'
                ? styles.carouselSpecsPlaceholder
                : { height: 10 }
            }
          />
        )}
      </View>

      {/* ── Footer / Enquire button ── */}
      {footer}
      {onEnquire ? (
        <Pressable
          style={[
            styles.enquireBtn,
            { opacity: 1 },
            layout === 'carousel' && styles.carouselEnquireBtn,
          ]}
          onPress={() => onEnquire(product)}
          accessibilityRole="button"
          accessibilityLabel={`Enquire about ${productName}`}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"
              stroke="#fff"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.enquireBtnText}>Enquire Now</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProductCard(props: ProductCardProps) {
  const {
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
    isFavorite = false,
  } = props;

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

  // ── New catalog/carousel layout ──────────────────────────────────────────
  if (layout === 'catalog' || layout === 'carousel') {
    return <CatalogCard {...props} isFavorite={isFavorite} />;
  }

  // ── Compact layout ───────────────────────────────────────────────────────
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

  // ── Inventory layout ─────────────────────────────────────────────────────
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
            {formattedPrice ? formattedPrice.formatted : priceFallback}
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
