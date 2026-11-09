import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';

type Product = Record<string, unknown> & {
  id: string | number;
  name?: string;
};
type DetailField = readonly [string, unknown];
type TabId =
  | 'information'
  | 'pricing'
  | 'images'
  | 'specifications'
  | 'additional'
  | 'reviews'
  | 'activity';

const TABS: { id: TabId; label: string }[] = [
  { id: 'information', label: 'Information' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'images', label: 'Images' },
  { id: 'specifications', label: 'Specs' },
  { id: 'additional', label: 'Details' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'activity', label: 'Activity' },
];

const asObject = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const asText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown): string =>
  `₹${asNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

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
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ');
  if (typeof value === 'object') return '';
  return String(value);
}

function ProductDetails({
  productId,
  onBack,
  onDeleted,
}: {
  productId: string;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('information');
  const [activeImage, setActiveImage] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    api.get(`/products/${productId}`)
      .then(({ data }) => {
        const productData = asObject(data);
        const item = asObject(productData?.product) ?? productData;
        if (!item || (item.id == null && !item.name)) {
          throw new Error('The server returned invalid product details.');
        }
        if (!active) return;
        setProduct(item as Product);
        setActiveImage(0);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Failed to load product details:', error);
        setErrorMessage(getErrorMessage(error, 'Could not load product details.'));
        setProduct(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, refreshVersion]);

  useEffect(() => {
    let active = true;
    setHistoryError('');
    api.get(`/products/${productId}/price-history`)
      .then(({ data }) => {
        if (!active) return;
        const payload = asObject(data);
        setPriceHistory(Array.isArray(payload?.history)
          ? payload.history.map(asObject).filter(
            (entry): entry is Record<string, unknown> => entry !== null,
          )
          : []);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Failed to load product price history:', error);
        setHistoryError(getErrorMessage(error, 'Could not load price history.'));
      });
    return () => {
      active = false;
    };
  }, [productId, refreshVersion]);

  const imagePaths = useMemo(() => {
    if (!product) return [];
    const variants = parseArray(product.variants).map(asObject).filter(
      (variant): variant is Record<string, unknown> => variant !== null,
    );
    const rawImages = [
      ...parseArray(product.images),
      ...variants.flatMap(variant => parseArray(variant.images)),
    ];
    const paths = rawImages.map(image => {
      if (typeof image === 'string') return image;
      const object = asObject(image);
      return asText(object?.url || object?.path || object?.src);
    }).filter(Boolean);
    return [...new Set(paths)];
  }, [product]);
  const activeImageUrl = imagePaths[activeImage]
    ? getProductImageUrl({ image: imagePaths[activeImage] })
    : undefined;

  const deleteProduct = () => {
    Alert.alert('Delete product?', `Delete "${product?.name || 'this product'}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/products/${productId}`);
            Alert.alert('Product deleted', 'The product was removed from inventory.');
            onDeleted();
          } catch (error: unknown) {
            console.error('Failed to delete product:', error);
            Alert.alert('Delete failed', getErrorMessage(error, 'Could not delete the product.'));
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const shareProduct = async () => {
    try {
      await Share.share({
        title: product?.name || 'Product',
        message: `${product?.name || 'Product'}\nProduct ID: ${productId}`,
      });
    } catch (error: unknown) {
      console.error('Failed to share product:', error);
      Alert.alert('Share failed', 'Could not share the product details.');
    }
  };

  const openAsset = async (value: unknown) => {
    const url = getProductImageUrl({ image: value });
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error: unknown) {
      console.error('Failed to open product attachment:', error);
      Alert.alert('Could not open file', 'The product attachment could not be opened.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
          <Pressable
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            accessibilityRole="button"
            accessibilityLabel="Back to products"
          >
            <DetailIcon name="back" color="#FFFFFF" />
          </Pressable>
          <Text className="text-base font-extrabold text-white">Product Details</Text>
        </View>
        <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['bottom', 'left', 'right']}>
          <ActivityIndicator size="large" color="#004D40" />
          <Text className="mt-3 text-sm text-muted">Loading product details…</Text>
        </SafeAreaView>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
          <Pressable
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            accessibilityRole="button"
            accessibilityLabel="Back to products"
          >
            <DetailIcon name="back" color="#FFFFFF" />
          </Pressable>
          <Text className="text-base font-extrabold text-white">Product Details</Text>
        </View>
        <SafeAreaView className="flex-1 items-center justify-center bg-background px-6" edges={['bottom', 'left', 'right']}>
          <Text className="text-center text-lg font-bold text-primary-dark">Product details unavailable</Text>
          <Text className="mt-2 text-center text-sm text-muted">{errorMessage || 'This product may have been removed.'}</Text>
          <View className="mt-5 flex-row gap-3">
            <ActionButton label="Back" onPress={onBack} />
            <ActionButton label="Retry" onPress={() => setRefreshVersion(value => value + 1)} />
          </View>
        </SafeAreaView>
      </SafeAreaView>
    );
  }

  const offerPrice = product.offer_price ?? product.final_selling_price ?? product.mrp;
  const mrp = asNumber(product.mrp);
  const stock = asNumber(product.total_stock);
  const stockStatus = asText(product.stock_status) || (stock > 0 ? 'In Stock' : 'Out of Stock');
  const description = asText(product.description || product.full_description);
  const certificate = product.certificate;
  const sizeGuide = product.size_guide_chart;
  const variants = parseArray(product.variants).map(asObject).filter(
    (variant): variant is Record<string, unknown> => variant !== null,
  );

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center justify-between border-b border-[#00382E] bg-primary px-4">
        <View className="flex-1 flex-row items-center pr-2">
          <Pressable
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            accessibilityRole="button"
            accessibilityLabel="Back to products"
          >
            <DetailIcon name="back" color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-white" numberOfLines={1}>
              {asText(product.name) || 'Product Details'}
            </Text>
            <Text className="text-[10px] font-medium text-emerald-200" numberOfLines={1}>
              {asText(product.product_code) || `Product #${productId}`}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setRefreshVersion(value => value + 1)}
            className="h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            accessibilityRole="button"
            accessibilityLabel="Refresh product"
          >
            <DetailIcon name="refresh" color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={shareProduct}
            className="h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            accessibilityRole="button"
            accessibilityLabel="Share product"
          >
            <DetailIcon name="share" color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8 pt-4" keyboardShouldPersistTaps="handled">
        <View className="overflow-hidden rounded-2xl border border-border bg-surface p-3">
          <View className="h-64 items-center justify-center overflow-hidden rounded-xl bg-primary/5">
            {activeImageUrl ? (
              <Image source={{ uri: activeImageUrl }} className="h-full w-full" resizeMode="contain" accessibilityLabel={asText(product.name)} />
            ) : (
              <View className="items-center">
                <DetailIcon name="image" color="#64748B" size={34} />
                <Text className="mt-2 text-sm text-muted">No product images</Text>
              </View>
            )}
            {imagePaths.length > 1 ? (
              <View className="absolute inset-x-3 top-1/2 flex-row justify-between">
                <Pressable onPress={() => setActiveImage(index => (index + imagePaths.length - 1) % imagePaths.length)} className="h-10 w-10 items-center justify-center rounded-full bg-surface/95" accessibilityRole="button" accessibilityLabel="Previous image">
                  <DetailIcon name="back" color="#004D40" />
                </Pressable>
                <Pressable onPress={() => setActiveImage(index => (index + 1) % imagePaths.length)} className="h-10 w-10 items-center justify-center rounded-full bg-surface/95" accessibilityRole="button" accessibilityLabel="Next image">
                  <DetailIcon name="next" color="#004D40" />
                </Pressable>
              </View>
            ) : null}
          </View>
          {imagePaths.length > 1 ? (
            <ScrollView horizontal className="mt-3" contentContainerClassName="gap-2">
              {imagePaths.map((image, index) => {
                const uri = getProductImageUrl({ image });
                return uri ? (
                  <Pressable key={`${image}-${index}`} onPress={() => setActiveImage(index)} className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${activeImage === index ? 'border-primary' : 'border-border'}`}>
                    <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
                  </Pressable>
                ) : null;
              })}
            </ScrollView>
          ) : null}
          <View className="mt-4 flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xl font-black text-primary-dark">{asText(product.name) || 'Unnamed product'}</Text>
              <Text className="mt-1 text-xs text-muted">
                {[product.category, product.metal_type, product.purity].map(asText).filter(Boolean).join(' · ') || 'Uncategorized'}
              </Text>
            </View>
            <Text className={`rounded-full px-3 py-1 text-[10px] font-bold ${stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{stockStatus}</Text>
          </View>
          <View className="mt-3 flex-row flex-wrap items-center gap-x-3 gap-y-1">
            {product.rating != null ? (
              <Text className="text-xs font-bold text-accent-dark">★ {asNumber(product.rating).toFixed(1)} / 5{product.total_reviews != null ? ` (${asText(product.total_reviews)} reviews)` : ''}</Text>
            ) : null}
            <Text className="text-xs text-muted">SKU: {asText(product.product_code) || '—'}</Text>
          </View>
          {description ? <Text className="mt-3 text-sm leading-5 text-slate-600">{description}</Text> : null}
          <View className="mt-4 flex-row items-baseline gap-2">
            <Text className="text-2xl font-black text-primary-dark">{money(product.final_selling_price ?? offerPrice)}</Text>
            {mrp > asNumber(offerPrice) ? <Text className="text-sm text-muted line-through">{money(mrp)}</Text> : null}
          </View>
          <View className="mt-4 flex-row gap-2">
            <ActionButton label={deleting ? 'Deleting…' : 'Delete'} danger disabled={deleting} onPress={deleteProduct} />
            <ActionButton label="Back to products" onPress={onBack} />
          </View>
        </View>

        <ScrollView horizontal className="mt-4" contentContainerClassName="gap-2" showsHorizontalScrollIndicator={false}>
          {TABS.map(tab => (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} className={`rounded-full border px-4 py-2.5 ${activeTab === tab.id ? 'border-primary bg-primary' : 'border-border bg-surface'}`} accessibilityRole="button" accessibilityState={{ selected: activeTab === tab.id }}>
              <Text className={`text-xs font-bold ${activeTab === tab.id ? 'text-white' : 'text-slate-600'}`}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {activeTab === 'information' ? (
          <View className="mt-4 gap-3">
            <DetailCard title="Basic information" fields={[
              ['Product name', product.name], ['Category', product.category], ['Subcategory', product.subcategory],
              ['Metal type', product.metal_type], ['Purity', product.purity], ['SKU', product.product_code],
              ['Product type', product.product_type], ['Status', product.status], ['Stock status', stockStatus],
            ]} />
            <DetailCard title="Pricing summary" fields={[
              ['Current price', money(product.final_selling_price ?? offerPrice)],
              ['MRP', mrp ? money(mrp) : ''], ['Gross weight', product.gross_weight != null ? `${asText(product.gross_weight)} g` : ''],
              ['Net metal weight', product.net_gold_weight != null ? `${asText(product.net_gold_weight)} g` : ''],
              ['Average rating', product.rating != null ? `${asNumber(product.rating).toFixed(1)} / 5` : ''],
            ]} />
          </View>
        ) : null}

        {activeTab === 'pricing' ? (
          <View className="mt-4 gap-3">
            <DetailCard title="Pricing information" fields={[
              ['Metal rate', product.gold_rate_per_gram != null ? `${money(product.gold_rate_per_gram)} / g` : ''],
              ['Gross weight', product.gross_weight != null ? `${asText(product.gross_weight)} g` : ''],
              ['Net metal weight', product.net_gold_weight != null ? `${asText(product.net_gold_weight)} g` : ''],
              ['Metal value', product.net_gold_weight != null && product.gold_rate_per_gram != null ? money(asNumber(product.net_gold_weight) * asNumber(product.gold_rate_per_gram)) : ''],
              ['Making charge', product.making_charge != null ? String(product.making_charge_type).toLowerCase() === 'percentage' ? `${asText(product.making_charge)}%` : money(product.making_charge) : ''],
              ['Wastage', product.wastage != null ? String(product.wastage_type).toLowerCase() === 'percentage' ? `${asText(product.wastage)}%` : `${asText(product.wastage)} g` : ''],
              ['Stone charges', product.stone_charges != null ? money(product.stone_charges) : ''],
              ['Other charges', product.other_charges != null ? money(product.other_charges) : ''],
              ['GST', product.gst_rate != null ? `${asText(product.gst_rate)}%` : ''],
              ['Offer price', offerPrice != null ? money(offerPrice) : ''],
              ['Final price', money(product.final_selling_price ?? offerPrice)],
              ['Price includes GST', product.price_includes_gst],
            ]} />
            <DetailCard title="Stock and publishing" fields={[
              ['Stock quantity', `${stock} units`], ['Warehouse', product.warehouse], ['Status', product.status],
              ['Featured', product.featured], ['New arrival', product.new_arrival], ['Best seller', product.best_seller],
            ]} />
            {historyError ? <Text className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{historyError}</Text> : null}
            {priceHistory.length ? priceHistory.map((entry, index) => (
              <DetailCard key={String(entry.id ?? index)} title={`Price update ${index + 1}`} fields={[
                ['Date', formatDate(entry.created_at || entry.updated_at || entry.date)],
                ['Price', entry.price != null ? money(entry.price) : entry.final_selling_price != null ? money(entry.final_selling_price) : ''],
                ['Gold rate', entry.gold_rate_per_gram != null ? money(entry.gold_rate_per_gram) : ''],
              ]} />
            )) : !historyError ? <Text className="rounded-xl border border-border bg-surface p-4 text-xs text-muted">No price history available.</Text> : null}
          </View>
        ) : null}

        {activeTab === 'images' ? (
          <View className="mt-4 gap-3">
            {imagePaths.length ? imagePaths.map((image, index) => {
              const uri = getProductImageUrl({ image });
              return uri ? <Image key={`${image}-${index}`} source={{ uri }} className="h-64 w-full rounded-xl bg-surface" resizeMode="contain" /> : null;
            }) : <EmptyMessage text="No product images have been added." />}
            {product.video ? <Attachment label="Product video" value={product.video} onPress={openAsset} /> : null}
          </View>
        ) : null}

        {activeTab === 'specifications' ? (
          <View className="mt-4 gap-3">
            <DetailCard title="Sizes and dimensions" fields={[
              ['Product size', product.product_size], ['Available sizes', parseArray(product.available_sizes)],
              ['Length', product.length], ['Width', product.width], ['Height', product.height],
              ['Ring size', product.ring_size], ['Bangle size', product.bangle_size], ['Chain length', product.chain_length],
            ]} />
            <DetailCard title="Specifications" fields={[
              ['Specifications', product.specifications], ['Highlights', parseArray(product.highlights)],
              ['Care instructions', product.care_instructions], ['Warranty', product.warranty],
            ]} />
          </View>
        ) : null}

        {activeTab === 'additional' ? (
          <View className="mt-4 gap-3">
            <DetailCard title="Additional details" fields={[
              ['Brand', product.brand], ['Stone type', product.stone_type], ['Stone weight', product.stone_weight != null ? `${asText(product.stone_weight)} g` : ''],
              ['HUID', product.huid], ['Price includes GST', product.price_includes_gst],
            ]} />
            <DetailCard title="Description" fields={[
              ['Description', product.description], ['Highlights', parseArray(product.highlights)],
            ]} />
            {sizeGuide ? <Attachment label="Size guide chart" value={sizeGuide} onPress={openAsset} /> : null}
            {certificate ? <Attachment label="Certificate" value={certificate} onPress={openAsset} /> : null}
            {variants.length ? variants.map((variant, index) => (
              <DetailCard key={String(variant.id ?? index)} title={`Variant ${index + 1}`} fields={[
                ['Colour', variant.colorName || variant.color], ['Available sizes', variant.selectedSizes],
                ['Size stock', variant.sizesStock],
              ]} />
            )) : null}
          </View>
        ) : null}

        {activeTab === 'reviews' ? (
          <DetailCard title="Customer reviews" fields={[
            ['Average rating', product.rating != null ? `${asNumber(product.rating).toFixed(1)} / 5` : ''],
            ['Total reviews', product.total_reviews],
          ]} />
        ) : null}

        {activeTab === 'activity' ? (
          <DetailCard title="Activity" fields={[
            ['Created', formatDate(product.created_at)], ['Last updated', formatDate(product.updated_at)],
            ['Current status', product.status], ['Product ID', product.id],
          ]} />
        ) : null}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function formatDate(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  return Number.isNaN(date.valueOf())
    ? String(value)
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DetailCard({ title, fields }: { title: string; fields: DetailField[] }) {
  const visible = fields.filter(([, value]) => displayValue(value) !== '');
  if (!visible.length) return null;
  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface">
      <Text className="border-b border-border bg-primary/5 px-4 py-3 text-sm font-extrabold text-primary-dark">{title}</Text>
      <View className="px-4">
        {visible.map(([label, value]) => (
          <View key={label} className="flex-row justify-between gap-3 border-b border-slate-100 py-2.5">
            <Text className="flex-1 text-xs text-muted">{label}</Text>
            <Text className="flex-1 text-right text-xs font-semibold text-slate-700">{displayValue(value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Attachment({ label, value, onPress }: { label: string; value: unknown; onPress: (value: unknown) => void }) {
  return (
    <Pressable onPress={() => onPress(value)} className="flex-row items-center rounded-xl border border-border bg-surface p-4" accessibilityRole="button">
      <DetailIcon name="file" color="#004D40" />
      <Text className="ml-3 flex-1 text-sm font-semibold text-primary-dark">{label}</Text>
      <DetailIcon name="next" color="#64748B" />
    </Pressable>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return <Text className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-muted">{text}</Text>;
}

function ActionButton({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} className={`flex-1 items-center rounded-xl px-3 py-3 ${danger ? 'bg-rose-50' : 'bg-primary'}`} accessibilityRole="button">
      <Text className={`text-xs font-bold ${danger ? 'text-danger' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}

function DetailIcon({
  name,
  color,
  size = 18,
}: {
  name: 'back' | 'next' | 'refresh' | 'share' | 'image' | 'file';
  color: string;
  size?: number;
}) {
  const paths: Record<typeof name, string[]> = {
    back: ['m15 18-6-6 6-6', 'M20 12H9'],
    next: ['m9 18 6-6-6-6'],
    refresh: ['M20 11a8 8 0 0 0-14.9-4M4 4v4h4', 'M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4'],
    share: ['M12 16V4', 'm7 9 5-5 5 5', 'M5 12v7h14v-7'],
    image: ['M4 4h16v16H4z', 'm4 16 5-5 4 4 3-3 4 4', 'M9 9h.01'],
    file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h8'],
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths[name].map(path => (
        <Path key={path} d={path} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

export default ProductDetails;