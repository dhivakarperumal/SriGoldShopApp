import { useCallback, useEffect, useState } from 'react';
import { Alert, StatusBar, Text, View } from 'react-native';
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

function getFirstImage(product: ProductCardData): string | undefined {
  const image = product.image || product.image_url || product.product_image;
  if (typeof image === 'string') return image;
  if (Array.isArray(product.images)) {
    const first = product.images[0];
    if (typeof first === 'string') return first;
    if (
      typeof first === 'object' &&
      first !== null &&
      'url' in first &&
      typeof first.url === 'string'
    ) {
      return first.url;
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
  const [morePage, setMorePage] = useState<MorePage>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
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
    setSelectedProductId(null);
    if (tab !== 'more' || activeTab === 'more') setMorePage(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <UserHeader
        user={user}
        onLogout={onLogout}
        onOpenProfile={() => {
          setActiveTab('more');
          setSelectedProductId(null);
          setMorePage('profile');
        }}
      />
      <SafeAreaView className="flex-1 bg-[#fffaf0]" edges={['left', 'right']}>
        <View className="flex-1">
          {selectedProductId ? (
            <UserProductDetails
              productId={selectedProductId}
              onBack={() => setSelectedProductId(null)}
              onEnquireProduct={setEnquiryProduct}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          ) : activeTab === 'home' ? (
            <UserHome
              user={user}
              onSelectProduct={setSelectedProductId}
              onEnquireProduct={setEnquiryProduct}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          ) : activeTab === 'explore' ? (
            <UserExplore
              onSelectProduct={setSelectedProductId}
              onEnquireProduct={setEnquiryProduct}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          ) : activeTab === 'favorites' ? (
            <UserFavorites
              items={favorites}
              isLoading={isLoadingFavorites}
              error={favoritesError}
              isRefreshing={isRefreshingFavorites}
              onRefresh={refreshFavorites}
              onRetry={refreshFavorites}
              onSelectProduct={setSelectedProductId}
              onEnquireProduct={setEnquiryProduct}
              onRemoveFavorite={toggleFavorite}
              onContinueShopping={() => setActiveTab('explore')}
            />
          ) : activeTab === 'more' ? (
            morePage === 'about' ? (
              <UserAbout onBack={() => setMorePage(null)} />
            ) : morePage === 'contact' ? (
              <UserContact onBack={() => setMorePage(null)} />
            ) : morePage === 'profile' ? (
              <UserProfile
                user={user}
                onUserUpdated={onUserUpdated}
                onBack={() => setMorePage(null)}
                onLogout={onLogout}
              />
            ) : (
              <MoreMenu onSelect={setMorePage} />
            )
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-xl font-bold text-primary-dark">
                Enquiry
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-600">
                This section is coming in the next step.
              </Text>
            </View>
          )}
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
