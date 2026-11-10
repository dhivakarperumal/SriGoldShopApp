import {
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

type LoginPromptModalProps = {
  visible: boolean;
  reason?: string;
  onLogin: () => void;
  onDismiss: () => void;
};

function LoginPromptModal({
  visible,
  reason = 'Please log in to continue.',
  onLogin,
  onDismiss,
}: LoginPromptModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          className="absolute inset-0"
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View
          className="rounded-t-[28px] bg-white px-6 pt-5"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          {/* Handle bar */}
          <View className="mb-5 self-center h-1 w-10 rounded-full bg-slate-200" />

          {/* Icon */}
          <View className="mb-4 self-center h-16 w-16 items-center justify-center rounded-full bg-[#f0f9f6]">
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                stroke="#004D40"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          {/* Logo */}
          <View className="mb-1 self-center">
            <Image
              source={require('../../Images/logo.png')}
              className="h-10 w-28"
              resizeMode="contain"
              accessibilityLabel="Sri Golds"
            />
          </View>

          <Text className="mb-1 text-center text-xl font-black text-primary-dark">
            Login Required
          </Text>
          <Text className="mb-6 text-center text-sm leading-6 text-slate-500">
            {reason}
          </Text>

          {/* Login button */}
          <Pressable
            className="mb-3 h-14 items-center justify-center rounded-full bg-primary active:opacity-80"
            onPress={onLogin}
            accessibilityRole="button"
            accessibilityLabel="Go to login"
          >
            <Text className="text-base font-bold text-white">Login to Continue</Text>
          </Pressable>

          {/* Cancel */}
          <Pressable
            className="h-12 items-center justify-center rounded-full border border-slate-200 active:bg-slate-50"
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Continue browsing"
          >
            <Text className="text-sm font-semibold text-slate-500">
              Continue Browsing
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default LoginPromptModal;
