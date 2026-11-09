import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';
import type { ProductCardData } from '../../Components/ProductCard';
import { EnquiryForm } from './EnquiryForm';

type UserProductEnquiryProps = {
  product: ProductCardData;
  user: AuthenticatedUser;
  onClose: () => void;
};

function UserProductEnquiry({ product, user, onClose }: UserProductEnquiryProps) {
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-lg font-extrabold text-slate-900">
              Enquire About This Product
            </Text>
            <Text className="mt-1 text-xs text-slate-500" numberOfLines={1}>
              {String(product.name || "Share your details and we'll get back to you.")}
            </Text>
          </View>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close enquiry"
          >
            <Text className="text-lg text-slate-600">×</Text>
          </Pressable>
        </View>

        {/* Shared form — pre-filled with product data */}
        <EnquiryForm user={user} product={product} onSuccess={onClose} />
      </SafeAreaView>
    </Modal>
  );
}

export default UserProductEnquiry;
