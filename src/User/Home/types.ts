export type HomeCategory = {
  catId?: string | number;
  id?: string | number;
  name: string;
  status?: string;
  image?: string;
  images?: string | string[];
};

export type HomeProduct = Record<string, unknown> & {
  id: string | number;
  name?: string;
  metal_type?: string;
  purity?: string;
  gross_weight?: string | number;
  offer_price?: string | number;
  final_selling_price?: string | number;
  mrp?: string | number;
};

export type HomeBanner = {
  id?: string | number;
  type?: string;
  active?: boolean | string | number;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  mobile_image?: string;
};

export type HomeGoldRate = {
  metal_type: string;
  purity: string;
  rate_per_gram?: string | number;
  rate_per_unit?: string | number;
  rate_unit?: string;
};

export type HomeReview = {
  id: string | number;
  user_name?: string;
  product_name?: string;
  rating?: number | string;
  comment?: string;
  review_image?: string;
  admin_reply?: string;
};
