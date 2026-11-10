import { View } from 'react-native';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';
import type { ProductCardData } from '../../Components/ProductCard';
import { EnquiryForm } from './EnquiryForm';

type UserEnquiryProps = {
  user: AuthenticatedUser | null;
  /** When set, the form is pre-filled with this product's details */
  product?: ProductCardData | null;
  /** Called after a successful submission (e.g. to clear the product) */
  onSuccess?: () => void;
};

function UserEnquiry({ user, product, onSuccess }: UserEnquiryProps) {
  return (
    <View className="flex-1 bg-slate-50">
      {/* Shared form â€” pre-filled with product when available */}
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
