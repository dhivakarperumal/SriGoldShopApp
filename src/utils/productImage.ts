import { API_BASE_URL } from '../api';

export function getProductImageUrl(
  product: Record<string, unknown>,
): string | undefined {
  const variantImages = Array.isArray(product.variants)
    ? product.variants.flatMap(variant => {
        if (typeof variant !== 'object' || variant === null) {
          return [];
        }
        const images = (variant as Record<string, unknown>).images;
        return Array.isArray(images) ? images : [];
      })
    : [];
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
    ...variantImages,
  ];

  let image: string | undefined;
  for (const value of imageFields) {
    if (typeof value === 'string' && value.trim()) {
      image = value.trim();
      break;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const imageObject = value as Record<string, unknown>;
      const imagePath = [imageObject.url, imageObject.path, imageObject.src].find(
        candidate => typeof candidate === 'string' && candidate.trim().length > 0,
      );
      if (typeof imagePath === 'string') {
        image = imagePath.trim();
        break;
      }
    }
  }

  if (!image) {
    return undefined;
  }

  if (/^(https?:|data:|file:|content:)/i.test(image)) {
    return image;
  }

  const serverUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${serverUrl}/${image.replace(/^\/+/, '')}`;
}
