import { API_BASE_URL } from '../api';

export function getProductImageUrl(
  product: Record<string, unknown>,
): string | undefined {
  const imageFields = [
    product.image_url,
    product.imageUrl,
    product.product_image,
    product.productImage,
    product.image,
    product.image_path,
    product.imagePath,
    product.thumbnail,
    Array.isArray(product.images) ? product.images[0] : undefined,
  ];
  const imageValue = imageFields.find(
    value => typeof value === 'string' && value.trim().length > 0,
  );

  if (typeof imageValue !== 'string') {
    return undefined;
  }

  const image = imageValue.trim();
  if (/^(https?:|data:|file:|content:)/i.test(image)) {
    return image;
  }

  const serverUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${serverUrl}/${image.replace(/^\/+/, '')}`;
}
