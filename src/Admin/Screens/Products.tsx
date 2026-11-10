import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import SharedProductCard from '../../Components/ProductCard';
import type { AdminRoute } from '../Navigations/TopHeader';
import AddProducts from '../AddProducts/Addproducts';
import ProductDetails from '../AddProducts/ProductsDetails';

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
    inactive?: number;
    lowStock?: number;
    outOfStock?: number;
  };
  filters?: {
    categories?: string[];
    purities?: string[];
  };
};

type StockFilter = '' | 'in-stock' | 'low-stock' | 'out-of-stock';

const PAGE_SIZE = 100;

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

function Products({ onNavigate }: { onNavigate: (route: AdminRoute) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, outOfStock: 0 });
  const [statFilter, setStatFilter] = useState<'all' | 'active' | 'inactive' | 'out-of-stock'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>('');
  const [isStockPickerVisible, setIsStockPickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState('');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isAddProductFormVisible, setIsAddProductFormVisible] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const addButtonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(addButtonPulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(addButtonPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [addButtonPulse]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
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
      const params = {
        limit: PAGE_SIZE,
        search: debouncedSearch,
        status: 'All',
        category: selectedCategory,
        stockStatus: stockFilter,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };
      const response = await api.get('/products', { params: { ...params, page: 1 } });
      const responseData = response.data as Product[] | ProductResponse;
      const payload: ProductResponse = Array.isArray(responseData)
        ? { products: responseData }
        : responseData;
      const allProducts = Array.isArray(payload.products) ? [...payload.products] : [];
      const productIds = new Set(allProducts.map(product => String(product.id)));
      const reportedPages = Math.floor(getNumber(payload.pagination?.totalPages));
      const reportedTotal = Math.floor(getNumber(payload.pagination?.total));
      const pageCount = reportedPages || Math.ceil(reportedTotal / PAGE_SIZE);

      for (let page = 2; page <= pageCount; page += 1) {
        const pageResponse = await api.get('/products', { params: { ...params, page } });
        const pageData = pageResponse.data as Product[] | ProductResponse;
        const pageItems = Array.isArray(pageData) ? pageData : pageData.products ?? [];
        if (pageItems.length === 0) {
          break;
        }
        for (const product of pageItems) {
          const id = String(product.id);
          if (!productIds.has(id)) {
            productIds.add(id);
            allProducts.push(product);
          }
        }
      }

      if (
        pageCount === 0 &&
        !Array.isArray(responseData) &&
        allProducts.length === PAGE_SIZE
      ) {
        for (let page = 2; ; page += 1) {
          const pageResponse = await api.get('/products', { params: { ...params, page } });
          const pageData = pageResponse.data as Product[] | ProductResponse;
          const pageItems = Array.isArray(pageData) ? pageData : pageData.products ?? [];
          if (pageItems.length === 0) {
            break;
          }
          let foundNewProduct = false;
          for (const product of pageItems) {
            const id = String(product.id);
            if (!productIds.has(id)) {
              productIds.add(id);
              allProducts.push(product);
              foundNewProduct = true;
            }
          }
          if (!foundNewProduct || pageItems.length < PAGE_SIZE) {
            break;
          }
        }
      }

      const totalCount = getNumber(payload.stats?.total) || reportedTotal || allProducts.length;
      const activeCount =
        payload.stats?.active !== undefined
          ? getNumber(payload.stats.active)
          : allProducts.filter(p => {
              const s = String(p.status || '').toLowerCase();
              return s === 'active' || p.is_active === true;
            }).length;
      const inactiveCount =
        payload.stats?.inactive !== undefined
          ? getNumber(payload.stats.inactive)
          : allProducts.length > 0
            ? allProducts.filter(p => {
                const s = String(p.status || '').toLowerCase();
                return s === 'inactive' || s === 'disabled' || p.is_active === false;
              }).length
            : Math.max(0, totalCount - activeCount);
      const outOfStockCount =
        payload.stats?.outOfStock !== undefined
          ? getNumber(payload.stats.outOfStock)
          : allProducts.filter(p => getNumber(p.total_stock) <= 0).length;

      setProducts(allProducts);
      setStats({
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        outOfStock: outOfStockCount,
      });
      setCategories(Array.isArray(payload.filters?.categories) ? payload.filters.categories : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoadError(getErrorMessage(error, 'Could not load products. Please try again.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, selectedCategory, stockFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshVersion]);


  const displayedProducts = useMemo(() => {
    let result = products;
    if (statFilter === 'active') {
      result = result.filter(p => {
        const s = String(p.status || '').toLowerCase();
        return s === 'active' || p.is_active === true;
      });
    } else if (statFilter === 'inactive') {
      result = result.filter(p => {
        const s = String(p.status || '').toLowerCase();
        return s === 'inactive' || s === 'disabled' || p.is_active === false;
      });
    } else if (statFilter === 'out-of-stock') {
      result = result.filter(p => getNumber(p.total_stock) <= 0);
    }
    return result;
  }, [products, statFilter]);

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
              setRefreshVersion(version => version + 1);
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



  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24 pt-4"
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
        

        <View className="mb-2 flex-row flex-wrap justify-between">
          <StatCard
            type="total"
            value={stats.total}
            isSelected={statFilter === 'all' && stockFilter === ''}
            onPress={() => {
              setStatFilter('all');
              if (stockFilter !== '') setStockFilter('');
            }}
          />
          <StatCard
            type="active"
            value={stats.active}
            isSelected={statFilter === 'active'}
            onPress={() => {
              setStatFilter(prev => (prev === 'active' ? 'all' : 'active'));
            }}
          />
          <StatCard
            type="inactive"
            value={stats.inactive}
            isSelected={statFilter === 'inactive'}
            onPress={() => {
              setStatFilter(prev => (prev === 'inactive' ? 'all' : 'inactive'));
            }}
          />
          <StatCard
            type="outOfStock"
            value={stats.outOfStock}
            isSelected={statFilter === 'out-of-stock' || stockFilter === 'out-of-stock'}
            onPress={() => {
              const next = statFilter === 'out-of-stock' ? 'all' : 'out-of-stock';
              setStatFilter(next);
              setStockFilter(next === 'out-of-stock' ? 'out-of-stock' : '');
            }}
          />
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

        <View className="mb-4 flex-row gap-2">
          <Pressable
            onPress={() => setIsCategoryPickerVisible(true)}
            className="min-h-12 min-w-0 flex-1 flex-row items-center justify-between rounded-xl border border-border bg-surface px-2.5"
            accessibilityRole="button"
            accessibilityLabel={`Category filter: ${selectedCategory || 'All categories'}`}
          >
            <View className="min-w-0 flex-1">
              <Text className="mt-0.5 text-xs font-semibold text-slate-800" numberOfLines={1}>
                {selectedCategory || 'All categories'}
              </Text>
            </View>
            <ProductIcon name="chevron" color="#64748B" size={15} />
          </Pressable>

          <Pressable
            onPress={() => setIsStockPickerVisible(true)}
            className="min-h-12 min-w-0 flex-1 flex-row items-center justify-between rounded-xl border border-border bg-surface px-2.5"
            accessibilityRole="button"
            accessibilityLabel={`Stock filter: ${
              stockFilter === 'in-stock'
                ? 'In stock'
                : stockFilter === 'low-stock'
                  ? 'Low stock'
                  : stockFilter === 'out-of-stock'
                    ? 'Out of stock'
                    : 'All stock'
            }`}
          >
            <View className="min-w-0 flex-1">
              <Text className="mt-0.5 text-xs font-semibold text-slate-800" numberOfLines={1}>
                {stockFilter === 'in-stock'
                  ? 'In stock'
                  : stockFilter === 'low-stock'
                    ? 'Low stock'
                    : stockFilter === 'out-of-stock'
                      ? 'Out of stock'
                      : 'All stock'}
              </Text>
            </View>
            <ProductIcon name="chevron" color="#64748B" size={15} />
          </Pressable>
        </View>

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
        ) : displayedProducts.length > 0 ? (
          <View className="gap-3">
            {displayedProducts.map(product => (
              <InventoryProductCard
                key={String(product.id)}
                product={product}
                onPressDetails={() => setSelectedProductId(String(product.id))}
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

      </ScrollView>

      <View className="absolute bottom-4 right-5 items-end">
        {isFabMenuOpen ? (
          <View className="mb-3 gap-2">
            <FabMenuAction
              label="Add Metals"
              icon="gem"
              onPress={() => {
                setIsFabMenuOpen(false);
                Alert.alert(
                  'Add Metals',
                  'Metal creation is not connected in the mobile app yet.',
                );
              }}
            />
            <FabMenuAction
              label="Add Category"
              icon="layers"
              onPress={() => {
                setIsFabMenuOpen(false);
                onNavigate('categories');
              }}
            />
            <FabMenuAction
              label="Add Product"
              icon="box"
              onPress={() => {
                setIsFabMenuOpen(false);
                setIsAddProductFormVisible(true);
              }}
            />
          </View>
        ) : null}
        <View className="h-14 w-14 items-center justify-center">
          {!isFabMenuOpen ? (
            <Animated.View
              pointerEvents="none"
              className="absolute h-14 w-14 rounded-full bg-accent"
              style={{
                opacity: addButtonPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0],
                }),
                transform: [
                  {
                    scale: addButtonPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.22],
                    }),
                  },
                ],
              }}
            />
          ) : null}
          <Pressable
            onPress={() => setIsFabMenuOpen(open => !open)}
            className="h-14 w-14 items-center justify-center rounded-full border-2 border-accent-light bg-primary shadow-lg"
            accessibilityRole="button"
            accessibilityLabel={isFabMenuOpen ? 'Close add menu' : 'Open add menu'}
            accessibilityState={{ expanded: isFabMenuOpen }}
          >
            <ProductIcon name={isFabMenuOpen ? 'close' : 'plus'} color="#FFFFFF" size={24} />
          </Pressable>
        </View>
      </View>

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
        visible={isStockPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStockPickerVisible(false)}
      >
        <ModalBackdrop onClose={() => setIsStockPickerVisible(false)}>
          <Text className="text-lg font-bold text-slate-900">Select stock status</Text>
          <Text className="mt-1 text-xs text-muted">Choose which products to show.</Text>
          <View className="mt-4">
            {([
              { label: 'All stock', value: '' },
              { label: 'In stock', value: 'in-stock' },
              { label: 'Low stock', value: 'low-stock' },
              { label: 'Out of stock', value: 'out-of-stock' },
            ] as const).map(option => {
              const isSelected = stockFilter === option.value;
              return (
                <Pressable
                  key={option.value || 'all-stock'}
                  onPress={() => {
                    setStockFilter(option.value);
                    setIsStockPickerVisible(false);
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
                    {option.label}
                  </Text>
                  {isSelected ? <ProductIcon name="check" color="#004D40" /> : null}
                </Pressable>
              );
            })}
          </View>
        </ModalBackdrop>
      </Modal>

      <Modal
        visible={isAddProductFormVisible}
        animationType="slide"
        onRequestClose={() => setIsAddProductFormVisible(false)}
        statusBarTranslucent
      >
        <AddProducts
          onCancel={() => setIsAddProductFormVisible(false)}
          onSaved={() => {
            setIsAddProductFormVisible(false);
            setRefreshVersion(version => version + 1);
          }}
        />
      </Modal>

      <Modal
        visible={selectedProductId !== null}
        animationType="slide"
        onRequestClose={() => setSelectedProductId(null)}
        statusBarTranslucent
      >
        {selectedProductId ? (
          <ProductDetails
            productId={selectedProductId}
            onBack={() => setSelectedProductId(null)}
            onDeleted={() => {
              setSelectedProductId(null);
              setRefreshVersion(version => version + 1);
            }}
          />
        ) : null}
      </Modal>
    </View>
  );
}

function FabMenuAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: 'box' | 'layers' | 'gem';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center self-end rounded-full border border-border bg-surface py-2 pl-3 pr-2 shadow-md"
      accessibilityRole="button"
    >
      <Text className="mr-3 text-xs font-bold text-slate-800">{label}</Text>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
        <ProductIcon name={icon} color="#FFFFFF" size={17} />
      </View>
    </Pressable>
  );
}

