import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import ProductCard from '../../Components/ProductCard';
import type { ProductCardData } from '../../Components/ProductCard';
import type { HomeProduct } from '../Home/types';

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

const getPrice = (product: ExploreProduct) =>
  Number(product.offer_price ?? product.final_selling_price ?? product.mrp ?? 0);

const getDiscount = (product: ExploreProduct) => {
  const discount = Number(product.discount ?? 0);
  if (discount > 0) return discount;
  const mrp = Number(product.mrp ?? 0);
  return mrp > 0
    ? Math.max(0, Math.round(((mrp - getPrice(product)) / mrp) * 100))
    : 0;
};

function UserExplore({
  onSelectProduct,
  onEnquireProduct,
  isFavorite,
  onToggleFavorite,
}: {
  onSelectProduct: (productId: string) => void;
  onEnquireProduct: (product: ProductCardData) => void;
  isFavorite: (productId: string) => boolean;
  onToggleFavorite: (product: ProductCardData) => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

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
          throw new TypeError('The products response must contain a products array.');
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
            throw new TypeError('A products page did not contain a products array.');
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
        console.error('Failed to load explore categories:', categoryResult.reason);
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
    const productCategories = new Set(
      products.map(product => product.category).filter((value): value is string => Boolean(value)),
    );
    const matchingFacets = categories.filter(category =>
      productCategories.has(category.name),
    );
    return matchingFacets.length
      ? matchingFacets
      : [...productCategories].map(name => ({ name }));
  }, [categories, products]);

  const availableMetals = useMemo(() => {
    const productMetals = new Set(
      products.map(product => product.metal_type).filter((value): value is string => Boolean(value)),
    );
    const matchingFacets = metals.filter(metal =>
      [...productMetals].some(
        name => name.toLowerCase() === metal.name.toLowerCase(),
      ),
    );
    return matchingFacets.length
      ? matchingFacets
      : [...productMetals].map(name => ({ name }));
  }, [metals, products]);

  const popularProducts = useMemo(
    () => products.filter(product => product.name).slice(0, 8),
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
        ].some(value => String(value || '').toLowerCase().includes(query));
      const matchesCategory =
        !selectedCategory ||
        String(product.category || '').trim().toLowerCase() ===
          selectedCategory.toLowerCase();
      const matchesMetal =
        !selectedMetal ||
        String(product.metal_type || '').trim().toLowerCase() ===
          selectedMetal.toLowerCase();
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
        return String(first.name || '').localeCompare(String(second.name || ''));
      }
      const firstDate = new Date(first.created_at || 0).getTime();
      const secondDate = new Date(second.created_at || 0).getTime();
      return sortBy === 'oldest' ? firstDate - secondDate : secondDate - firstDate;
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
    <ScrollView
      className="flex-1 bg-[#fffdf8]"
      contentContainerClassName="px-4 pb-6 pt-4"
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
      <View className="mb-4">
        <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#a67b2e]">
          Sri Golds collection
        </Text>
        <Text className="mt-1 text-2xl font-bold text-[#153b2e]">Explore</Text>
        <Text className="mt-1 text-xs text-[#777066]">
          Find jewellery for every occasion
        </Text>
      </View>

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

      {popularProducts.length > 0 ? (
        <View className="mb-4">
          <Text className="mb-2 text-sm font-bold text-[#29231c]">Popular searches</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {popularProducts.map((product, index) => (
              <Pressable
                key={String(product.id ?? product.product_code ?? index)}
                onPress={() =>
                  setSearch(current =>
                    current === product.name ? '' : product.name || '',
                  )
                }
                className={`mr-2 rounded-full border px-3 py-2 ${
                  search === product.name
                    ? 'border-primary bg-[#edf5ef]'
                    : 'border-[#eee5d6] bg-white'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Search ${product.name}`}
                accessibilityState={{ selected: search === product.name }}
              >
                <Text className="max-w-36 text-xs font-medium text-[#514638]" numberOfLines={1}>
                  {product.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-bold text-[#29231c]">
            {search.trim() ? `Results for “${search.trim()}”` : 'All products'}
          </Text>
          <Text className="mt-0.5 text-xs text-[#81786b]">
            {isLoading ? 'Loading products…' : `${filteredProducts.length} products`}
          </Text>
        </View>
        <Pressable
          onPress={() => setFiltersVisible(visible => !visible)}
          className="flex-row items-center rounded-lg border border-[#e8dfd1] bg-white px-3 py-2"
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersVisible }}
        >
          <Text className="mr-1.5 text-sm text-primary">☷</Text>
          <Text className="text-xs font-semibold text-primary">
            {filtersVisible ? 'Hide filters' : 'Filters'}
          </Text>
        </Pressable>
      </View>

      {filtersVisible ? (
        <View className="mb-4 rounded-xl border border-[#eee7dc] bg-white p-3">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-[#29231c]">Filters</Text>
            <Pressable
              onPress={clearFilters}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <Text className="text-xs font-semibold text-[#a77525]">Clear all</Text>
            </Pressable>
          </View>

          <FilterChips
            title="Category"
            options={availableCategories.map(item => item.name)}
            selected={selectedCategory}
            onSelect={value => setSelectedCategory(current => current === value ? '' : value)}
          />
          <FilterChips
            title="Metal"
            options={availableMetals.map(item => item.name)}
            selected={selectedMetal}
            onSelect={value => setSelectedMetal(current => current === value ? '' : value)}
          />
          <FilterChips
            title="Offer"
            options={OFFER_FILTERS.map(value => `${value}%+`)}
            selected={offerThreshold ? `${offerThreshold}%+` : ''}
            onSelect={value => {
              const threshold = Number(value.replace('%+', ''));
              setOfferThreshold(current => current === threshold ? 0 : threshold);
            }}
          />
          <FilterChips
            title="Price"
            options={PRICE_RANGES.map(range => range.label)}
            selected={
              PRICE_RANGES.find(
                range => range.min === minimumPrice && range.max === maximumPrice,
              )?.label || ''
            }
            onSelect={value => {
              const range = PRICE_RANGES.find(option => option.label === value);
              if (range && minimumPrice === range.min && maximumPrice === range.max) {
                setMinimumPrice(undefined);
                setMaximumPrice(undefined);
              } else if (range) {
                setMinimumPrice(range.min || undefined);
                setMaximumPrice(range.max);
              }
            }}
          />
          <FilterChips
            title="Rating"
            options={RATING_FILTERS.map(value => `${value}★ & up`)}
            selected={minimumRating ? `${minimumRating}★ & up` : ''}
            onSelect={value => {
              const rating = Number(value.charAt(0));
              setMinimumRating(current => current === rating ? 0 : rating);
            }}
          />
          <FilterChips
            title="Availability"
            options={['In stock', 'Out of stock']}
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
              setAvailability(current => current === nextValue ? '' : nextValue);
            }}
          />
        </View>
      ) : null}

      <View className="mb-3 flex-row items-center justify-between rounded-lg border border-[#eee7dc] bg-white px-3 py-2">
        <Text className="text-xs font-medium text-[#62594d]">Sort by</Text>
        <View className="flex-1 flex-row flex-wrap justify-end">
          {SORT_OPTIONS.map(option => (
            <Pressable
              key={option.value}
              onPress={() => setSortBy(option.value)}
              className={`mb-1 ml-1 rounded-full px-2 py-1 ${
                sortBy === option.value ? 'bg-primary' : 'bg-[#f6f1e8]'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: sortBy === option.value }}
            >
              <Text
                className={`text-[9px] font-semibold ${
                  sortBy === option.value ? 'text-white' : 'text-[#514638]'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading && products.length === 0 ? (
        <View className="items-center rounded-xl border border-[#eee7dc] bg-white py-12">
          <ActivityIndicator color="#004D40" />
          <Text className="mt-3 text-xs text-[#81786b]">Loading the collection…</Text>
        </View>
      ) : error ? (
        <View className="items-center rounded-xl border border-rose-200 bg-white px-5 py-10">
          <Text className="text-center text-sm text-rose-700" accessibilityRole="alert">
            {error}
          </Text>
          <Pressable
            onPress={refresh}
            className="mt-3 rounded-lg bg-primary px-4 py-2"
            accessibilityRole="button"
          >
            <Text className="text-xs font-semibold text-white">Try again</Text>
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
              isFavorite={product.id != null && isFavorite(String(product.id))}
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
            <Text className="text-xs font-semibold text-white">Clear filters</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function FilterChips({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-bold text-[#514b42]">{title}</Text>
      {options.length ? (
        <View className="flex-row flex-wrap">
          {options.map(option => {
            const isSelected = selected === option;
            return (
              <Pressable
                key={option}
                onPress={() => onSelect(option)}
                className={`mb-1.5 mr-1.5 rounded-full border px-2.5 py-1.5 ${
                  isSelected
                    ? 'border-primary bg-[#edf5ef]'
                    : 'border-[#eee9e0] bg-[#faf9f6]'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  className={`text-[10px] ${
                    isSelected ? 'font-semibold text-primary' : 'text-[#777066]'
                  }`}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text className="text-[10px] text-[#81786b]">No options available.</Text>
      )}
    </View>
  );
}

export default UserExplore;
