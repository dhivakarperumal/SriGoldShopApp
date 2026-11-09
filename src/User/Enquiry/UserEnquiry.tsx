import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';
import type { ProductCardData } from '../../Components/ProductCard';
import { EnquiryForm } from './EnquiryForm';

type UserEnquiryProps = {
  user: AuthenticatedUser;
  /** When set, the form is pre-filled with this product's details */
  product?: ProductCardData | null;
  /** Called after a successful submission (e.g. to clear the product) */
  onSuccess?: () => void;
};

function UserEnquiry({ user, product, onSuccess }: UserEnquiryProps) {
  const productName =
    typeof product?.name === 'string' || typeof product?.name === 'number'
      ? String(product.name)
      : null;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Page header */}
      <View className="border-b border-[#d9b568]/40 bg-white px-4 py-4">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#003B2D]">
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"
                stroke="#fff"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-extrabold text-[#1a1a1a]">
              {product ? 'Enquire About This Product' : 'Enquiry'}
            </Text>
            <Text
              className="text-[11px] text-slate-500"
              numberOfLines={1}
            >
              {productName ?? "We'll get back to you shortly"}
            </Text>
          </View>
        </View>

        {/* Product info chip when pre-filled */}
        {product ? (
          <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-[#e7d4a8] bg-[#fffaf0] px-3 py-2">
            <View className="h-7 w-7 items-center justify-center rounded-lg bg-[#003B2D]">
              <Text className="text-xs font-bold text-[#F5C45E]">P</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="text-[11px] font-bold text-[#1a1a1a]"
                numberOfLines={1}
              >
                {productName ?? 'Selected Product'}
              </Text>
              {product.product_code ? (
                <Text className="text-[10px] text-slate-500">
                  {String(product.product_code)}
                </Text>
              ) : null}
            </View>
            <View className="rounded-full bg-[#003B2D] px-2 py-0.5">
              <Text className="text-[9px] font-bold text-white">Pre-filled</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Shared form — pre-filled with product when available */}
      <EnquiryForm
        key={
          product
            ? String(
                product.id ??
                  product.product_id ??
                  product.productId ??
                  product.name ??
                  'product',
              )
            : 'no-product'
        }
        user={user}
        product={product ?? undefined}
        onSuccess={onSuccess}
      />
    </View>
  );
}

export default UserEnquiry;
