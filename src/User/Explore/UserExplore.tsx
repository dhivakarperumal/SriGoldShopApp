import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  NativeModules,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api';
import ProductCard from '../../Components/ProductCard';
import type { ProductCardData } from '../../Components/ProductCard';
import type { HomeProduct } from '../Home/types';
import HomeSkeleton from '../Home/components/HomeSkeleton';

type ExploreProduct = HomeProduct & {
  category?: string;
  subcategory?: string;
  product_type?: string;
  product_code?: string;
  brand?: string;
  rating?: string | number;
  discount?: string | number;
  total_stock?: string | number;
  stock?: string | number;
  created_at?: string;
};

type Facet = { name: string };
type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name';
type Availability = '' | 'in-stock' | 'out-of-stock';

function uniqueFacets(facets: Facet[]): Facet[] {
  const seen = new Set<string>();
  return facets
    .filter(facet => {
      const name = facet.name.trim();
      const normalizedName = name.toLowerCase();
      if (!name || seen.has(normalizedName)) return false;
      seen.add(normalizedName);
      return true;
    })
    .map(facet => ({ name: facet.name.trim() }));
}

const PAGE_SIZE = 100;
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A to Z' },
];
const PRICE_RANGES = [
  { label: 'Under ₹25K', min: 0, max: 25_000 },
  { label: '₹25K–₹50K', min: 25_000, max: 50_000 },
  { label: '₹50K–₹1L', min: 50_000, max: 100_000 },
  { label: '₹1L+', min: 100_000, max: undefined },
];
const OFFER_FILTERS = [10, 20, 30, 40];
const RATING_FILTERS = [4, 3, 2, 1];

type SystemNavigationBarModule = {
  setAppearance: (
    navigationBarColor: string,
    useDarkNavigationIcons: boolean,
    statusBarColor: string,
    useDarkStatusIcons: boolean,
  ) => Promise<void>;
};

const systemNavigationBar = NativeModules
  .SystemNavigationBar as SystemNavigationBarModule | undefined;

const getPrice = (product: ExploreProduct) =>
  Number(
    product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0,
  );

const getDiscount = (product: ExploreProduct) => {
  const discount = Number(product.discount ?? 0);
  if (discount > 0) return discount;
  const mrp = Number(product.mrp ?? 0);
  return mrp > 0
    ? Math.max(0, Math.round(((mrp - getPrice(product)) / mrp) * 100))
    : 0;
};

