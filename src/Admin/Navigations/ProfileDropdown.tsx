import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthenticatedUser } from '../Auth/Login';
import { LogoutIcon, ProfileIcon } from './NavIcons';

type ProfileDropdownProps = {
  visible: boolean;
  user: AuthenticatedUser;
  onClose: () => void;
  onProfile: () => void;
  onLogout: () => void;
};

function ProfileDropdown({
  visible,
  user,
  onClose,
  onProfile,
  onLogout,
}: ProfileDropdownProps) {
  const insets = useSafeAreaInsets();
  const displayName = user.name?.trim() || 'Admin User';
  const initial = displayName.charAt(0).toUpperCase();
  const roleName = user.role?.trim() || 'Administrator';

  // Offset below header (header height ~64px + status bar inset + gap)
  const topOffset = insets.top + 66;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        <Pressable
          className="absolute inset-0 bg-slate-950/25"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close profile menu"
        />

        <View
          style={[styles.dropdownContainer, { top: topOffset }]}
          className="absolute right-4 w-72 overflow-hidden rounded-2xl border border-slate-200/90 bg-surface"
        >
          {/* Gold accent hairline */}
          <View className="h-1 w-full bg-accent" />

          {/* User identity card */}
          <View className="flex-row items-center px-4 py-4 bg-slate-50/50">
            <View className="relative mr-3 h-12 w-12 items-center justify-center rounded-xl bg-primary border-2 border-accent shadow-sm">
              <Text className="text-lg font-bold text-white">{initial}</Text>
              <View className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-white" />
            </View>

            <View className="flex-1">
              <Text
                className="text-sm font-bold text-primary-dark"
                numberOfLines={1}
              >
                {displayName}
              </Text>

              <View className="mt-1 flex-row items-center">
                <View className="rounded-full bg-primary/10 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-primary capitalize">
                    {roleName}
                  </Text>
                </View>
              </View>

              {user.email ? (
                <Text
                  className="mt-1 text-xs text-muted"
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="h-px bg-slate-200/80" />

          {/* Menu Items */}
          <Pressable
            className="flex-row items-center px-4 py-3.5 active:bg-slate-50"
            onPress={onProfile}
            accessibilityRole="button"
          >
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ProfileIcon color="#004D40" size={16} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-800">
                My Profile
              </Text>
              <Text className="text-[11px] text-muted">
                Account information & settings
              </Text>
            </View>
          </Pressable>

          <View className="mx-4 h-px bg-slate-100" />

          <Pressable
            className="flex-row items-center px-4 py-3.5 active:bg-rose-50/60"
            onPress={onLogout}
            accessibilityRole="button"
          >
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
              <LogoutIcon color="#DC2626" size={16} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-danger">
                Sign Out
              </Text>
              <Text className="text-[11px] text-slate-400">
                End current session securely
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dropdownContainer: {
    shadowColor: '#002F28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
});

export default ProfileDropdown;
