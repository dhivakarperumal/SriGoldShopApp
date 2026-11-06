import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '../../api';
import { getProductImageUrl } from '../../utils/productImage';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';

type Category = {
  catId?: string | number;
  id?: string | number;
  name: string;
  status?: string;
  image?: string;
  images?: string | string[];
};

type Product = Record<string, unknown> & {
  id: string | number;
  name?: string;
  metal_type?: string;
  purity?: string;
  gross_weight?: string | number;
  offer_price?: string | number;
  final_selling_price?: string | number;
  mrp?: string | number;
};

type Banner = {
  id?: string | number;
  type?: string;
  active?: boolean | string | number;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  mobile_image?: string;
};

type GoldRate = {
  metal_type: string;
  purity: string;
  rate_per_gram?: string | number;
  rate_per_unit?: string | number;
  rate_unit?: string;
};

type HomeData = {
  categories: Category[];
  products: Product[];
  banners: Banner[];
  rates: GoldRate[];
};

type HomeErrors = Partial<Record<keyof HomeData, string>>;

const EMPTY_DATA: HomeData = {
  categories: [],
  products: [],
  banners: [],
  rates: [],
};

const DATA_REQUESTS: {
  key: keyof HomeData;
  path: string;
  validate: (data: unknown) => unknown[];
}[] = [
  {
    key: 'banners',
    path: '/banners',
    validate: data => {
      if (!Array.isArray(data)) throw new TypeError('Expected banners array.');
      return (data as Banner[]).filter(
        banner =>
          banner.type === 'hero' &&
          (banner.active === true ||
            banner.active === 1 ||
            banner.active === 'true'),
      );
    },
  },
  {
    key: 'categories',
    path: '/categories',
    validate: data => {
      if (!Array.isArray(data)) throw new TypeError('Expected categories array.');
      return (data as Category[])
        .filter(category => (category.status || 'Active') === 'Active')
        .sort((first, second) => Number(first.id) - Number(second.id));
    },
  },
  {
    key: 'products',
    path: '/products?page=1&limit=8&status=Active',
    validate: data => {
      const products = Array.isArray(data)
        ? data
        : typeof data === 'object' && data !== null && 'products' in data
          ? data.products
          : null;
      if (!Array.isArray(products)) {
        throw new TypeError('Expected a products array.');
      }
      return (products as Product[]).slice(0, 8);
    },
  },
  {
    key: 'rates',
    path: '/gold-rates/current',
    validate: data => {
      if (
        typeof data !== 'object' ||
        data === null ||
        !('rates' in data) ||
        !Array.isArray(data.rates)
      ) {
        throw new TypeError('Expected a rates array.');
      }
      return data.rates as GoldRate[];
    },
  },
];

const formatPrice = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : 'Price on request';
};

