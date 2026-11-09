import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import api from '../../api';
import type { ProductCardData } from '../../Components/ProductCard';
import { getProductImageUrl } from '../../utils/productImage';
import HomeSkeleton from '../Home/components/HomeSkeleton';

type Product = Record<string, unknown> & {
  id?: string | number;
  name?: string;
};

type ProductVariant = Record<string, unknown>;

type UserProductDetailsProps = {
  productId: string;
  onBack: () => void;
  onEnquireProduct: (product: ProductCardData) => void;
  isFavorite: (productId: string) => boolean;
  onToggleFavorite: (product: ProductCardData) => void;
};

type ProductField = readonly [string, unknown];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return '';
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown): string {
  return `₹${number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

function parseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function displayValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value))
    return value.map(displayValue).filter(Boolean).join(', ');
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => {
        const content = displayValue(item);
        return content ? `${key}: ${content}` : '';
      })
      .filter(Boolean)
      .join(' · ');
  }
  return String(value);
}

function asVariant(value: unknown): ProductVariant | null {
  return isRecord(value) ? value : null;
}

function mediaPath(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return '';
  return text(value.url || value.path || value.src);
}

function getErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return 'Product details could not be loaded.';
}

function UserProductDetails({
  productId,
  onBack,
  onEnquireProduct,
  isFavorite,
  onToggleFavorite,
}: UserProductDetailsProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadProduct = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setProduct(null);
      try {
        const response = await api.get(`/products/${productId}`, {
          signal: controller.signal,
        });
        const payload = isRecord(response.data) ? response.data : null;
        const productData =
          payload && isRecord(payload.product) ? payload.product : payload;
        if (!productData || (productData.id == null && !productData.name)) {
          throw new TypeError('The server returned invalid product details.');
        }
        if (productData.status && productData.status !== 'Active') {
          throw new Error('This product is currently unavailable.');
        }
        if (active) {
          setProduct(productData as Product);
          setActiveImage(0);
          setActiveVariantIndex(0);
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error('Failed to load user product details:', error);
        setProduct(null);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (active) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadProduct().catch(error => {
      if (active && !controller.signal.aborted) {
        console.error('Failed to load user product details:', error);
        setErrorMessage(getErrorMessage(error));
        setIsLoading(false);
        setIsRefreshing(false);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [productId, refreshVersion]);

  const variants = useMemo(
    () =>
      product
        ? parseArray(product.variants)
            .map(asVariant)
            .filter((variant): variant is ProductVariant => variant !== null)
        : [],
    [product],
  );
  const currentVariant = variants[activeVariantIndex];
  const images = useMemo(() => {
    if (!product) return [];
    const rawImages = [
      ...parseArray(product.images),
      product.image,
      product.image_url,
      ...variants.flatMap(variant => parseArray(variant.images)),
    ];
    return [...new Set(rawImages.map(mediaPath).filter(Boolean))];
  }, [product, variants]);
  const imageUrl = images[activeImage]
    ? getProductImageUrl({ image: images[activeImage] })
    : undefined;

  const selectedStock =
    currentVariant?.total_stock ??
    currentVariant?.stock ??
    product?.total_stock;
  const stock = number(selectedStock);
  const stockLabel =
    text(product?.stock_status) || (stock > 0 ? 'In Stock' : 'Out of Stock');
  const price =
    currentVariant?.offer_price ??
    currentVariant?.final_selling_price ??
    currentVariant?.price ??
    product?.final_selling_price ??
    product?.offer_price ??
    product?.mrp;
  const mrp = number(currentVariant?.mrp ?? product?.mrp);
  const discount =
    number(product?.discount) > 0
      ? number(product?.discount)
      : mrp > number(price)
      ? Math.round(((mrp - number(price)) / mrp) * 100)
      : 0;
  const productName = text(product?.name) || 'Product Details';
  const productCode = text(product?.product_code);
  const description = text(product?.description || product?.full_description);
  const goldRate = product?.gold_rate_per_gram;
  const metalWeight = product?.net_gold_weight ?? product?.gross_weight;
  const goldAmount =
    product?.gold_amount != null
      ? money(product.gold_amount)
      : goldRate != null && metalWeight != null
      ? money(number(goldRate) * number(metalWeight))
      : '';
  const makingCharge =
    product?.making_charge == null
      ? ''
      : String(product.making_charge_type || '').toLowerCase() === 'percentage'
      ? `${number(product.making_charge).toFixed(2)}%`
      : money(product.making_charge);
  const wastage =
    product?.wastage == null
      ? ''
      : String(product.wastage_type || '').toLowerCase() === 'percentage'
      ? `${number(product.wastage).toFixed(3)}%`
      : `${text(product.wastage)} g`;
  const offerPrice =
    currentVariant?.offer_price ??
    product?.offer_price ??
    (discount > 0 ? price : undefined);
  const finalPrice =
    currentVariant?.final_selling_price ??
    currentVariant?.offer_price ??
    product?.final_selling_price ??
    price;

  const shareProduct = async () => {
    try {
      await Share.share({
        title: productName,
        message: `${productName}${productCode ? `\nCode: ${productCode}` : ''}`,
      });
    } catch (error) {
      console.error('Failed to share product:', error);
      Alert.alert('Share failed', 'Could not share this product.');
    }
  };

  const refreshProduct = () => {
    setIsRefreshing(true);
    setRefreshVersion(version => version + 1);
  };

  return (
    <View className="flex-1 bg-[#fffaf0]">
      <View className="flex-row items-center border-b border-[#eadcc0] bg-white px-4 py-3">
        <Pressable
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#fff4d9]"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to products"
        >
          <Text className="text-2xl leading-7 text-primary-dark">‹</Text>
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text
            className="text-base font-bold text-primary-dark"
            numberOfLines={1}
          >
            {isLoading ? 'Product Details' : productName}
          </Text>
          <Text className="text-[10px] text-slate-500" numberOfLines={1}>
            {productCode || `Product #${productId}`}
          </Text>
        </View>
        {product ? (
          <View className="ml-2 flex-row gap-2">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-[#fff4d9]"
              onPress={() => onToggleFavorite(product)}
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite(String(product.id ?? productId))
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
              accessibilityState={{
                selected: isFavorite(String(product.id ?? productId)),
              }}
            >
              <Text
                className={`text-xl ${
                  isFavorite(String(product.id ?? productId))
                    ? 'text-rose-600'
                    : 'text-slate-600'
                }`}
              >
                {isFavorite(String(product.id ?? productId)) ? '♥' : '♡'}
              </Text>
            </Pressable>
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-[#fff4d9]"
              onPress={shareProduct}
              accessibilityRole="button"
              accessibilityLabel="Share product"
            >
              <Text className="text-base text-[#9a6817]">↗</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow gap-4 px-4 py-4 pb-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshProduct}
              tintColor="#004D40"
              colors={['#004D40']}
            />
          }
        >
          <ProductDetailsSkeleton />
        </ScrollView>
      ) : !product ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow items-center justify-center px-6"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshProduct}
              tintColor="#004D40"
              colors={['#004D40']}
            />
          }
        >
          <Text className="text-center text-lg font-bold text-primary-dark">
            Product unavailable
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-slate-600">
            {errorMessage || 'This product may have been removed.'}
          </Text>
          <View className="mt-5 flex-row gap-3">
            <Pressable
              className="rounded-full border border-[#d6a63c] px-5 py-3"
              onPress={onBack}
              accessibilityRole="button"
            >
              <Text className="text-sm font-bold text-primary">Back</Text>
            </Pressable>
            <Pressable
              className="rounded-full bg-primary px-5 py-3"
              onPress={refreshProduct}
              accessibilityRole="button"
            >
              <Text className="text-sm font-bold text-white">Retry</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow gap-4 px-4 py-4 pb-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshProduct}
              tintColor="#004D40"
              colors={['#004D40']}
            />
          }
        >
          <View className="overflow-hidden rounded-2xl border border-[#eee8dc] bg-white p-3">
            <View className="h-72 items-center justify-center overflow-hidden rounded-xl bg-[#f8f6ef]">
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  className="h-full w-full"
                  resizeMode="contain"
                  accessibilityLabel={productName}
                />
              ) : (
                <View className="items-center px-4">
                  <Text className="text-4xl text-[#bd913e]">◇</Text>
                  <Text className="mt-2 text-sm text-slate-500">
                    Product image unavailable
                  </Text>
                </View>
              )}
              {images.length > 1 ? (
                <View className="absolute inset-x-3 top-1/2 flex-row justify-between">
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-full bg-white/95"
                    onPress={() =>
                      setActiveImage(
                        index => (index + images.length - 1) % images.length,
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Previous image"
                  >
                    <Text className="text-xl text-primary">‹</Text>
                  </Pressable>
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-full bg-white/95"
                    onPress={() =>
                      setActiveImage(index => (index + 1) % images.length)
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Next image"
                  >
                    <Text className="text-xl text-primary">›</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {images.length > 1 ? (
              <ScrollView
                horizontal
                className="mt-3"
                contentContainerClassName="gap-2"
                showsHorizontalScrollIndicator={false}
              >
                {images.map((image, index) => {
                  const uri = getProductImageUrl({ image });
                  if (!uri) return null;
                  return (
                    <Pressable
                      key={`${image}-${index}`}
                      className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                        activeImage === index
                          ? 'border-primary'
                          : 'border-slate-200'
                      }`}
                      onPress={() => setActiveImage(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`View product image ${index + 1}`}
                    >
                      <Image
                        source={{ uri }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            <View className="mt-4 flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-xl font-black text-primary-dark">
                  {productName}
                </Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">
                  {[product.category, product.metal_type, product.purity]
                    .map(text)
                    .filter(Boolean)
                    .join(' · ') || 'Jewellery'}
                </Text>
              </View>
              <Text
                className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                  stock > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {stockLabel}
              </Text>
            </View>

            {product.rating != null || productCode ? (
              <View className="mt-3 flex-row flex-wrap gap-x-3 gap-y-1">
                {product.rating != null ? (
                  <Text className="text-xs font-bold text-[#a66b00]">
                    ★ {number(product.rating).toFixed(1)} / 5
                    {product.total_reviews != null
                      ? ` (${text(product.total_reviews)} reviews)`
                      : ''}
                  </Text>
                ) : null}
                {productCode ? (
                  <Text className="text-xs text-slate-500">
                    SKU: {productCode}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {description ? (
              <Text className="mt-3 text-sm leading-6 text-slate-600">
                {description}
              </Text>
            ) : null}

            <View className="mt-4 flex-row flex-wrap items-baseline gap-2">
              <Text className="text-2xl font-black text-primary-dark">
                {money(
                  currentVariant?.final_selling_price ??
                    currentVariant?.offer_price ??
                    product.final_selling_price ??
                    price,
                )}
              </Text>
              {mrp > number(price) ? (
                <Text className="text-sm text-slate-400 line-through">
                  {money(mrp)}
                </Text>
              ) : null}
              {discount > 0 ? (
                <Text className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                  {discount}% off
                </Text>
              ) : null}
            </View>

            {variants.length > 0 ? (
              <View className="mt-4">
                <Text className="mb-2 text-xs font-bold text-slate-700">
                  Available options
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {variants.map((variant, index) => {
                    const variantLabel =
                      text(
                        variant.name ||
                          variant.colorName ||
                          variant.color_name ||
                          variant.size ||
                          variant.variant_name,
                      ) || `Option ${index + 1}`;
                    const selected = index === activeVariantIndex;
                    return (
                      <Pressable
                        key={`${variantLabel}-${index}`}
                        className={`rounded-full border px-3 py-2 ${
                          selected
                            ? 'border-primary bg-primary'
                            : 'border-[#eadcc0] bg-white'
                        }`}
                        onPress={() => {
                          setActiveVariantIndex(index);
                          setActiveImage(0);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            selected ? 'text-white' : 'text-slate-700'
                          }`}
                        >
                          {variantLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Pressable
              className="mt-5 min-h-12 items-center justify-center rounded-full bg-[#d9a441] px-4 py-3 active:opacity-80"
              onPress={() => onEnquireProduct(product)}
              accessibilityRole="button"
            >
              <Text className="text-sm font-bold text-[#23382c]">
                Enquire Now
              </Text>
            </Pressable>
          </View>

          <ProductDetailCard
            title="Basic information"
            fields={[
              ['Product code', product.product_code],
              ['Brand', product.brand],
              ['Category', product.category],
              ['Subcategory', product.subcategory],
              ['Product type', product.product_type],
              ['Metal', product.metal_type],
              ['Purity', product.purity],
              ['Status', product.status],
            ]}
          />
          <ProductDetailCard
            title="Pricing information"
            fields={[
              ['Gold rate', goldRate != null ? `${money(goldRate)} / g` : ''],
              [
                'Product weight',
                product.gross_weight != null
                  ? `${text(product.gross_weight)} g`
                  : '',
              ],
              ['Gold amount', goldAmount],
              ['Making charges', makingCharge],
              ['Wastage', wastage],
              [
                'Stone charges',
                product.stone_charges != null
                  ? money(product.stone_charges)
                  : '',
              ],
              [
                'Other charges',
                product.other_charges != null
                  ? money(product.other_charges)
                  : '',
              ],
              [
                'GST',
                product.gst_rate != null ? `${text(product.gst_rate)}%` : '',
              ],
              ['Offer price', offerPrice != null ? money(offerPrice) : ''],
              ['Discount', discount > 0 ? `${discount}%` : ''],
              ['Final price', money(finalPrice)],
              ['Price includes GST', product.price_includes_gst],
            ]}
          />
          <ProductDetailCard
            title="Weight and material"
            fields={[
              [
                'Net metal weight',
                product.net_gold_weight != null
                  ? `${text(product.net_gold_weight)} g`
                  : '',
              ],
              [
                'Stone weight',
                product.stone_weight != null
                  ? `${text(product.stone_weight)} g`
                  : '',
              ],
              ['Stone type', product.stone_type],
              ['HUID', product.huid],
              ['Material', product.material],
              ['Artisan work', product.work_type],
            ]}
          />
          <ProductDetailCard
            title="Size and dimensions"
            fields={[
              ['Product size', product.product_size],
              ['Available sizes', product.available_sizes],
              ['Length', product.length],
              ['Width', product.width],
              ['Height', product.height],
              ['Ring size', product.ring_size],
              ['Bangle size', product.bangle_size],
              ['Chain length', product.chain_length],
            ]}
          />
          <ProductDetailCard
            title="Additional details"
            fields={[
              ['Collection', product.collection ?? product.category],
              ['Brand', product.brand],
              ['Product type', product.product_type],
              ['Metal', product.metal_type],
              ['Purity', product.purity],
              ['Collection', product.collection ?? product.category],
              ['Highlights', product.highlights],
              ['Additional details', product.additional_details],
              ['Care instructions', product.care_instructions],
              ['Wash care', product.wash_care],
              ['Warranty', product.warranty],
              ['Certificate', product.certificate ? 'Available' : ''],
              ['Size guide', product.size_guide_chart ? 'Available' : ''],
              ['Video', product.video ? 'Available' : ''],
            ]}
          />
          {variants.map((variant, index) => (
            <ProductDetailCard
              key={`variant-details-${index}`}
              title={`Variant ${index + 1}`}
              fields={Object.entries(variant)
                .filter(([key]) => key !== 'images')
                .map(
                  ([key, value]) =>
                    [
                      key
                        .replace(/([a-z])([A-Z])/g, '$1 $2')
                        .replace(/_/g, ' ')
                        .replace(/^./, character => character.toUpperCase()),
                      value,
                    ] as const,
                )}
            />
          ))}
          {product.specifications != null ? (
            <ProductDetailCard
              title="Specifications"
              fields={
                parseArray(product.specifications).length
                  ? parseArray(product.specifications).map((item, index) =>
                      Array.isArray(item) && item.length >= 2
                        ? ([text(item[0]), item[1]] as const)
                        : ([`Specification ${index + 1}`, item] as const),
                    )
                  : [['Specifications', product.specifications]]
              }
            />
          ) : null}
          <ProductDetailCard
            title="Stock and availability"
            fields={[
              ['Stock quantity', selectedStock != null ? `${stock} units` : ''],
              ['Warehouse', product.warehouse],
              ['Availability', stockLabel],
              ['Status', product.status],
            ]}
          />
        </ScrollView>
      )}
    </View>
  );
}

function ProductDetailsSkeleton() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading product details"
    >
      <View className="overflow-hidden rounded-2xl border border-[#eee8dc] bg-white p-3">
        <HomeSkeleton className="h-72 w-full rounded-xl bg-[#eee8dc]" />
        <View className="mt-4">
          <HomeSkeleton className="h-5 w-3/4 bg-[#e8dfd0]" />
          <HomeSkeleton className="mt-2 h-3 w-1/2 bg-[#e8dfd0]" />
          <HomeSkeleton className="mt-4 h-7 w-2/5 bg-[#e8dfd0]" />
          <HomeSkeleton className="mt-4 h-3 w-full bg-[#e8dfd0]" />
          <HomeSkeleton className="mt-2 h-3 w-4/5 bg-[#e8dfd0]" />
          <HomeSkeleton className="mt-5 h-12 w-full rounded-full bg-[#e8dfd0]" />
        </View>
      </View>
      {[0, 1, 2, 3].map(card => (
        <View
          key={card}
          className="mt-4 overflow-hidden rounded-2xl border border-[#eadfce] bg-white"
        >
          <HomeSkeleton className="h-12 w-full rounded-none bg-[#f0ece4]" />
          <View className="px-4">
            {[0, 1, 2, 3].map(row => (
              <View
                key={row}
                className="flex-row items-center justify-between border-b border-[#f3eee5] py-3"
              >
                <HomeSkeleton className="h-3 w-1/3 bg-[#e8dfd0]" />
                <HomeSkeleton className="h-3 w-2/5 bg-[#e8dfd0]" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ProductDetailCard({
  title,
  fields,
}: {
  title: string;
  fields: ProductField[];
}) {
  const visibleFields = fields.filter(([, value]) => displayValue(value));
  if (!visibleFields.length) return null;

  return (
    <View className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white">
      <Text className="border-b border-[#efe5d4] bg-[#fffaf0] px-4 py-3 text-base font-bold text-primary-dark">
        {title}
      </Text>
      <View className="px-4">
        {visibleFields.map(([label, value], index) => (
          <View
            key={`${label}-${index}`}
            className={`flex-row gap-3 py-3 ${
              index < visibleFields.length - 1
                ? 'border-b border-[#f3eee5]'
                : ''
            }`}
          >
            <Text className="flex-1 text-xs text-[#887c69]">{label}</Text>
            <Text className="flex-1 text-right text-xs font-semibold text-[#352d22]">
              {displayValue(value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default UserProductDetails;
