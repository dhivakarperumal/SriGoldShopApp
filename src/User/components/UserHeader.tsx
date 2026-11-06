import { Alert, Image, Pressable, Text, View } from 'react-native';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';

type UserHeaderProps = {
  user: AuthenticatedUser;
  onLogout: () => void;
  onOpenProfile: () => void;
};

function UserHeader({ user, onLogout, onOpenProfile }: UserHeaderProps) {
  const displayName = user.name?.trim() || 'Welcome';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  const confirmLogout = () => {
    Alert.alert('Sign out?', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <View className="h-16 flex-row items-center justify-between border-b border-[#d9b568]/50 bg-primary px-4">
      <View className="min-w-0 flex-1 flex-row items-center">
        <View className="mr-2.5 h-10 w-10 items-center justify-center rounded-xl border border-accent/50 bg-white p-1">
          <Image
            source={require('../../Images/logo.png')}
            className="h-8 w-8"
            resizeMode="contain"
            accessibilityLabel="Sri Golds logo"
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-black tracking-wider text-white">
            SRI GOLDS
          </Text>
          <Text className="text-[9px] font-bold tracking-widest text-accent-light">
            GOLD · JEWELLERY · LOANS
          </Text>
        </View>
      </View>

      <View className="ml-2 flex-row items-center">
        <View className="mr-2 max-w-24">
          <Text className="text-[9px] text-emerald-100">Welcome</Text>
          <Text
            className="text-xs font-semibold text-white"
            numberOfLines={1}
          >
            {displayName}
          </Text>
        </View>
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-xl border border-accent-light bg-primary-dark"
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text className="text-sm font-bold text-white">{initial}</Text>
        </Pressable>
        <Pressable
          className="ml-1 h-10 w-8 items-center justify-center"
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text className="text-base font-bold text-white">↪</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default UserHeader;
