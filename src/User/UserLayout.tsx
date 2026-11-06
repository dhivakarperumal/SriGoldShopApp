import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api';
import type { ProductCardData } from '../Components/ProductCard';
import type { AuthenticatedUser } from '../Admin/Auth/Login';
import UserBottomNavigation, {
  type UserTab,
} from './components/UserBottomNavigation';
import UserHeader from './components/UserHeader';
import UserExplore from './Explore/UserExplore';
import UserHome from './Home/UserHome';
import UserAbout from './More/About/UserAbout';
import UserContact from './More/Contact/UserContact';
import MoreMenu, { type MorePage } from './More/MoreMenu';
import UserProfile from './Profile/UserProfile';
import UserProductDetails from './ProductDetails/UserProductDetails';
import UserProductEnquiry from './Enquiry/UserProductEnquiry';
import UserFavorites, { type WishlistItem } from './Favorites/UserFavorites';

function mediaPath(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    const stored = value.trim();
    try {
      const parsed: unknown = JSON.parse(stored);
      return mediaPath(parsed);
    } catch {
      return stored;
    }
  }
  if (Array.isArray(value)) {
    for (const media of value) {
      const path = mediaPath(media);
      if (path) return path;
    }
    return undefined;
  }
  if (typeof value === 'object' && value !== null) {
    if ('url' in value) {
      const path = mediaPath(value.url);
      if (path) return path;
    }
    if ('path' in value) {
      const path = mediaPath(value.path);
      if (path) return path;
    }
    if ('src' in value) return mediaPath(value.src);
    if ('image' in value) return mediaPath(value.image);
  }
  return undefined;
}

function getFirstImage(product: ProductCardData): string | undefined {
  const imageFields = [
    product.image,
    product.image_url,
    product.imageUrl,
    product.product_image,
    product.productImage,
    product.image_path,
    product.thumbnail,
    product.images,
    product.product_images,
  ];
  for (const field of imageFields) {
    const image = mediaPath(field);
    if (image) return image;
  }

  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (typeof variant !== 'object' || variant === null || !('images' in variant)) {
        continue;
      }
      const image = mediaPath(variant.images);
      if (image) return image;
    }
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Please try again.';
}

type UserLayoutProps = {
  user: AuthenticatedUser;
  onUserUpdated: (user: AuthenticatedUser) => void;
  onLogout: () => void;
};

