import { Modal, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type LogoutConfirmationProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function LogoutConfirmation({
  visible,
  onCancel,
  onConfirm,
}: LogoutConfirmationProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm rounded-3xl border border-[#eee5d6] bg-[#fffdf8] p-6">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1ed]">
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <Path
                d="M10 17l5-5-5-5M15 12H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"
                stroke="#C53B25"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text className="text-xl font-bold text-[#173c31]">Log out?</Text>
          <Text className="mt-2 text-sm leading-5 text-[#6b6257]">
            Are you sure you want to log out of your account?
          </Text>
          <View className="mt-6 flex-row gap-3">
            <Pressable
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#e7e0d5] bg-white px-4 py-3"
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel logout"
            >
              <Text className="text-sm font-semibold text-[#514638]">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              className="min-h-12 flex-1 items-center justify-center rounded-xl bg-[#c53b25] px-4 py-3"
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm logout"
            >
              <Text className="text-sm font-bold text-white">Log out</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default LogoutConfirmation;
