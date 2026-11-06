import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';

const HEADER_HEIGHT = 68;

const styles = StyleSheet.create({
  headerWrapper: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(217, 181, 104, 0.55)',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  accountMenu: {
    position: 'absolute',
    right: 12,
    width: 320,
    maxWidth: '92%',
    elevation: 12,
  },
});

type UserHeaderProps = {
  user: AuthenticatedUser;
  favoritesCount: number;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenFavorites: () => void;
};

function UserHeader({
  user,
  favoritesCount,
  onLogout,
  onOpenProfile,
  onOpenFavorites,
}: UserHeaderProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const displayName = user.name?.trim() || 'Welcome';
  const initial = displayName.charAt(0).toUpperCase() || 'U';
  const favoritesLabel = favoritesCount > 99 ? '99+' : String(favoritesCount);

  const confirmLogout = () => {
    setIsAccountMenuOpen(false);
    Alert.alert('Sign out?', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <>
      <View style={[styles.headerWrapper, { width }]}>
        {/* Full-width background image — no margins, no rounding */}
        <Image
          source={require('../Home/assets/header.png')}
          style={[styles.headerBackground, { width, height: HEADER_HEIGHT }]}
          resizeMode="cover"
          pointerEvents="none"
          accessible={false}
        />

        {/* Logo + brand name */}
        <View className="min-w-0 flex-1 flex-row items-center">
          <View className="mr-2.5 h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-accent/60 bg-white p-0.5">
            <Image
              source={require('../../Images/logo.png')}
              className="h-full w-full rounded-lg"
              resizeMode="contain"
              accessibilityLabel="Sri Golds logo"
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-black text-white">SRI GOLDS</Text>
            <Text
              className="text-[8px] font-bold text-accent-light"
              numberOfLines={1}
            >
              GOLD · JEWELLERY · LOANS
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View className="ml-2 flex-row items-center gap-2">
          <Pressable
            className="relative h-11 w-11 items-center justify-center rounded-xl"
            onPress={onOpenFavorites}
            accessibilityRole="button"
            accessibilityLabel={
              favoritesCount
                ? `Open favorites, ${favoritesCount} items`
                : 'Open favorites'
            }
          >
            <Svg width={27} height={27} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"
                stroke="#FFFFFF"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            {favoritesCount > 0 ? (
              <View className="absolute -right-0.5 -top-0.5 h-[19px] min-w-[19px] items-center justify-center rounded-full border border-primary bg-accent-light px-1">
                <Text className="text-[10px] font-bold text-primary-dark">
                  {favoritesLabel}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            className="h-11 w-11 items-center justify-center rounded-xl border-2 border-accent-light bg-primary-dark"
            onPress={() => setIsAccountMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open account menu"
            accessibilityState={{ expanded: isAccountMenuOpen }}
          >
            <Svg width={27} height={27} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                stroke="#FFFFFF"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isAccountMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAccountMenuOpen(false)}
        statusBarTranslucent
      >
        <View className="flex-1">
          <Pressable
            className="absolute inset-0 bg-black/15"
            onPress={() => setIsAccountMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close account menu"
          />
          <View
            className="rounded-[22px] border border-[#e7b848] bg-white p-4 shadow-xl"
            style={[styles.accountMenu, { top: insets.top + 74 }]}
          >
            <View className="flex-row items-center border-b border-[#eee5d6] pb-4">
              <View className="mr-3 h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#e7b848] bg-primary-dark">
                <Text className="font-serif text-2xl font-bold text-white">
                  {initial}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-base font-bold text-primary-dark"
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                {user.email ? (
                  <Text
                    className="mt-1 text-xs text-[#6b6b66]"
                    numberOfLines={1}
                  >
                    {user.email}
                  </Text>
                ) : null}
              </View>
            </View>

            <Pressable
              className="min-h-14 flex-row items-center border-b border-[#eee5d6] py-3"
              onPress={() => {
                setIsAccountMenuOpen(false);
                onOpenProfile();
              }}
              accessibilityRole="button"
              accessibilityLabel="Open my profile"
            >
              <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                  stroke="#003B2D"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text className="ml-4 flex-1 text-base font-semibold text-primary-dark">
                My Profile
              </Text>
              <Text className="text-2xl text-primary-dark">›</Text>
            </Pressable>

            <Pressable
              className="min-h-14 flex-row items-center pt-3"
              onPress={confirmLogout}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M10 17l5-5-5-5M15 12H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"
                  stroke="#C53B25"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text className="ml-4 text-base font-semibold text-primary-dark">
                Logout
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default UserHeader;