function UserLayout({ user, onUserUpdated, onLogout }: UserLayoutProps) {
  const [activeTab, setActiveTab] = useState<UserTab>('home');
  const [visitedTabs, setVisitedTabs] = useState<Set<UserTab>>(
    () => new Set(['home']),
  );
  const [morePage, setMorePage] = useState<MorePage>(null);
  const [hasVisitedProfile, setHasVisitedProfile] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [lastSelectedProductId, setLastSelectedProductId] = useState<string | null>(
    null,
  );
  const [exploreMetalSelection, setExploreMetalSelection] = useState<{
    name: string;
    requestId: number;
  } | null>(null);
  const [enquiryProduct, setEnquiryProduct] = useState<ProductCardData | null>(null);
  const [favorites, setFavorites] = useState<WishlistItem[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isRefreshingFavorites, setIsRefreshingFavorites] = useState(false);
  const [favoritesError, setFavoritesError] = useState('');
  const [favoritesRequestVersion, setFavoritesRequestVersion] = useState(0);
  const [updatingFavoriteIds, setUpdatingFavoriteIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadFavorites = async () => {
      if (!user.user_id) {
        setFavorites([]);
        setFavoritesError('Your account could not be identified.');
        setIsLoadingFavorites(false);
        setIsRefreshingFavorites(false);
        return;
      }

      setIsLoadingFavorites(true);
      setFavoritesError('');
      try {
        const response = await api.get(`/wishlist/${user.user_id}`, {
          signal: controller.signal,
        });
        if (!Array.isArray(response.data)) {
          throw new TypeError('The wishlist response must be an array.');
        }
        setFavorites(response.data as WishlistItem[]);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to load favorites:', error);
        setFavoritesError(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingFavorites(false);
          setIsRefreshingFavorites(false);
        }
      }
    };

    loadFavorites().catch(error => {
      if (!controller.signal.aborted) {
        console.error('Failed to load favorites:', error);
        setFavoritesError(getErrorMessage(error));
        setIsLoadingFavorites(false);
        setIsRefreshingFavorites(false);
      }
    });

    return () => controller.abort();
  }, [user.user_id, favoritesRequestVersion]);

  const toggleFavorite = useCallback(
    async (product: ProductCardData) => {
      const productId = product.product_id ?? product.productId ?? product.id;
      if (
        productId == null ||
        !Number.isSafeInteger(Number(productId)) ||
        Number(productId) < 1
      ) {
        Alert.alert('Unable to update favorites', 'This product has no valid ID.');
        return;
      }
      const normalizedId = String(productId);
      if (updatingFavoriteIds.has(normalizedId)) return;

      setUpdatingFavoriteIds(current => new Set(current).add(normalizedId));
      const isFavorite = favorites.some(
        item => String(item.product_id ?? item.productId ?? item.id) === normalizedId,
      );
      try {
        if (isFavorite) {
          await api.delete(`/wishlist/${user.user_id}/${productId}`);
          setFavorites(current =>
            current.filter(
              item =>
                String(item.product_id ?? item.productId ?? item.id) !== normalizedId,
            ),
          );
        } else {
          const image = getFirstImage(product);
          await api.post('/wishlist', {
            user_id: user.user_id,
            product_id: Number(productId),
            variant_color: '',
            variant_size: '',
            image,
            email: user.email || '',
            price: Number(
              product.offer_price ??
                product.final_selling_price ??
                product.mrp ??
                0,
            ),
          });
          setFavorites(current => [
            {
              ...product,
              id: Number(productId),
              product_id: Number(productId),
              image: image || null,
              price: Number(
                product.offer_price ??
                  product.final_selling_price ??
                  product.mrp ??
                  0,
              ),
            },
            ...current,
          ]);
        }
      } catch (error) {
        console.error('Failed to update favorite:', error);
        Alert.alert(
          'Favorites update failed',
          getErrorMessage(error),
        );
      } finally {
        setUpdatingFavoriteIds(current => {
          const next = new Set(current);
          next.delete(normalizedId);
          return next;
        });
      }
    },
    [favorites, updatingFavoriteIds, user.email, user.user_id],
  );

  const isFavorite = useCallback(
    (productId: string) =>
      favorites.some(
        item => String(item.product_id ?? item.productId ?? item.id) === productId,
      ),
    [favorites],
  );

  const refreshFavorites = () => {
    setIsRefreshingFavorites(true);
    setFavoritesRequestVersion(version => version + 1);
  };

  const selectTab = (tab: UserTab) => {
    setActiveTab(tab);
    setVisitedTabs(current => new Set(current).add(tab));
    setSelectedProductId(null);
    if (tab !== 'more' || activeTab === 'more') setMorePage(null);
  };

  const selectProduct = (productId: string) => {
    setLastSelectedProductId(productId);
    setSelectedProductId(productId);
  };

  const exploreMetal = (metalName: string) => {
    setExploreMetalSelection(current => ({
      name: metalName,
      requestId: (current?.requestId ?? 0) + 1,
    }));
    selectTab('explore');
  };

  const selectMorePage = (page: MorePage) => {
    if (page === 'profile') setHasVisitedProfile(true);
    setMorePage(page);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (enquiryProduct) {
          setEnquiryProduct(null);
          return true;
        }
        if (selectedProductId) {
          setSelectedProductId(null);
          return true;
        }
        if (activeTab === 'more' && morePage) {
          setMorePage(null);
          return true;
        }
        if (activeTab !== 'home') {
          setActiveTab('home');
          setVisitedTabs(current => new Set(current).add('home'));
          setMorePage(null);
          return true;
        }
        return false;
      },
    );

    return () => subscription.remove();
  }, [activeTab, enquiryProduct, morePage, selectedProductId]);

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <UserHeader
        user={user}
        onLogout={onLogout}
        onOpenProfile={() => {
          setActiveTab('more');
          setVisitedTabs(current => new Set(current).add('more'));
          setHasVisitedProfile(true);
          setSelectedProductId(null);
          setMorePage('profile');
        }}
      />
      <SafeAreaView className="flex-1 bg-[#fffaf0]" edges={['left', 'right']}>
        <View className="flex-1">
          {lastSelectedProductId ? (
            <View
              className={selectedProductId ? 'flex-1' : 'hidden'}
            >
              <UserProductDetails
                productId={lastSelectedProductId}
                onBack={() => setSelectedProductId(null)}
                onEnquireProduct={setEnquiryProduct}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
              />
            </View>
          ) : null}
          <View
            className={
              !selectedProductId && activeTab === 'home' ? 'flex-1' : 'hidden'
            }
          >
            {visitedTabs.has('home') ? (
              <UserHome
                user={user}
                onSelectProduct={selectProduct}
                onEnquireProduct={setEnquiryProduct}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                onExploreMetal={exploreMetal}
              />
            ) : null}
          </View>
          <View
            className={
              !selectedProductId && activeTab === 'explore' ? 'flex-1' : 'hidden'
            }
          >
            {visitedTabs.has('explore') ? (
              <UserExplore
                onSelectProduct={selectProduct}
                onEnquireProduct={setEnquiryProduct}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                metalSelection={exploreMetalSelection}
              />
            ) : null}
          </View>
          <View
            className={
              !selectedProductId && activeTab === 'favorites'
                ? 'flex-1'
                : 'hidden'
            }
          >
            {visitedTabs.has('favorites') ? (
              <UserFavorites
                items={favorites}
                isLoading={isLoadingFavorites}
                error={favoritesError}
                isRefreshing={isRefreshingFavorites}
                onRefresh={refreshFavorites}
                onRetry={refreshFavorites}
                onSelectProduct={selectProduct}
                onEnquireProduct={setEnquiryProduct}
                onRemoveFavorite={toggleFavorite}
                onContinueShopping={() => selectTab('explore')}
              />
            ) : null}
          </View>
          <View
            className={
              !selectedProductId && activeTab === 'more' ? 'flex-1' : 'hidden'
            }
          >
            {morePage === 'about' ? (
              <UserAbout onBack={() => setMorePage(null)} />
            ) : morePage === 'contact' ? (
              <UserContact onBack={() => setMorePage(null)} />
            ) : morePage === 'profile' ? null : (
              <MoreMenu onSelect={selectMorePage} />
            )}
            {hasVisitedProfile ? (
              <View
                className={morePage === 'profile' ? 'flex-1' : 'hidden'}
              >
                <UserProfile
                  user={user}
                  onUserUpdated={onUserUpdated}
                  onBack={() => setMorePage(null)}
                  onLogout={onLogout}
                />
              </View>
            ) : null}
          </View>
          <View
            className={
              !selectedProductId && activeTab === 'enquiry'
                ? 'flex-1'
                : 'hidden'
            }
          >
            {visitedTabs.has('enquiry') ? (
              <View className="flex-1 items-center justify-center px-8">
                <Text className="text-xl font-bold text-primary-dark">
                  Enquiry
                </Text>
                <Text className="mt-2 text-center text-sm leading-5 text-slate-600">
                  This section is coming in the next step.
                </Text>
              </View>
            ) : null}
          </View>
          <UserBottomNavigation
            activeTab={activeTab}
            onSelect={selectTab}
          />
        </View>
      </SafeAreaView>
      {enquiryProduct ? (
        <UserProductEnquiry
          key={String(
            enquiryProduct.id ??
              enquiryProduct.product_id ??
              enquiryProduct.productId ??
              enquiryProduct.name,
          )}
          product={enquiryProduct}
          user={user}
          onClose={() => setEnquiryProduct(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

export default UserLayout;
