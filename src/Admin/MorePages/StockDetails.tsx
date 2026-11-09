import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';

type Props = {
  onBack: () => void;
};

type Product = Record<string, unknown> & {
  id: string | number;
  name?: string;
  category?: string;
  total_stock?: number | string;
  stock?: number | string;
  stock_status?: string;
  product_code?: string;
};

type ProductResponse = {
  products?: Product[];
  pagination?: {
    totalPages?: number;
  };
};

type StockFilter = 'All' | 'In Stock' | 'Low Stock' | 'Out of Stock';

const PAGE_SIZE = 100;
const STOCK_FILTERS: StockFilter[] = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

const getNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

const getStock = (product: Product) =>
  Math.max(0, getNumber(product.total_stock ?? product.stock));

const getStockStatus = (stock: number): Exclude<StockFilter, 'All'> => {
  if (stock <= 0) return 'Out of Stock';
  if (stock < 10) return 'Low Stock';
  return 'In Stock';
};

function StockDetails({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = useCallback(async (refresh = false) => {
    setLoadError('');
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const params = { page: 1, limit: PAGE_SIZE, status: 'All' };
      const { data } = await api.get<Product[] | ProductResponse>('/products', { params });
      if (Array.isArray(data)) {
        setProducts(
          data.filter(
            product =>
              product &&
              (typeof product.id === 'string' || typeof product.id === 'number'),
          ),
        );
      } else if (data && Array.isArray(data.products)) {
        const allProducts = [...data.products];
        const totalPages = Math.max(1, Math.floor(getNumber(data.pagination?.totalPages)));
        for (let page = 2; page <= totalPages; page += 1) {
          const nextResponse = await api.get<Product[] | ProductResponse>('/products', {
            params: { ...params, page },
          });
          const nextData = nextResponse.data;
          const pageProducts = Array.isArray(nextData) ? nextData : nextData.products;
          if (!Array.isArray(pageProducts) || pageProducts.length === 0) break;
          allProducts.push(...pageProducts);
        }
        setProducts(allProducts);
      } else {
        throw new Error('The server returned an invalid product list.');
      }
    } catch (error) {
      console.error('Error fetching stock details:', error);
      setLoadError(getErrorMessage(error, 'Could not load stock details.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(product => {
      const stock = getStock(product);
      const matchesStatus = statusFilter === 'All' || getStockStatus(stock) === statusFilter;
      const matchesSearch =
        !query ||
        [product.name, product.product_code, product.category, product.id].some(value =>
          String(value ?? '')
            .toLowerCase()
            .includes(query),
        );
      return matchesStatus && matchesSearch;
    });
  }, [products, search, statusFilter]);

  const lowStockCount = products.filter(product => {
    const stock = getStock(product);
    return stock > 0 && stock < 10;
  }).length;
  const outOfStockCount = products.filter(product => getStock(product) <= 0).length;

  const saveStock = async () => {
    const addition = Number(quantityToAdd);
    if (!selectedProduct || !Number.isInteger(addition) || addition < 0) {
      Alert.alert('Invalid quantity', 'Enter a whole number of zero or more.');
      return;
    }

    const updatedStock = getStock(selectedProduct) + addition;
    const stockStatus = getStockStatus(updatedStock);
    setIsSaving(true);
    try {
      await api.put(`/products/${selectedProduct.id}`, {
        ...selectedProduct,
        total_stock: updatedStock,
        stock: updatedStock,
        stock_status: stockStatus,
      });
      setProducts(current =>
        current.map(product =>
          String(product.id) === String(selectedProduct.id)
            ? {
                ...product,
                total_stock: updatedStock,
                stock: updatedStock,
                stock_status: stockStatus,
              }
            : product,
        ),
      );
      setSelectedProduct(null);
      setQuantityToAdd('');
    } catch (error) {
      console.error('Error updating product stock:', error);
      Alert.alert('Stock update failed', getErrorMessage(error, 'Could not update stock.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
        <Pressable
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-extrabold tracking-wide text-white">Stock Details</Text>
          <Text className="text-[10px] font-medium text-emerald-200">
            Inventory availability and stock updates
          </Text>
        </View>
      </View>

      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchProducts(true)}
              tintColor="#004D40"
            />
          }
        >
          <View className="mb-4 flex-row gap-2">
            <StatCard label="Products" value={products.length} color="text-primary" />
            <StatCard label="Low stock" value={lowStockCount} color="text-amber-700" />
            <StatCard label="Out of stock" value={outOfStockCount} color="text-rose-700" />
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search product, SKU or category"
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search stock"
            className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {STOCK_FILTERS.map(filter => (
                <Pressable
                  key={filter}
                  onPress={() => setStatusFilter(filter)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: statusFilter === filter }}
                  className={`rounded-full border px-3 py-2 ${
                    statusFilter === filter
                      ? 'border-primary bg-primary'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      statusFilter === filter ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {filter}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#004D40" />
              <Text className="mt-3 text-sm text-slate-500">Loading stock…</Text>
            </View>
          ) : loadError ? (
            <View className="items-center rounded-2xl border border-rose-100 bg-white px-5 py-8">
              <Text className="text-center text-sm font-semibold text-rose-700">{loadError}</Text>
              <Pressable
                onPress={() => fetchProducts()}
                className="mt-4 rounded-lg bg-primary px-4 py-2"
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : visibleProducts.length ? (
            visibleProducts.map(product => (
              <StockProductCard
                key={String(product.id)}
                product={product}
                onUpdate={() => {
                  setSelectedProduct(product);
                  setQuantityToAdd('');
                }}
              />
            ))
          ) : (
            <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10">
              <Text className="text-base font-bold text-slate-800">No stock found</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                Try changing your search or stock filter.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={selectedProduct !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-white px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Text className="text-lg font-extrabold text-slate-900">Add stock</Text>
            <Text className="mt-1 text-sm text-slate-500" numberOfLines={1}>
              {selectedProduct?.name || 'Product'}
            </Text>
            <Text className="mt-4 text-xs font-semibold text-slate-600">
              Current quantity: {selectedProduct ? getStock(selectedProduct) : 0}
            </Text>
            <TextInput
              value={quantityToAdd}
              onChangeText={setQuantityToAdd}
              keyboardType="number-pad"
              placeholder="Quantity to add"
              placeholderTextColor="#94A3B8"
              accessibilityLabel="Quantity to add"
              className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
            />
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                onPress={() => setSelectedProduct(null)}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 px-4 py-3"
                accessibilityRole="button"
              >
                <Text className="text-sm font-bold text-slate-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => saveStock()}
                disabled={isSaving}
                className="rounded-xl bg-primary px-5 py-3 disabled:opacity-50"
                accessibilityRole="button"
              >
                <Text className="text-sm font-bold text-white">
                  {isSaving ? 'Saving…' : 'Save stock'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </Text>
      <Text className={`mt-1 text-lg font-extrabold ${color}`}>
        {value.toLocaleString('en-IN')}
      </Text>
    </View>
  );
}

function StockProductCard({
  product,
  onUpdate,
}: {
  product: Product;
  onUpdate: () => void;
}) {
  const imageUrl = getProductImageUrl(product);
  const [imageFailed, setImageFailed] = useState(false);
  const stock = getStock(product);
  const status = getStockStatus(stock);
  const statusStyle =
    status === 'In Stock'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : status === 'Low Stock'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-rose-200 bg-rose-50 text-rose-800';

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="mr-3 h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-amber-100 bg-amber-50">
            {imageUrl && !imageFailed ? (
              <Image
                source={{ uri: imageUrl }}
                className="h-full w-full"
                resizeMode="cover"
                onError={() => setImageFailed(true)}
                accessibilityLabel={`${product.name || 'Product'} image`}
              />
            ) : (
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
                  stroke="#A66B00"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="m4.5 7.75 7.5 4.5 7.5-4.5M12 12.25V21"
                  stroke="#A66B00"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </View>
          <View className="flex-1">
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            {product.name || 'Unnamed product'}
          </Text>
          <Text className="mt-1 text-xs text-slate-500">
            {product.product_code ? `SKU: ${product.product_code}` : `ID: ${product.id}`}
            {product.category ? ` · ${product.category}` : ''}
          </Text>
        </View>
        <View className={`rounded-full border px-2.5 py-1 ${statusStyle}`}>
          <Text className="text-[10px] font-bold">{status}</Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
        <View>
          <Text className="text-xs text-slate-500">Available stock</Text>
          <Text className="mt-0.5 text-xl font-extrabold text-slate-900">{stock}</Text>
        </View>
        <Pressable
          onPress={onUpdate}
          accessibilityRole="button"
          accessibilityLabel={`Add stock for ${product.name || 'product'}`}
          className="flex-row items-center rounded-xl bg-primary px-4 py-2.5"
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 5v14m-7-7h14"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
          <Text className="ml-2 text-xs font-bold text-white">Add stock</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default StockDetails;