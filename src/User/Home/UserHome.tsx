import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import api from '../../api';
import type { ProductCardData } from '../../Components/ProductCard';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';
import HomeBanner from './components/HomeBanner';
import HomeBannerSections from './components/HomeBannerSections';
import HomeCategory from './components/HomeCategory';
import HomeGoldRatesSection from './components/HomeGoldRatesSection';
import HomeMetalsShowcase from './components/HomeMetalsShowcase';
import HomeProductsSection from './components/HomeProductsSection';
import HomeReviewsSection from './components/HomeReviewsSection';
import type {
  HomeBanner as HomeBannerData,
  HomeCategory as HomeCategoryData,
  HomeGoldRate,
  HomeMetal,
  HomeProduct,
} from './types';

type HomeData = {
  banners: HomeBannerData[];
  categories: HomeCategoryData[];
  products: HomeProduct[];
  rates: HomeGoldRate[];
  metals: HomeMetal[];
};

type HomeErrors = Partial<Record<keyof HomeData, string>>;
type HomeDataKey = keyof HomeData;

const EMPTY_DATA: HomeData = {
  banners: [],
  categories: [],
  products: [],
  rates: [],
  metals: [],
};

const HOME_PRODUCT_METALS = ['Gold', 'Silver', 'Platinum', 'Diamond'] as const;

const DATA_REQUESTS: {
  key: HomeDataKey;
  path: string;
  validate: (data: unknown) => unknown[];
}[] = [
  {
    key: 'banners',
    path: '/banners',
    validate: data => {
      if (!Array.isArray(data)) throw new TypeError('Expected banners array.');
      return (data as HomeBannerData[]).filter(
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
      return (data as HomeCategoryData[])
        .filter(category => (category.status || 'Active') === 'Active')
        .sort((first, second) => Number(first.id) - Number(second.id));
    },
  },
  {
    key: 'products',
    path: '/products?page=1&limit=100&status=Active',
    validate: data => {
      const products = Array.isArray(data)
        ? data
        : typeof data === 'object' && data !== null && 'products' in data
          ? data.products
          : null;
      if (!Array.isArray(products)) {
        throw new TypeError('Expected a products array.');
      }
      return products as HomeProduct[];
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
      return data.rates as HomeGoldRate[];
    },
  },
  {
    key: 'metals',
    path: '/metals',
    validate: data => {
      if (!Array.isArray(data)) throw new TypeError('Expected metals array.');
      return (data as HomeMetal[]).filter(
        metal =>
          typeof metal.name === 'string' &&
          String(metal.status || '').toLowerCase() === 'active',
      );
    },
  },
];

function UserHome({
  user,
  onSelectProduct,
  onEnquireProduct,
  isFavorite,
  onToggleFavorite,
  onExploreMetal,
  onExploreCategory,
}: {
  user: AuthenticatedUser;
  onSelectProduct: (productId: string) => void;
  onEnquireProduct: (product: ProductCardData) => void;
  isFavorite: (productId: string) => boolean;
  onToggleFavorite: (product: ProductCardData) => void;
  onExploreMetal: (metalName: string) => void;
  onExploreCategory: (categoryName: string) => void;
}) {
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
          nextErrors[request.key] =
            `${request.key[0].toUpperCase()}${request.key.slice(1)} could not be loaded. Pull down to retry.`;
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

  const refreshHome = () => {
    setIsRefreshing(true);
    setRefreshVersion(version => version + 1);
  };

  return (
    <ScrollView
      className="flex-1 bg-[#fffaf0]"
      contentContainerClassName="grow pb-5"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refreshHome}
          tintColor="#004D40"
          colors={['#004D40']}
        />
      }
    >
      <HomeBanner
        banners={data.banners}
        userName={user.name}
        error={errors.banners}
        isLoading={isLoading}
      />
      <View className="px-4">
        <HomeCategory
          categories={data.categories}
          isLoading={isLoading}
          error={errors.categories}
          onSelectCategory={onExploreCategory}
        />
        <HomeGoldRatesSection
          rates={data.rates}
          isLoading={isLoading}
          error={errors.rates}
        />
        {HOME_PRODUCT_METALS.map(metal => (
          <View key={metal}>
            <HomeMetalsShowcase
              metalName={metal}
              metal={data.metals.find(metalData =>
                metalData.name.toLowerCase().includes(metal.toLowerCase()),
              )}
              isLoading={isLoading}
              onExploreMetal={onExploreMetal}
            />
            <HomeProductsSection
              metal={metal}
              products={data.products}
              isLoading={isLoading}
              error={errors.products}
              onSelectProduct={onSelectProduct}
              onEnquireProduct={onEnquireProduct}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          </View>
        ))}
        <HomeBannerSections />
      </View>
      <HomeReviewsSection refreshVersion={refreshVersion} />
    </ScrollView>
  );
}

export default UserHome;
