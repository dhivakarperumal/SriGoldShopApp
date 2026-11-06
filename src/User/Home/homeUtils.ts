import { API_BASE_URL } from '../../api';
import type { HomeCategory } from './types';

export const resolveImageUrl = (value?: string) => {
  if (!value) return undefined;
  if (/^(https?:|data:|file:|content:)/i.test(value)) return value;
  const serverUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${serverUrl}/${value.replace(/^\/+/, '')}`;
};

export const getCategoryImage = (category: HomeCategory) => {
  let image: unknown = category.image ?? category.images;
  if (typeof image === 'string' && image.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(image);
      image = Array.isArray(parsed) ? parsed[0] : image;
    } catch {
      return resolveImageUrl(typeof image === 'string' ? image : undefined);
    }
  }
  if (Array.isArray(image)) image = image[0];
  return typeof image === 'string' ? resolveImageUrl(image) : undefined;
};

export const formatPrice = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : 'Price on request';
};