function UserExplore({
  isActive,
  onSelectProduct,
  onEnquireProduct,
  isFavorite,
  onToggleFavorite,
  metalSelection,
  categorySelection,
}: {
  isActive: boolean;
  onSelectProduct: (productId: string) => void;
  onEnquireProduct: (product: ProductCardData) => void;
  isFavorite: (productId: string) => boolean;
  onToggleFavorite: (product: ProductCardData) => void;
  metalSelection: { name: string; requestId: number } | null;
  categorySelection: { name: string; requestId: number } | null;
}) {
  const [products, setProducts] = useState<ExploreProduct[]>([]);
  const [categories, setCategories] = useState<Facet[]>([]);
  const [metals, setMetals] = useState<Facet[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMetal, setSelectedMetal] = useState('');
  const [offerThreshold, setOfferThreshold] = useState(0);
  const [minimumPrice, setMinimumPrice] = useState<number | undefined>();
  const [maximumPrice, setMaximumPrice] = useState<number | undefined>();
  const [minimumRating, setMinimumRating] = useState(0);
  const [availability, setAvailability] = useState<Availability>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (isActive) return;
    setSearch('');
    setSelectedCategory('');
    setSelectedMetal('');
    setOfferThreshold(0);
    setMinimumPrice(undefined);
    setMaximumPrice(undefined);
    setMinimumRating(0);
    setAvailability('');
    setSortBy('newest');
    setFiltersVisible(false);
    setSortDropdownVisible(false);
  }, [isActive]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !systemNavigationBar) return;

    const color = filtersVisible ? '#FFFFFF' : '#003B2D';
    systemNavigationBar
      .setAppearance(color, filtersVisible, color, filtersVisible)
      .catch(systemBarError => {
        console.error('Failed to update Android system bars:', systemBarError);
      });

    return () => {
      systemNavigationBar
        .setAppearance('#003B2D', false, '#003B2D', false)
        .catch(systemBarError => {
          console.error(
            'Failed to restore Android system bars:',
            systemBarError,
          );
        });
    };
  }, [filtersVisible]);

  useEffect(() => {
    if (!metalSelection) return;
    setSearch('');
    setSelectedCategory('');
    setSelectedMetal(metalSelection.name);
    setOfferThreshold(0);
    setMinimumPrice(undefined);
    setMaximumPrice(undefined);
    setMinimumRating(0);
    setAvailability('');
    setSortBy('newest');
  }, [metalSelection]);

  useEffect(() => {
    if (!categorySelection) return;
    setSearch('');
    setSelectedCategory(categorySelection.name);
    setSelectedMetal('');
    setOfferThreshold(0);
    setMinimumPrice(undefined);
    setMaximumPrice(undefined);
    setMinimumRating(0);
    setAvailability('');
    setSortBy('newest');
  }, [categorySelection]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadProducts = async () => {
      setIsLoading(true);
      setError('');

      try {
        const firstResponse = await api.get('/products', {
          params: { page: 1, limit: PAGE_SIZE, search: '', status: 'Active' },
          signal: controller.signal,
        });
        if (!Array.isArray(firstResponse.data?.products)) {
          throw new TypeError(
            'The products response must contain a products array.',
          );
        }

        const totalPages = Math.max(
          1,
          Number(firstResponse.data.pagination?.totalPages) || 1,
        );
        const otherPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get('/products', {
              params: {
                page: index + 2,
                limit: PAGE_SIZE,
                search: '',
                status: 'Active',
              },
              signal: controller.signal,
            }),
          ),
        );
        const allPages = [firstResponse, ...otherPages];
        const allProducts = allPages.flatMap(response => {
          if (!Array.isArray(response.data?.products)) {
            throw new TypeError(
              'A products page did not contain a products array.',
            );
          }
          return response.data.products as ExploreProduct[];
        });

        if (active) setProducts(allProducts);
      } catch (requestError) {
        if (active && !controller.signal.aborted) {
          console.error('Failed to load explore products:', requestError);
          setError('Products could not be loaded. Pull down to try again.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    const loadFacets = async () => {
      const [categoryResult, metalResult] = await Promise.allSettled([
        api.get('/categories', { signal: controller.signal }),
        api.get('/metals', { signal: controller.signal }),
      ]);
      if (!active || controller.signal.aborted) return;

      if (
        categoryResult.status === 'fulfilled' &&
        Array.isArray(categoryResult.value.data)
      ) {
        setCategories(
          categoryResult.value.data
            .filter(category => (category.status || 'Active') === 'Active')
            .map(category => ({ name: String(category.name || '') }))
            .filter(category => category.name),
        );
      } else if (categoryResult.status === 'rejected') {
        console.error(
          'Failed to load explore categories:',
          categoryResult.reason,
        );
      }

      if (
        metalResult.status === 'fulfilled' &&
        Array.isArray(metalResult.value.data)
      ) {
        setMetals(
          metalResult.value.data
            .filter(metal => metal.status === 'Active')
            .map(metal => ({ name: String(metal.name || '') }))
            .filter(metal => metal.name),
        );
      } else if (metalResult.status === 'rejected') {
        console.error('Failed to load explore metals:', metalResult.reason);
      }
    };

    loadProducts();
    loadFacets();

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshVersion]);

  const availableCategories = useMemo(() => {
    const productCategories = uniqueFacets(
      products
        .map(product => product.category)
        .filter((value): value is string => Boolean(value))
        .map(name => ({ name })),
    );
    const productCategoryNames = new Set(
      productCategories.map(category => category.name.toLowerCase()),
    );
    const matchingFacets = uniqueFacets(categories).filter(category =>
      productCategoryNames.has(category.name.toLowerCase()),
    );
    return matchingFacets.length ? matchingFacets : productCategories;
  }, [categories, products]);

  const availableMetals = useMemo(() => {
    const productMetals = uniqueFacets(
      products
        .map(product => product.metal_type)
        .filter((value): value is string => Boolean(value))
        .map(name => ({ name })),
    );
    const productMetalNames = new Set(
      productMetals.map(metal => metal.name.toLowerCase()),
    );
    const matchingFacets = uniqueFacets(metals).filter(metal =>
      productMetalNames.has(metal.name.toLowerCase()),
    );
    return matchingFacets.length ? matchingFacets : productMetals;
  }, [metals, products]);

  const maximumPriceBound = useMemo(
    () =>
      Math.ceil(
        Math.max(100_000, ...products.map(product => getPrice(product))) /
          25_000,
      ) * 25_000,
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter(product => {
      const matchesSearch =
        !query ||
        [
          product.name,
          product.product_code,
          product.category,
          product.subcategory,
          product.metal_type,
          product.product_type,
          product.brand,
        ].some(value =>
          String(value || '')
            .toLowerCase()
            .includes(query),
        );
      const matchesCategory =
        !selectedCategory ||
        String(product.category || '')
          .trim()
          .toLowerCase() === selectedCategory.toLowerCase();
      const matchesMetal =
        !selectedMetal ||
        String(product.metal_type || '')
          .trim()
          .toLowerCase() === selectedMetal.toLowerCase();
      const price = getPrice(product);
      const matchesPrice =
        (minimumPrice === undefined || price >= minimumPrice) &&
        (maximumPrice === undefined || price <= maximumPrice);
      const matchesAvailability =
        !availability ||
        (availability === 'in-stock'
          ? Number(product.total_stock ?? product.stock ?? 0) > 0
          : Number(product.total_stock ?? product.stock ?? 0) <= 0);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesMetal &&
        matchesPrice &&
        matchesAvailability &&
        (!offerThreshold || getDiscount(product) >= offerThreshold) &&
        (!minimumRating || Number(product.rating || 0) >= minimumRating)
      );
    });

    return filtered.sort((first, second) => {
      if (sortBy === 'price-low') return getPrice(first) - getPrice(second);
      if (sortBy === 'price-high') return getPrice(second) - getPrice(first);
      if (sortBy === 'name') {
        return String(first.name || '').localeCompare(
          String(second.name || ''),
        );
      }
      const firstDate = new Date(first.created_at || 0).getTime();
      const secondDate = new Date(second.created_at || 0).getTime();
      return sortBy === 'oldest'
        ? firstDate - secondDate
        : secondDate - firstDate;
    });
  }, [
    availability,
    maximumPrice,
    minimumPrice,
    minimumRating,
    offerThreshold,
    products,
    search,
    selectedCategory,
    selectedMetal,
    sortBy,
  ]);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedMetal('');
    setOfferThreshold(0);
    setMinimumPrice(undefined);
    setMaximumPrice(undefined);
    setMinimumRating(0);
    setAvailability('');
    setSortBy('newest');
  };

  const refresh = () => {
    setIsRefreshing(true);
    setRefreshVersion(version => version + 1);
  };

  return (
    <View className="flex-1 bg-[#fffdf8]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="grow px-4 pb-6 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor="#004D40"
            colors={['#004D40']}
          />
        }
      >
        {/* <View className="mb-4">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#a67b2e]">
            Sri Golds collection
          </Text>
          <Text className="mt-1 text-2xl font-bold text-[#153b2e]">
            Explore
          </Text>
          <Text className="mt-1 text-xs text-[#777066]">
            Find jewellery for every occasion
          </Text>
        </View> */}

        <View className="mb-4 flex-row items-center rounded-xl border border-[#e8dfd1] bg-white px-3">
          <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
            <Path
              d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM21 21l-4.35-4.35"
              stroke="#A77525"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search jewellery, category or metal"
            placeholderTextColor="#9a9286"
            className="ml-2 min-h-12 flex-1 text-sm text-[#30271b]"
            returnKeyType="search"
            accessibilityLabel="Search products"
          />
          {search ? (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text className="px-1 text-lg text-[#777066]">×</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-[#29231c]">
              {search.trim()
                ? `Results for “${search.trim()}”`
                : 'All products'}
            </Text>
            <Text className="mt-0.5 text-xs text-[#81786b]">
              {isLoading
                ? 'Loading products…'
                : `${filteredProducts.length} products`}
            </Text>
          </View>
          <Pressable
            onPress={() => setFiltersVisible(visible => !visible)}
            className="flex-row items-center rounded-lg border border-[#e8dfd1] bg-white px-3 py-2"
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersVisible }}
          >
            <Text className="mr-1.5 text-sm text-primary">☷</Text>
            <Text className="text-xs font-semibold text-primary">Filters</Text>
          </Pressable>
        </View>

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xs font-medium text-[#62594d]">Sort by</Text>
          <Pressable
            onPress={() => setSortDropdownVisible(visible => !visible)}
            className="min-w-48 flex-row items-center justify-between rounded-lg border border-[#e8dfd1] bg-white px-3 py-2.5"
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${
              SORT_OPTIONS.find(option => option.value === sortBy)?.label
            }`}
            accessibilityState={{ expanded: sortDropdownVisible }}
          >
            <Text className="mr-3 text-xs font-semibold text-[#30271b]">
              {SORT_OPTIONS.find(option => option.value === sortBy)?.label}
            </Text>
            <Chevron
              direction={sortDropdownVisible ? 'up' : 'down'}
              color="#A77525"
            />
          </Pressable>
        </View>
        {isLoading && products.length === 0 ? (
          <View
            className="flex-row flex-wrap justify-between"
            accessibilityRole="progressbar"
            accessibilityLabel="Loading products"
          >
            {[0, 1, 2, 3].map(index => (
              <ExploreProductSkeleton key={index} />
            ))}
          </View>
        ) : error ? (
          <View className="items-center rounded-xl border border-rose-200 bg-white px-5 py-10">
            <Text
              className="text-center text-sm text-rose-700"
              accessibilityRole="alert"
            >
              {error}
            </Text>
            <Pressable
              onPress={refresh}
              className="mt-3 rounded-lg bg-primary px-4 py-2"
              accessibilityRole="button"
            >
              <Text className="text-xs font-semibold text-white">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : filteredProducts.length > 0 ? (
          <View className="flex-row flex-wrap justify-between">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={String(product.id ?? product.product_code ?? index)}
                product={product}
                layout="catalog"
                onPress={() => {
                  if (product.id != null) onSelectProduct(String(product.id));
                }}
                onEnquire={onEnquireProduct}
                isFavorite={
                  product.id != null && isFavorite(String(product.id))
                }
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </View>
        ) : (
          <View className="items-center rounded-xl border border-[#eee7dc] bg-white px-5 py-12">
            <Text className="text-3xl text-[#bd913e]">◇</Text>
            <Text className="mt-3 text-base font-bold text-[#29231c]">
              No products match these filters
            </Text>
            <Text className="mt-1 text-center text-xs text-[#81786b]">
              Try another search or clear your filters to see more jewellery.
            </Text>
            <Pressable
              onPress={clearFilters}
              className="mt-4 rounded-lg bg-primary px-4 py-2"
              accessibilityRole="button"
            >
              <Text className="text-xs font-semibold text-white">
                Clear filters
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <Modal
        visible={sortDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortDropdownVisible(false)}
      >
        <View className="flex-1 items-center justify-center px-8">
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={() => setSortDropdownVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close sort options"
          />
          <View className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#e8dfd1] bg-white shadow-xl">
            <Text className="border-b border-[#f1ece3] px-4 py-3 text-base font-bold text-[#29231c]">
              Sort products by
            </Text>
            {SORT_OPTIONS.map((option, index) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setSortBy(option.value);
                  setSortDropdownVisible(false);
                }}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  index < SORT_OPTIONS.length - 1
                    ? 'border-b border-[#f1ece3]'
                    : ''
                } ${sortBy === option.value ? 'bg-[#f5f8f3]' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: sortBy === option.value }}
              >
                <Text
                  className={`text-sm ${
                    sortBy === option.value
                      ? 'font-semibold text-primary'
                      : 'text-[#514638]'
                  }`}
                >
                  {option.label}
                </Text>
                {sortBy === option.value ? (
                  <Text className="text-base font-bold text-primary">✓</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
      <Modal
        visible={filtersVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View className="flex-1 bg-black/40">
          <SafeAreaView
            className="h-full w-full flex-1 bg-[#fffdf8]"
            edges={['top', 'bottom']}
          >
            <View className="border-b border-[#eee7dc] bg-white px-4 pb-4 pt-3">
              <View className="flex-row items-center">
                <View className="mr-2 flex-1 flex-row items-center">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#edf5f1]">
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M4 6h16M7 12h10m-7 6h4"
                        stroke="#08796a"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                  <View>
                    <Text className="text-xl font-bold text-[#173c31]">
                      Filters
                    </Text>
                    <Text className="mt-0.5 text-xs text-[#81786b]">
                      Refine your product selection
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={clearFilters}
                  className="mr-2 rounded-full border border-[#e7d6b2] bg-[#fffaf0] px-3 py-2"
                  accessibilityRole="button"
                  accessibilityLabel="Clear all filters"
                >
                  <Text className="text-base font-semibold text-[#9a6817]">
                    Clear All
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setFiltersVisible(false)}
                  className="h-9 w-9 items-center justify-center rounded-full border border-[#eee7dc] bg-[#fffdf8]"
                  accessibilityRole="button"
                  accessibilityLabel="Close filters"
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M18 6 6 18M6 6l12 12"
                      stroke="#514638"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  </Svg>
                </Pressable>
              </View>
            </View>
            <ScrollView
              className="flex-1"
              contentContainerClassName="px-4 py-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FilterSection title="Category">
                <CheckboxFilterList
                  options={availableCategories.map(item => ({
                    label: item.name,
                    count: products.filter(
                      product =>
                        String(product.category || '')
                          .trim()
                          .toLowerCase() === item.name.toLowerCase(),
                    ).length,
                  }))}
                  selected={selectedCategory}
                  onSelect={value =>
                    setSelectedCategory(current =>
                      current === value ? '' : value,
                    )
                  }
                />
              </FilterSection>
              <FilterSection title="Metal">
                <CheckboxFilterList
                  options={availableMetals.map(item => ({
                    label: item.name,
                    count: products.filter(
                      product =>
                        String(product.metal_type || '')
                          .trim()
                          .toLowerCase() === item.name.toLowerCase(),
                    ).length,
                  }))}
                  selected={selectedMetal}
                  onSelect={value =>
                    setSelectedMetal(current =>
                      current === value ? '' : value,
                    )
                  }
                />
              </FilterSection>
              <FilterSection title="Offer Percentage">
                <CheckboxFilterList
                  options={OFFER_FILTERS.map(value => ({
                    label: `${value}% and above`,
                    count: products.filter(
                      product => getDiscount(product) >= value,
                    ).length,
                  }))}
                  selected={
                    offerThreshold ? `${offerThreshold}% and above` : ''
                  }
                  onSelect={value => {
                    const threshold = Number(value.replace('% and above', ''));
                    setOfferThreshold(current =>
                      current === threshold ? 0 : threshold,
                    );
                  }}
                />
              </FilterSection>
              <FilterSection title="Price Range">
                <PriceRangeSelector
                  maximumPriceBound={maximumPriceBound}
                  minimumPrice={minimumPrice}
                  maximumPrice={maximumPrice}
                  onChangeMinimum={setMinimumPrice}
                  onChangeMaximum={setMaximumPrice}
                />
              </FilterSection>
              <FilterSection title="Rating">
                <CheckboxFilterList
                  options={RATING_FILTERS.map(value => ({
                    label: `${value}★ and above`,
                    count: products.filter(
                      product => Number(product.rating || 0) >= value,
                    ).length,
                  }))}
                  selected={minimumRating ? `${minimumRating}★ and above` : ''}
                  onSelect={value => {
                    const rating = Number(value.charAt(0));
                    setMinimumRating(current =>
                      current === rating ? 0 : rating,
                    );
                  }}
                />
              </FilterSection>
              <FilterSection title="Availability">
                <CheckboxFilterList
                  options={[
                    {
                      label: 'In stock',
                      count: products.filter(
                        product =>
                          Number(product.total_stock ?? product.stock ?? 0) > 0,
                      ).length,
                    },
                    {
                      label: 'Out of stock',
                      count: products.filter(
                        product =>
                          Number(product.total_stock ?? product.stock ?? 0) <=
                          0,
                      ).length,
                    },
                  ]}
                  selected={
                    availability === 'in-stock'
                      ? 'In stock'
                      : availability === 'out-of-stock'
                      ? 'Out of stock'
                      : ''
                  }
                  onSelect={value => {
                    const nextValue =
                      value === 'In stock' ? 'in-stock' : 'out-of-stock';
                    setAvailability(current =>
                      current === nextValue ? '' : nextValue,
                    );
                  }}
                />
              </FilterSection>
            </ScrollView>
            <View className="border-t border-[#eee7dc] bg-white px-4 pb-3 pt-4">
              <Pressable
                onPress={() => setFiltersVisible(false)}
                className="min-h-14 items-center justify-center rounded-2xl bg-primary px-4 py-3 active:opacity-90"
                accessibilityRole="button"
                accessibilityLabel={`Show ${filteredProducts.length} filtered products`}
              >
                <Text className="text-lg font-bold text-white">
                  Show {filteredProducts.length} products
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function ExploreProductSkeleton() {
  return (
    <View className="mb-2.5 h-[310px] w-[48.5%] overflow-hidden rounded-[14px] border border-[#eadfc8] bg-white">
      <HomeSkeleton className="h-[148px] w-full rounded-none bg-[#eee8dc]" />
      <View className="px-2.5 pt-2">
        <HomeSkeleton className="h-2.5 w-3/5 bg-[#e8dfd0]" />
        <HomeSkeleton className="mt-2 h-3.5 w-4/5 bg-[#e8dfd0]" />
        <HomeSkeleton className="mt-2 h-2.5 w-2/5 bg-[#e8dfd0]" />
        <HomeSkeleton className="mt-3 h-4 w-1/2 bg-[#e8dfd0]" />
        <View className="mt-3 flex-row">
          <HomeSkeleton className="mr-1.5 h-8 flex-1 rounded-lg bg-[#f0ece4]" />
          <HomeSkeleton className="h-8 flex-1 rounded-lg bg-[#f0ece4]" />
        </View>
        <HomeSkeleton className="mt-3 h-9 w-full rounded-lg bg-[#e8dfd0]" />
      </View>
    </View>
  );
}

function Chevron({
  direction,
  color = '#81786b',
}: {
  direction: 'up' | 'down' | 'right';
  color?: string;
}) {
  const paths = {
    up: 'm6 15 6-6 6 6',
    down: 'm6 9 6 6 6-6',
    right: 'm9 18 6-6-6-6',
  };

  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d={paths[direction]}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View className="border-b border-[#eee7dc]">
      <Pressable
        onPress={() => setExpanded(current => !current)}
        className="min-h-10 flex-row items-center justify-between"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text className="text-sm font-bold text-[#30271b]">{title}</Text>
        <Chevron direction={expanded ? 'down' : 'right'} />
      </Pressable>
      {expanded ? <View className="pb-2">{children}</View> : null}
    </View>
  );
}

function CheckboxFilterList({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; count: number }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (!options.length) {
    return (
      <Text className="py-1 text-xs text-[#81786b]">
        No options available.
      </Text>
    );
  }

  return (
    <View>
      {options.map(option => {
        const isSelected = selected === option.label;
        return (
          <Pressable
            key={option.label}
            onPress={() => onSelect(option.label)}
            className="min-h-7 flex-row items-center"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <View
              className={`mr-2 h-4 w-4 items-center justify-center rounded-[3px] border ${
                isSelected
                  ? 'border-[#c88916] bg-[#c88916]'
                  : 'border-[#aaa69f] bg-white'
              }`}
            >
              {isSelected ? (
                <Text className="text-xs font-bold leading-4 text-white">
                  ✓
                </Text>
              ) : null}
            </View>
            <Text
              className="flex-1 text-xs text-[#514638]"
              numberOfLines={1}
            >
              {option.label}
            </Text>
            <Text className="text-xs text-[#9a9286]">{option.count}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PriceRangeSelector({
  maximumPriceBound,
  minimumPrice,
  maximumPrice,
  onChangeMinimum,
  onChangeMaximum,
}: {
  maximumPriceBound: number;
  minimumPrice?: number;
  maximumPrice?: number;
  onChangeMinimum: (value: number | undefined) => void;
  onChangeMaximum: (value: number | undefined) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const lowerValue = minimumPrice ?? 0;
  const upperValue = maximumPrice ?? maximumPriceBound;
  const lowerPosition = (lowerValue / maximumPriceBound) * 100;
  const upperPosition = (upperValue / maximumPriceBound) * 100;

  const updateFromPosition = (locationX: number) => {
    if (!trackWidth) return;
    const value = Math.round(
      (Math.max(0, Math.min(locationX, trackWidth)) / trackWidth) *
        maximumPriceBound,
    );
    if (Math.abs(value - lowerValue) <= Math.abs(value - upperValue)) {
      onChangeMinimum(value === 0 ? undefined : Math.min(value, upperValue));
    } else {
      onChangeMaximum(
        value >= maximumPriceBound ? undefined : Math.max(value, lowerValue),
      );
    }
  };

  const selectRange = (range: (typeof PRICE_RANGES)[number]) => {
    if (minimumPrice === range.min && maximumPrice === range.max) {
      onChangeMinimum(undefined);
      onChangeMaximum(undefined);
    } else {
      onChangeMinimum(range.min || undefined);
      onChangeMaximum(range.max);
    }
  };

  return (
    <View>
      <View
        className="mx-2 mt-4 h-6 justify-center"
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={event =>
          updateFromPosition(event.nativeEvent.locationX)
        }
        onResponderMove={event =>
          updateFromPosition(event.nativeEvent.locationX)
        }
        accessibilityLabel="Adjust price range"
        accessibilityHint="Touch or drag the range line to adjust its endpoints"
      >
        <View className="h-1 rounded-full bg-[#eadfc9]">
          <View
            className="absolute h-1 rounded-full bg-[#d49a32]"
            style={{
              left: `${lowerPosition}%`,
              width: `${Math.max(0, upperPosition - lowerPosition)}%`,
            }}
          />
        </View>
        <View
          className="absolute -ml-1.5 h-3 w-3 rounded-full border-2 border-[#c88916] bg-white"
          style={{ left: `${lowerPosition}%` }}
        />
        <View
          className="absolute -ml-1.5 h-3 w-3 rounded-full border-2 border-[#c88916] bg-white"
          style={{ left: `${upperPosition}%` }}
        />
      </View>
      <View className="mb-2 flex-row justify-between">
        <Text className="text-[11px] text-[#81786b]">
          ₹{lowerValue.toLocaleString('en-IN')}
        </Text>
        <Text className="text-[11px] text-[#81786b]">
          ₹{upperValue.toLocaleString('en-IN')}
        </Text>
      </View>
      <View className="flex-row flex-wrap">
        {PRICE_RANGES.map(range => {
          const isSelected =
            minimumPrice === range.min && maximumPrice === range.max;
          return (
            <Pressable
              key={range.label}
              onPress={() => selectRange(range)}
              className={`mb-1.5 mr-1.5 rounded border px-2 py-1.5 ${
                isSelected
                  ? 'border-[#d49a32] bg-[#fbf2df]'
                  : 'border-[#eee7dc] bg-[#fcfbf8]'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                className={`text-[11px] ${
                  isSelected ? 'font-semibold text-[#9a6814]' : 'text-[#62594d]'
                }`}
              >
                {range.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default UserExplore;
