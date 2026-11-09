import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';

type UserPageHeaderProps = {
  title: string;
  onBack: () => void;
  backAccessibilityLabel: string;
  subtitle?: string;
  rightContent?: ReactNode;
};

function UserPageHeader({
  title,
  onBack,
  backAccessibilityLabel,
  subtitle,
  rightContent,
}: UserPageHeaderProps) {
  return (
    <View className="flex-row items-center bg-[#003B2D] px-4 py-3">
      <Pressable
        className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/15"
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backAccessibilityLabel}
      >
        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
      </Pressable>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold text-white" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[10px] text-white/65" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightContent}
    </View>
  );
}

export default UserPageHeader;
