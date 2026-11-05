import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';

type Product = Record<string, unknown> & {
  id: string | number;
  name?: string;
  category?: string;
  total_stock?: number | string;
  status?: string;
  mrp?: number | string;
  offer_price?: number | string;
  final_selling_price?: number | string;
};

type ProductResponse = {
  products?: Product[];
  pagination?: {
    total?: number;
    totalPages?: number;
  };
  stats?: {
    total?: number;
    active?: number;
    lowStock?: number;
    outOfStock?: number;
  };
  filters?: {
    categories?: string[];
    purities?: string[];
  };
};

type StockFilter = '' | 'in-stock' | 'low-stock' | 'out-of-stock';

const PAGE_SIZE = 10;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  return fallback;
};

const getNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown): string =>
  `₹${getNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, lowStock: 0, outOfStock: 0 });
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState('');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchProducts = useCallback(async (showRefreshIndicator = false) => {
    setIsLoading(true);
    setLoadError('');
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    try {
      const response = await api.get('/products', {
        params: {
          page: currentPage,
          limit: PAGE_SIZE,
          search: debouncedSearch,
          status: 'All',
          category: selectedCategory,
          stockStatus: stockFilter,
          sortBy: 'created_at',
          sortOrder: 'desc',
        },
      });
      const data = response.data as Product[] | ProductResponse;
      const payload: ProductResponse = Array.isArray(data)
        ? { products: data, pagination: { total: data.length, totalPages: 1 } }
        : data;

      setProducts(Array.isArray(payload.products) ? payload.products : []);
      setTotalPages(Math.max(1, getNumber(payload.pagination?.totalPages) || 1));
      setStats({
        total: getNumber(payload.stats?.total),
        active: getNumber(payload.stats?.active),
        lowStock: getNumber(payload.stats?.lowStock),
        outOfStock: getNumber(payload.stats?.outOfStock),
      });
      setCategories(Array.isArray(payload.filters?.categories) ? payload.filters.categories : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoadError(getErrorMessage(error, 'Could not load products. Please try again.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, debouncedSearch, selectedCategory, stockFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshVersion]);

  const refreshProducts = () => {
    setIsRefreshing(true);
    setRefreshVersion(version => version + 1);
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete product?',
      `Remove ${product.name || 'this product'} from the inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/products/${product.id}`);
              Alert.alert('Product deleted', 'The product was removed from inventory.');
              if (products.length === 1 && currentPage > 1) {
                setCurrentPage(page => page - 1);
              } else {
                setRefreshVersion(version => version + 1);
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Delete failed', getErrorMessage(error, 'Could not delete the product.'));
            }
          },
        },
      ],
    );
  };

  const updateStock = async () => {
    const quantity = Number(newStock);
    if (!stockProduct || !Number.isInteger(quantity) || quantity < 0) {
      Alert.alert('Invalid stock', 'Enter a whole number of zero or more.');
      return;
    }

    setIsUpdatingStock(true);
    try {
      await api.put(`/products/${stockProduct.id}`, {
        ...stockProduct,
        total_stock: quantity,
      });
      setStockProduct(null);
      setRefreshVersion(version => version + 1);
    } catch (error) {
      console.error('Error updating product stock:', error);
      Alert.alert('Stock update failed', getErrorMessage(error, 'Could not update stock.'));
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const addProduct = async () => {
    const name = newProductName.trim();
    const price = Number(newProductPrice);
    if (!name || !Number.isFinite(price) || price <= 0) {
      Alert.alert('Product details required', 'Enter a product name and a valid price.');
      return;
    }

    setIsAddingProduct(true);
    try {
      const { data } = await api.get('/products/latest-code');
      if (typeof data?.latestCode !== 'string' && typeof data?.latestCode !== 'number') {
        throw new Error('The server did not return a product code.');
      }
      await api.post('/products', {
        name,
        mrp: price,
        status: 'Active',
        product_code: data.latestCode,
        category: 'Gold Jewellery',
        total_stock: '0',
        variants: [],
      });
      setNewProductName('');
      setNewProductPrice('');
      setIsAddModalVisible(false);
      setCurrentPage(1);
      setRefreshVersion(version => version + 1);
      Alert.alert('Product added', 'The product was added to your inventory.');
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Could not add product', getErrorMessage(error, 'Please try again.'));
    } finally {
      setIsAddingProduct(false);
    }
  };

  const refreshPrices = () => {
    Alert.alert(
      'Refresh product prices?',
      'Recalculate product prices using the active daily metal rates?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: async () => {
            setIsRefreshingPrices(true);
            try {
              const { data } = await api.post('/products/recalculate-prices', {
                reason: 'Manual product price refresh',
              });
              setRefreshVersion(version => version + 1);
              Alert.alert(
                'Prices refreshed',
                `${getNumber(data?.updated)} product${getNumber(data?.updated) === 1 ? '' : 's'} updated.`,
              );
            } catch (error) {
              console.error('Could not refresh product prices:', error);
              Alert.alert('Price refresh failed', getErrorMessage(error, 'Could not refresh prices.'));
            } finally {
              setIsRefreshingPrices(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-6 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshProducts}
            tintColor="#004D40"
            colors={['#004D40']}
          />
        }
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-bold text-primary-dark">Products</Text>
            <Text className="mt-1 text-xs text-muted">Inventory and stock management</Text>
          </View>
          <Pressable
            onPress={() => setIsAddModalVisible(true)}
            className="flex-row items-center rounded-xl bg-primary px-3.5 py-3"
            accessibilityRole="button"
          >
            <ProductIcon name="plus" color="#FFFFFF" />
            <Text className="ml-1.5 text-xs font-bold text-white">Add product</Text>
          </Pressable>
        </View>

        <View className="mb-4 flex-row flex-wrap justify-between">
          <StatCard label="Products" value={stats.total} color="bg-primary" />
          <StatCard label="Active" value={stats.active} color="bg-success" />
          <StatCard label="Low stock" value={stats.lowStock} color="bg-warning" />
          <StatCard label="Out of stock" value={stats.outOfStock} color="bg-danger" />
        </View>

        <View className="mb-3 flex-row items-center rounded-xl border border-border bg-surface px-3">
          <ProductIcon name="search" color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products or SKU"
            placeholderTextColor="#94A3B8"
            className="ml-2 min-h-11 flex-1 text-sm text-slate-800"
            returnKeyType="search"
            accessibilityLabel="Search products"
          />
        </View>

        <Pressable
          onPress={() => setIsCategoryPickerVisible(true)}
          className="mb-3 min-h-12 flex-row items-center justify-between rounded-xl border border-border bg-surface px-3.5"
          accessibilityRole="button"
          accessibilityLabel={`Category filter: ${selectedCategory || 'All categories'}`}
        >
          <View>
            <Text className="text-[10px] font-medium text-muted">Category</Text>
            <Text className="mt-0.5 text-sm font-semibold text-slate-800">
              {selectedCategory || 'All categories'}
            </Text>
          </View>
          <ProductIcon name="chevron" color="#64748B" />
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerClassName="gap-2"
        >
          {([
            { label: 'All stock', value: '' },
            { label: 'In stock', value: 'in-stock' },
            { label: 'Low stock', value: 'low-stock' },
            { label: 'Out of stock', value: 'out-of-stock' },
          ] as const).map(filter => (
            <FilterChip
              key={filter.value || 'all-stock'}
              label={filter.label}
              selected={stockFilter === filter.value}
              onPress={() => {
                setStockFilter(filter.value);
                setCurrentPage(1);
              }}
            />
          ))}
        </ScrollView>

        <Pressable
          onPress={refreshPrices}
          disabled={isRefreshingPrices}
          className="mb-4 flex-row items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-4 py-3"
          accessibilityRole="button"
        >
          {isRefreshingPrices ? (
            <ActivityIndicator size="small" color="#A66B00" />
          ) : (
            <ProductIcon name="refresh" color="#A66B00" />
          )}
          <Text className="ml-2 text-xs font-bold text-accent-dark">
            {isRefreshingPrices ? 'Refreshing prices…' : 'Refresh prices from daily rates'}
          </Text>
        </Pressable>

        {loadError ? (
          <View className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-semibold text-rose-800">Could not load products</Text>
            <Text className="mt-1 text-xs leading-5 text-rose-700">{loadError}</Text>
            <Pressable
              onPress={() => setRefreshVersion(version => version + 1)}
              className="mt-3 self-start rounded-lg bg-danger px-3 py-2"
              accessibilityRole="button"
            >
              <Text className="text-xs font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading && products.length === 0 ? (
          <View className="items-center rounded-2xl border border-border bg-surface py-12">
            <ActivityIndicator color="#004D40" />
            <Text className="mt-3 text-xs text-muted">Loading products…</Text>
          </View>
        ) : products.length > 0 ? (
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            {products.map((product, index) => (
              <ProductCard
                key={String(product.id)}
                product={product}
                isLast={index === products.length - 1}
                onUpdateStock={() => {
                  setStockProduct(product);
                  setNewStock(String(product.total_stock ?? 0));
                }}
                onDelete={() => handleDelete(product)}
              />
            ))}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-border bg-surface px-5 py-10">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ProductIcon name="box" color="#004D40" size={23} />
            </View>
            <Text className="text-sm font-bold text-slate-800">No products found</Text>
            <Text className="mt-1 text-center text-xs text-muted">
              Try a different search or filter, or add your first product.
            </Text>
          </View>
        )}

        {totalPages > 1 ? (
          <View className="mt-4 flex-row items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
            <Pressable
              onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="rounded-lg px-3 py-2"
              accessibilityRole="button"
            >
              <Text className={`text-xs font-bold ${currentPage <= 1 ? 'text-slate-300' : 'text-primary'}`}>
                Previous
              </Text>
            </Pressable>
            <Text className="text-xs font-semibold text-slate-600">
              Page {currentPage} of {totalPages}
            </Text>
            <Pressable
              onPress={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="rounded-lg px-3 py-2"
              accessibilityRole="button"
            >
              <Text className={`text-xs font-bold ${currentPage >= totalPages ? 'text-slate-300' : 'text-primary'}`}>
                Next
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={isCategoryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryPickerVisible(false)}
      >
        <ModalBackdrop onClose={() => setIsCategoryPickerVisible(false)}>
          <Text className="text-lg font-bold text-slate-900">Select category</Text>
          <Text className="mt-1 text-xs text-muted">Choose a category to filter products.</Text>
          <ScrollView className="mt-4 max-h-80">
            {['', ...categories].map(category => {
              const isSelected = selectedCategory === category;
              return (
                <Pressable
                  key={category || 'all-categories'}
                  onPress={() => {
                    setSelectedCategory(category);
                    setCurrentPage(1);
                    setIsCategoryPickerVisible(false);
                  }}
                  className={`mb-2 flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                    isSelected ? 'border-primary bg-primary/10' : 'border-border bg-surface'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-primary-dark' : 'text-slate-700'
                    }`}
                  >
                    {category || 'All categories'}
                  </Text>
                  {isSelected ? <ProductIcon name="check" color="#004D40" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {categories.length === 0 ? (
            <Text className="py-4 text-center text-xs text-muted">
              No categories are available.
            </Text>
          ) : null}
        </ModalBackdrop>
      </Modal>

      <Modal
        visible={Boolean(stockProduct)}
        transparent
        animationType="fade"
        onRequestClose={() => setStockProduct(null)}
      >
        <ModalBackdrop onClose={() => setStockProduct(null)}>
          <Text className="text-lg font-bold text-slate-900">Update stock</Text>
          <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
            {String(stockProduct?.name || 'Product')}
          </Text>
          <TextInput
            value={newStock}
            onChangeText={setNewStock}
            keyboardType="number-pad"
            placeholder="Enter quantity"
            className="mt-5 rounded-xl border border-border bg-slate-50 px-4 py-3 text-base text-slate-900"
            accessibilityLabel="New stock quantity"
          />
          <ModalActions
            cancelLabel="Cancel"
            confirmLabel={isUpdatingStock ? 'Saving…' : 'Save stock'}
            onCancel={() => setStockProduct(null)}
            onConfirm={updateStock}
            disabled={isUpdatingStock}
          />
        </ModalBackdrop>
      </Modal>

      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <ModalBackdrop onClose={() => setIsAddModalVisible(false)}>
          <Text className="text-lg font-bold text-slate-900">Add product</Text>
          <Text className="mt-1 text-xs text-muted">Quickly add a product to your inventory.</Text>
          <TextInput
            value={newProductName}
            onChangeText={setNewProductName}
            placeholder="Product name"
            className="mt-5 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-slate-900"
            accessibilityLabel="Product name"
          />
          <TextInput
            value={newProductPrice}
            onChangeText={setNewProductPrice}
            keyboardType="decimal-pad"
            placeholder="MRP"
            className="mt-3 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-slate-900"
            accessibilityLabel="Product MRP"
          />
          <ModalActions
            cancelLabel="Cancel"
            confirmLabel={isAddingProduct ? 'Adding…' : 'Add product'}
            onCancel={() => setIsAddModalVisible(false)}
            onConfirm={addProduct}
            disabled={isAddingProduct}
          />
        </ModalBackdrop>
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
    <View className="mb-2.5 w-[48.5%] rounded-xl border border-border bg-surface p-3">
      <View className={`mb-2 h-1 w-8 rounded-full ${color}`} />
      <Text className="text-xl font-extrabold text-slate-900">{value}</Text>
      <Text className="mt-0.5 text-[10px] font-medium text-muted">{label}</Text>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 ${
        selected ? 'border-primary bg-primary' : 'border-border bg-surface'
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text className={`text-[11px] font-semibold ${selected ? 'text-white' : 'text-slate-600'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProductCard({
  product,
  isLast,
  onUpdateStock,
  onDelete,
}: {
  product: Product;
  isLast: boolean;
  onUpdateStock: () => void;
  onDelete: () => void;
}) {
  const stock = getNumber(product.total_stock);
  const stockLabel = stock <= 0 ? 'Out of stock' : stock < 10 ? 'Low stock' : 'In stock';
  const stockStyle =
    stock <= 0
      ? 'bg-rose-50 text-rose-700'
      : stock < 10
        ? 'bg-amber-50 text-amber-700'
        : 'bg-emerald-50 text-emerald-700';
  const price = product.offer_price ?? product.final_selling_price ?? product.mrp;

  return (
    <View className={`flex-row p-3.5 ${isLast ? '' : 'border-b border-border'}`}>
      <ProductThumbnail imageUrl={getProductImageUrl(product)} name={product.name} />
      <View className="min-w-0 flex-1 justify-center">
        <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
          {product.name || 'Unnamed product'}
        </Text>
        <Text className="mt-0.5 text-[10px] text-muted" numberOfLines={1}>
          {[product.category, product.metal_type, product.purity]
            .filter(value => typeof value === 'string' && value.length > 0)
            .join(' · ') || 'Uncategorized'}
        </Text>
        <View className="mt-2 flex-row items-center">
          <Text className="text-sm font-extrabold text-primary-dark">
            {price === undefined ? 'Price unavailable' : formatCurrency(price)}
          </Text>
          <View className={`ml-2 rounded-full px-2 py-1 ${stockStyle}`}>
            <Text className="text-[9px] font-bold">{stockLabel}</Text>
          </View>
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-[10px] text-slate-500">
            SKU {String(product.product_code || '—')} · Stock {stock}
          </Text>
          <View className="flex-row items-center">
            <Pressable
              onPress={onUpdateStock}
              className="mr-2 rounded-lg bg-primary/10 px-2.5 py-2"
              accessibilityRole="button"
              accessibilityLabel={`Update stock for ${product.name || 'product'}`}
            >
              <ProductIcon name="edit" color="#004D40" size={15} />
            </Pressable>
            <Pressable
              onPress={onDelete}
              className="rounded-lg bg-rose-50 px-2.5 py-2"
              accessibilityRole="button"
              accessibilityLabel={`Delete ${product.name || 'product'}`}
            >
              <ProductIcon name="trash" color="#DC2626" size={15} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function ProductThumbnail({ imageUrl, name }: { imageUrl?: string; name?: string }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  return (
    <View className="mr-3 h-[74px] w-[66px] items-center justify-center overflow-hidden rounded-xl bg-amber-50">
      {imageUrl && !hasError ? (
        <Image
          source={{ uri: imageUrl }}
          className="h-full w-full"
          resizeMode="cover"
          onError={() => setHasError(true)}
          accessibilityLabel={name ? `${name} product image` : 'Product image'}
        />
      ) : (
        <ProductIcon name="box" color="#A66B00" size={23} />
      )}
    </View>
  );
}

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <View className="flex-1 justify-center bg-slate-950/50 px-5">
      <Pressable
        className="absolute inset-0"
        onPress={onClose}
        accessibilityLabel="Close dialog"
      />
      <View className="rounded-2xl bg-surface p-5">{children}</View>
    </View>
  );
}

function ModalActions({
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  disabled,
}: {
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  disabled: boolean;
}) {
  return (
    <View className="mt-5 flex-row">
      <Pressable
        onPress={onCancel}
        disabled={disabled}
        className="mr-2 flex-1 items-center rounded-xl border border-border px-3 py-3"
        accessibilityRole="button"
      >
        <Text className="text-xs font-bold text-slate-600">{cancelLabel}</Text>
      </Pressable>
      <Pressable
        onPress={onConfirm}
        disabled={disabled}
        className="ml-2 flex-1 items-center rounded-xl bg-primary px-3 py-3"
        accessibilityRole="button"
      >
        <Text className="text-xs font-bold text-white">{confirmLabel}</Text>
      </Pressable>
    </View>
  );
}

type ProductIconName =
  | 'plus'
  | 'search'
  | 'refresh'
  | 'box'
  | 'edit'
  | 'trash'
  | 'chevron'
  | 'check';

function ProductIcon({
  name,
  color,
  size = 17,
}: {
  name: ProductIconName;
  color: string;
  size?: number;
}) {
  const paths: Record<ProductIconName, string[]> = {
    plus: ['M12 5v14', 'M5 12h14'],
    search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.35-4.35'],
    refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M5.6 9a7 7 0 0 1 11.6-2L20 12', 'M4 12l2.8 5a7 7 0 0 0 11.6-2'],
    box: ['m21 8-9 5-9-5', 'm3 8 9-5 9 5v10l-9 5-9-5V8Z', 'M12 13v10'],
    edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z'],
    trash: ['M3 6h18', 'M8 6V4h8v2', 'm19 6-1 14H6L5 6', 'M10 11v5', 'M14 11v5'],
    chevron: ['m9 18 6-6-6-6'],
    check: ['M20 6 9 17l-5-5'],
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths[name].map(path => (
        <Path
          key={path}
          d={path}
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export default Products;