const resolveImageUrl = (value?: string) => {
  if (!value) return undefined;
  if (/^(https?:|data:|file:|content:)/i.test(value)) return value;
  const serverUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${serverUrl}/${value.replace(/^\/+/, '')}`;
};

const getCategoryImage = (category: Category) => {
  let image: unknown = category.image ?? category.images;
  if (typeof image === 'string' && image.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(image);
      image = Array.isArray(parsed) ? parsed[0] : image;
    } catch {
      return resolveImageUrl(
        typeof image === 'string' ? image : undefined,
      );
    }
  }
  if (Array.isArray(image)) image = image[0];
  return typeof image === 'string' ? resolveImageUrl(image) : undefined;
};

function UserHome({ user }: { user: AuthenticatedUser }) {
  const [data, setData] = useState<HomeData>(EMPTY_DATA);
  const [errors, setErrors] = useState<HomeErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadHome = async () => {
      setIsLoading(true);
      const results = await Promise.allSettled(
        DATA_REQUESTS.map(async request => {
          const response = await api.get(request.path, {
            signal: controller.signal,
          });
          return {
            key: request.key,
            value: request.validate(response.data),
          };
        }),
      );

      if (controller.signal.aborted) return;

      const nextData = { ...EMPTY_DATA };
      const nextErrors: HomeErrors = {};
      results.forEach((result, index) => {
        const request = DATA_REQUESTS[index];
        if (result.status === 'fulfilled') {
          Object.assign(nextData, { [result.value.key]: result.value.value });
        } else {
          console.error(`Failed to load user home ${request.key}:`, result.reason);
          nextErrors[request.key] = `${request.key[0].toUpperCase()}${request.key.slice(1)} could not be loaded. Pull down to retry.`;
        }
      });

      setData(nextData);
      setErrors(nextErrors);
      setIsLoading(false);
      setIsRefreshing(false);
    };

    loadHome().catch(error => {
      if (!controller.signal.aborted) {
        console.error('Failed to load user home:', error);
        setIsLoading(false);
        setIsRefreshing(false);
      }
    });

    return () => controller.abort();
  }, [refreshVersion]);

  const hero = data.banners[0];
  const heroImage = resolveImageUrl(hero?.mobile_image || hero?.image);

  return (
    <ScrollView
      className="flex-1 bg-[#fffaf0]"
      contentContainerClassName="pb-5"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            setRefreshVersion(version => version + 1);
          }}
          tintColor="#004D40"
          colors={['#004D40']}
        />
      }
    >
      <View className="px-4 pt-4">
        <View className="relative mb-5 min-h-44 overflow-hidden rounded-2xl border border-[#d9b568] bg-[#003b30] p-5">
          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              className="absolute inset-0 h-full w-full"
              resizeMode="cover"
              accessibilityLabel={hero?.title || 'Sri Golds featured jewellery'}
            />
          ) : null}
          <View className="absolute inset-0 bg-primary-dark/70" />
          <View className="relative">
            <Text className="text-[10px] font-bold uppercase tracking-[2px] text-accent-light">
              Sri Golds · Jewellery
            </Text>
            <Text className="mt-2 max-w-[280px] text-2xl font-bold text-white">
              {hero?.title || `Welcome${user.name ? `, ${user.name.split(' ')[0]}` : ''}`}
            </Text>
            <Text className="mt-2 max-w-[280px] text-sm leading-5 text-emerald-50">
              {hero?.subtitle ||
                hero?.description ||
                'Discover timeless designs and beautifully crafted jewellery.'}
            </Text>
            {errors.banners ? (
              <Text className="mt-2 text-xs text-amber-100" accessibilityRole="alert">
                {errors.banners}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="mb-3 flex-row items-end justify-between">
          <View>
            <Text className="text-lg font-bold text-[#153b2e]">Shop by category</Text>
            <Text className="mt-0.5 text-xs text-[#777066]">
              Explore our jewellery collections
            </Text>
          </View>
          {isLoading && data.categories.length === 0 ? (
            <ActivityIndicator size="small" color="#004D40" />
          ) : null}
        </View>
        {errors.categories ? (
          <Text className="mb-2 text-xs text-red-700" accessibilityRole="alert">
            {errors.categories}
          </Text>
        ) : data.categories.length === 0 && !isLoading ? (
          <Text className="mb-3 text-sm text-[#777066]">No categories available.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pb-3"
          >
            {data.categories.map((category, index) => (
              <View
                key={category.catId ?? category.id ?? `${category.name}-${index}`}
                className="w-[92px] items-center"
              >
                <View className="h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border-2 border-[#e9ce98] bg-white p-1">
                  {getCategoryImage(category) ? (
                    <Image
                      source={{ uri: getCategoryImage(category) }}
                      className="h-full w-full rounded-full"
                      resizeMode="cover"
                      accessibilityLabel={category.name}
                    />
                  ) : (
                    <Text className="text-2xl text-[#bd8732]" accessibilityLabel="Jewellery category">
                      ✦
                    </Text>
                  )}
                </View>
                <Text
                  className="mt-2 text-center text-xs font-semibold text-[#29231c]"
                  numberOfLines={2}
                >
                  {category.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View className="mb-5 overflow-hidden rounded-2xl border border-[#d9b568] bg-primary-dark p-4">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-accent-light">
            Today&apos;s market rates
          </Text>
          <Text className="mt-1 text-lg font-bold text-white">Know today&apos;s rates</Text>
          <Text className="mt-1 text-xs text-emerald-100">
            Gold and silver rates at a glance
          </Text>
          {errors.rates ? (
            <Text className="mt-3 text-xs text-amber-100" accessibilityRole="alert">
              {errors.rates}
            </Text>
          ) : (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {['999', '916', 'Silver'].map((purity, index) => {
                const rate =
                  index === 2
                    ? data.rates.find(item =>
                        item.metal_type.toLowerCase().includes('silver'),
                      )
                    : data.rates.find(
                        item =>
                          item.metal_type.toLowerCase() === 'gold' &&
                          item.purity.replace(/\D/g, '') === purity,
                      );
                const title = index === 2 ? 'Silver' : index === 0 ? '24K Gold' : '22K Gold';
                return (
                  <View
                    key={purity}
                    className="min-w-[30%] flex-1 rounded-xl border border-white/15 bg-white/10 p-3"
                  >
                    <Text className="text-[10px] text-emerald-100">{title}</Text>
                    <Text className="mt-1 text-sm font-bold text-[#f5d994]">
                      {rate
                        ? formatPrice(rate.rate_per_unit ?? rate.rate_per_gram)
                        : isLoading
                          ? '…'
                          : '—'}
                    </Text>
                    <Text className="mt-0.5 text-[9px] text-white/70">
                      per {rate?.rate_unit === 'carat' ? 'carat' : 'gram'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View className="mb-3 flex-row items-end justify-between">
          <View>
            <Text className="text-lg font-bold text-[#153b2e]">Featured jewellery</Text>
            <Text className="mt-0.5 text-xs text-[#777066]">
              A selection from our collection
            </Text>
          </View>
          {isLoading && data.products.length === 0 ? (
            <ActivityIndicator size="small" color="#004D40" />
          ) : null}
        </View>
        {errors.products ? (
          <Text className="mb-2 text-xs text-red-700" accessibilityRole="alert">
            {errors.products}
          </Text>
        ) : data.products.length === 0 && !isLoading ? (
          <Text className="mb-3 text-sm text-[#777066]">No products available.</Text>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {data.products.map(product => {
              const imageUrl = getProductImageUrl(product);
              return (
                <View
                  key={product.id}
                  className="mb-3 w-[48.5%] overflow-hidden rounded-xl border border-[#eadfc8] bg-white"
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      className="h-36 w-full bg-[#f7f2e8]"
                      resizeMode="cover"
                      accessibilityLabel={product.name || 'Jewellery product'}
                    />
                  ) : (
                    <View className="h-36 items-center justify-center bg-[#f7f2e8]">
                      <Text className="text-3xl text-[#bd8732]">✦</Text>
                    </View>
                  )}
                  <View className="p-3">
                    <Text className="text-sm font-semibold text-[#29231c]" numberOfLines={2}>
                      {product.name || 'Jewellery'}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#777066]" numberOfLines={1}>
                      {[product.purity || product.metal_type, product.gross_weight ? `${product.gross_weight} g` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    <Text className="mt-2 text-sm font-bold text-[#a66b00]">
                      {formatPrice(
                        product.offer_price ??
                          product.final_selling_price ??
                          product.mrp,
                      )}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => setRefreshVersion(version => version + 1)}
          className="mb-2 self-center rounded-full border border-[#d9b568] px-4 py-2"
          accessibilityRole="button"
          accessibilityLabel="Refresh home page"
        >
          <Text className="text-xs font-semibold text-primary">Refresh collections</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default UserHome;