type StatType = 'total' | 'active' | 'inactive' | 'outOfStock';

interface StatConfig {
  label: string;
  tag: string;
  icon: ProductIconName;
  color: string;
  backgroundColor: string;
}

const STAT_CONFIGS: Record<StatType, StatConfig> = {
  total: {
    label: 'Total Products',
    tag: 'All',
    icon: 'box',
    color: '#E6BF5A',
    backgroundColor: '#063D32',
  },
  active: {
    label: 'Active Products',
    tag: 'Live',
    icon: 'check-circle',
    color: '#E6BF5A',
    backgroundColor: '#0A3768',
  },
  inactive: {
    label: 'Inactive',
    tag: 'Paused',
    icon: 'pause-circle',
    color: '#E6BF5A',
    backgroundColor: '#4B164E',
  },
  outOfStock: {
    label: 'Out of Stock',
    tag: '0 Qty',
    icon: 'alert-triangle',
    color: '#E6BF5A',
    backgroundColor: '#571E38',
  },
};

const statCardStyles = StyleSheet.create({
  iconBadge: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 5,
  },
  selectedCard: {
    shadowColor: '#E6BF5A',
    shadowOpacity: 0.5,
    shadowRadius: 9,
    elevation: 8,
  },
});

function StatCard({
  type,
  value,
  isSelected,
  onPress,
}: {
  type: StatType;
  value: number;
  isSelected?: boolean;
  onPress?: () => void;
}) {
  const cfg = STAT_CONFIGS[type];

  return (
    <Pressable
      onPress={onPress}
      className="relative mb-3 min-h-[108px] w-[48.5%] overflow-hidden rounded-[18px] border-2 px-2.5 pb-2 pt-2 shadow-lg active:scale-[0.98]"
      style={[
        { backgroundColor: cfg.backgroundColor, borderColor: cfg.color },
        isSelected ? statCardStyles.selectedCard : undefined,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${cfg.label}: ${value}`}
      accessibilityState={{ selected: Boolean(isSelected) }}
    >
      <View className="absolute -left-3 -right-3 bottom-0 h-24" pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 300 96" preserveAspectRatio="none">
          <Path d="M0 64 C52 48 85 80 143 66 C210 49 245 22 300 18 V96 H0Z" fill={cfg.color} opacity={0.1} />
          <Path d="M0 78 C58 60 93 92 157 76 C213 62 258 39 300 36 V96 H0Z" fill={cfg.color} opacity={0.18} />
          <Path d="M0 90 C72 76 106 98 174 86 C224 76 265 55 300 52 V96 H0Z" fill={cfg.color} opacity={0.34} />
        </Svg>
      </View>
      <View className="z-10 min-h-10 flex-row items-center">
        <View className="mr-1.5 h-6 w-1 shrink-0 rounded-full" style={{ backgroundColor: cfg.color }} />
        <Text
          className="min-w-0 flex-1 pr-1 text-[11px] font-bold leading-[14px] text-white"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {cfg.label}
        </Text>
        <View
          className="h-10 w-10 shrink-0 items-center justify-center"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            className="h-7 w-7 items-center justify-center rounded-lg border"
            style={[
              statCardStyles.iconBadge,
              {
                borderColor: cfg.color,
                backgroundColor: `${cfg.color}35`,
                transform: [{ rotate: '45deg' }],
                shadowColor: cfg.color,
              },
            ]}
          >
            <View style={{ transform: [{ rotate: '-45deg' }] }}>
              <ProductIcon name={cfg.icon} color={cfg.color} size={18} />
            </View>
          </View>
          <Svg width={10} height={10} viewBox="0 0 24 24" className="absolute right-1 top-0">
            <Path
              d="M12 1.5 14.2 9.8 22.5 12l-8.3 2.2-2.2 8.3-2.2-8.3L1.5 12l8.3-2.2L12 1.5Z"
              fill="#FFF4C2"
            />
          </Svg>
        </View>
      </View>

      <Text
        className="z-10 mt-1 text-[24px] font-extrabold tracking-tight text-white"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value.toLocaleString('en-IN')}
      </Text>
      <View
        className="z-10 mt-1 max-w-full self-start rounded-full border px-2.5 py-1"
        style={{ backgroundColor: `${cfg.color}12`, borderColor: `${cfg.color}35` }}
      >
        <Text className="text-[10px] font-bold" style={{ color: cfg.color }} numberOfLines={1}>
          {cfg.tag}
        </Text>
      </View>
    </Pressable>
  );
}

function InventoryProductCard({
  product,
  onPressDetails,
  onUpdateStock,
  onDelete,
}: {
  product: Product;
  onPressDetails: () => void;
  onUpdateStock: () => void;
  onDelete: () => void;
}) {
  const stock = getNumber(product.total_stock);

  return (
    <SharedProductCard
      product={product}
      layout="inventory"
      subtitle={[product.category, product.metal_type, product.purity]
        .filter(value => typeof value === 'string' && value.length > 0)
        .join(' · ') || 'Uncategorized'}
      showStockBadge
      priceFallback="Price unavailable"
      onPress={onPressDetails}
      footer={
        <View className="flex-row items-center justify-between border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
          <View className="min-w-0 flex-1 pr-2">
            <Text className="text-[10px] text-slate-500" numberOfLines={1}>
              SKU <Text className="font-semibold text-slate-700">{String(product.product_code || '—')}</Text>
            </Text>
            <Text className="mt-0.5 text-[10px] text-slate-500">
              Stock: {stock} units
            </Text>
          </View>
          <View className="flex-row items-center">
            <Pressable
              onPress={onPressDetails}
              className="mr-2 h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50"
              accessibilityRole="button"
              accessibilityLabel={`View ${product.name || 'product'} details`}
            >
              <ProductIcon name="eye" color="#004D40" size={16} />
            </Pressable>
            <Pressable
              onPress={onUpdateStock}
              className="mr-2 flex-row items-center rounded-lg border border-primary/15 bg-primary/10 px-3 py-2"
              accessibilityRole="button"
              accessibilityLabel={`Update stock for ${product.name || 'product'}`}
            >
              <ProductIcon name="edit" color="#004D40" size={14} />
              <Text className="ml-1.5 text-[10px] font-bold text-primary">Stock</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              className="h-9 w-9 items-center justify-center rounded-lg border border-rose-100 bg-rose-50"
              accessibilityRole="button"
              accessibilityLabel={`Delete ${product.name || 'product'}`}
            >
              <ProductIcon name="trash" color="#DC2626" size={15} />
            </Pressable>
          </View>
        </View>
      }
    />
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
  | 'eye'
  | 'edit'
  | 'trash'
  | 'chevron'
  | 'check'
  | 'layers'
  | 'gem'
  | 'close'
  | 'check-circle'
  | 'pause-circle'
  | 'alert-triangle';

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
    eye: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
    edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z'],
    trash: ['M3 6h18', 'M8 6V4h8v2', 'm19 6-1 14H6L5 6', 'M10 11v5', 'M14 11v5'],
    chevron: ['m9 18 6-6-6-6'],
    check: ['M20 6 9 17l-5-5'],
    layers: ['m12 2 9 5-9 5-9-5 9-5Z', 'm3 12 9 5 9-5', 'm3 17 9 5 9-5'],
    gem: ['m12 3 8 6-8 12L4 9l8-6Z', 'M4 9h16', 'm9 9 3 12 3-12', 'm8 3 4 6 4-6'],
    close: ['M18 6 6 18', 'm6 6 12 12'],
    'check-circle': [
      'M22 11.08V12a10 10 0 1 1-5.93-9.14',
      'm9 11 3 3L22 4',
    ],
    'pause-circle': [
      'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
      'M10 15V9',
      'M14 15V9',
    ],
    'alert-triangle': [
      'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z',
      'M12 9v4',
      'M12 17h.01',
    ],
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
