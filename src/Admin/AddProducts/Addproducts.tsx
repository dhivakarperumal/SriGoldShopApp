import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';

type Category = { name: string; subcategory?: string[] };
type Metal = { name: string; purity?: string; status?: string };
type GoldRate = {
  metal_type: string;
  purity: string;
  rate_per_gram?: number | string;
  rate_per_unit?: number | string;
  rate_unit?: string;
};
type CurrentGoldRates = {
  rates: GoldRate[];
  making_charge_type?: string;
  making_charge_value?: number | string;
  wastage_percentage?: number | string;
  rate_date?: string;
};
type Draft = {
  name: string;
  product_code: string;
  brand: string;
  category: string;
  subcategory: string;
  metal_type: string;
  product_type: string;
  purity: string;
  gross_weight: string;
  net_gold_weight: string;
  gold_rate_per_gram: string;
  making_charge_type: string;
  making_charge: string;
  wastage_type: string;
  wastage: string;
  stone_weight: string;
  stone_charges: string;
  other_charges: string;
  stone_type: string;
  huid: string;
  available_sizes: string;
  product_size: string;
  length: string;
  width: string;
  height: string;
  ring_size: string;
  bangle_size: string;
  chain_length: string;
  mrp: string;
  offer: string;
  offer_type: string;
  fixed_discount_amount: string;
  gst_rate: string;
  price_includes_gst: boolean;
  description: string;
  highlights: string;
  specifications: string;
  care_instructions: string;
  warranty: string;
  total_stock: string;
  warehouse: string;
  status: string;
  featured: boolean;
  new_arrival: boolean;
  best_seller: boolean;
  images: string[];
  size_guide_chart: string;
  video: string;
  certificate: string;
  rating: string;
};

type SelectableField =
  | 'category'
  | 'subcategory'
  | 'metal_type'
  | 'product_type'
  | 'purity'
  | 'making_charge_type'
  | 'wastage_type'
  | 'stone_type'
  | 'product_size'
  | 'offer_type'
  | 'status';

const EMPTY: Draft = {
  name: '',
  product_code: '',
  brand: 'Sri Gold',
  category: '',
  subcategory: '',
  metal_type: '',
  product_type: 'Traditional',
  purity: '',
  gross_weight: '',
  net_gold_weight: '',
  gold_rate_per_gram: '',
  making_charge_type: 'Percentage',
  making_charge: '',
  wastage_type: 'Percentage',
  wastage: '',
  stone_weight: '0',
  stone_charges: '0',
  other_charges: '0',
  stone_type: 'None',
  huid: '',
  available_sizes: '',
  product_size: '',
  length: '',
  width: '',
  height: '',
  ring_size: '',
  bangle_size: '',
  chain_length: '',
  mrp: '',
  offer: '0',
  offer_type: 'None',
  fixed_discount_amount: '0',
  gst_rate: '',
  price_includes_gst: true,
  description: '',
  highlights: '',
  specifications: '',
  care_instructions: '',
  warranty: '',
  total_stock: '0',
  warehouse: 'Main Shop',
  status: 'Active',
  featured: false,
  new_arrival: false,
  best_seller: false,
  images: [],
  size_guide_chart: '',
  video: '',
  certificate: '',
  rating: '0',
};

const GOLD_PURITY: Record<string, string> = {
  '999': '24K / 999',
  '916': '22K / 916',
  '833': '20K / 833',
  '750': '18K / 750',
  '585': '14K / 585',
};
const GOLD_KARAT: Record<string, string> = {
  '999': '24K',
  '916': '22K',
  '833': '20K',
  '750': '18K',
  '585': '14K',
};
const GOLD_PURITY_CODES: Record<string, string> = {
  '24k': '999',
  '22k': '916',
  '20k': '833',
  '18k': '750',
  '14k': '585',
};
const FALLBACK_PURITY: Record<string, string[]> = {
  gold: ['24K / 999', '22K / 916', '20K / 833', '18K / 750', '14K / 585'],
  silver: ['999'],
  platinum: ['950', '900'],
  diamond: ['D-F / VVS', 'G-H / VS', 'I-J / SI'],
};

type Props = {
  onCancel: () => void;
  onSaved: () => void;
  productId?: string;
};

const amount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const getErrorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' && error !== null && 'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

function getPurityOptions(metal?: Metal, rates: GoldRate[] = []): string[] {
  if (!metal) return [];
  const ratePurities = rates
    .filter(rate => rate.metal_type.toLowerCase() === metal.name.toLowerCase())
    .map(rate => {
      const code = normalizePurity(rate.purity);
      return metal.name.toLowerCase() === 'gold'
        ? GOLD_KARAT[code] ?? rate.purity.trim()
        : rate.purity.trim();
    });
  if (ratePurities.length) return [...new Set(ratePurities)];

  const configured = (metal.purity ?? '').split(',').map(value => value.trim()).filter(Boolean);
  const values = configured.length
    ? configured.map(purity => GOLD_PURITY[purity] ?? purity)
    : FALLBACK_PURITY[metal.name.toLowerCase()] ?? [];
  return [...new Set(values.length ? values : ['Other'])];
}

function normalizePurity(purity: string): string {
  const normalized = purity.trim().toLowerCase().replace(/[\s/._-]/g, '');
  const code = Object.keys(GOLD_PURITY).find(
    assay => assay.toLowerCase() === normalized,
  );
  if (code) return code;
  const karat = Object.keys(GOLD_PURITY_CODES).find(
    alias => normalized === alias || normalized === `${alias}${GOLD_PURITY_CODES[alias]}`,
  );
  if (karat) return GOLD_PURITY_CODES[karat];
  return normalized;
}

function numericValue(value: number | string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const getProductText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;

const getProductList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const productToDraft = (product: Record<string, unknown>): Draft => {
  const variants = getProductList(product.variants);
  const firstVariant = variants[0];
  const variantImages =
    typeof firstVariant === 'object' && firstVariant !== null && 'images' in firstVariant
      ? getProductList(firstVariant.images)
      : [];
  const images = [...getProductList(product.images), ...variantImages]
    .map(image => {
      if (typeof image === 'string') return image;
      if (typeof image !== 'object' || image === null) return '';
      return getProductText(
        'url' in image ? image.url : 'path' in image ? image.path : 'src' in image ? image.src : '',
      );
    })
    .filter(Boolean);
  const highlights = getProductList(product.highlights);
  const availableSizes = getProductList(product.available_sizes);

  return {
    ...EMPTY,
    name: getProductText(product.name),
    product_code: getProductText(product.product_code),
    brand: getProductText(product.brand, EMPTY.brand),
    category: getProductText(product.category),
    subcategory: getProductText(product.subcategory),
    metal_type: getProductText(product.metal_type),
    product_type: getProductText(product.product_type, EMPTY.product_type),
    purity: getProductText(product.purity),
    gross_weight: getProductText(product.gross_weight),
    net_gold_weight: getProductText(product.net_gold_weight),
    gold_rate_per_gram: getProductText(product.gold_rate_per_gram),
    making_charge_type: getProductText(product.making_charge_type, EMPTY.making_charge_type),
    making_charge: getProductText(product.making_charge),
    wastage_type: getProductText(product.wastage_type, EMPTY.wastage_type),
    wastage: getProductText(product.wastage),
    stone_weight: getProductText(product.stone_weight, EMPTY.stone_weight),
    stone_charges: getProductText(product.stone_charges, EMPTY.stone_charges),
    other_charges: getProductText(product.other_charges, EMPTY.other_charges),
    stone_type: getProductText(product.stone_type, EMPTY.stone_type),
    huid: getProductText(product.huid),
    available_sizes: availableSizes.map(String).join(', '),
    product_size: getProductText(product.product_size),
    length: getProductText(product.length),
    width: getProductText(product.width),
    height: getProductText(product.height),
    ring_size: getProductText(product.ring_size),
    bangle_size: getProductText(product.bangle_size),
    chain_length: getProductText(product.chain_length),
    mrp: getProductText(product.mrp),
    offer: getProductText(product.offer, EMPTY.offer),
    offer_type: getProductText(product.offer_type, EMPTY.offer_type),
    fixed_discount_amount: getProductText(product.fixed_discount_amount, EMPTY.fixed_discount_amount),
    gst_rate: getProductText(product.gst_rate),
    price_includes_gst: product.price_includes_gst !== false,
    description: getProductText(product.description),
    highlights: highlights.map(String).join('\n'),
    specifications: getProductText(product.specifications),
    care_instructions: getProductText(product.care_instructions),
    warranty: getProductText(product.warranty),
    total_stock: getProductText(product.total_stock, EMPTY.total_stock),
    warehouse: getProductText(product.warehouse, EMPTY.warehouse),
    status: getProductText(product.status, EMPTY.status),
    featured: product.featured === true,
    new_arrival: product.new_arrival === true,
    best_seller: product.best_seller === true,
    images,
    size_guide_chart: getProductText(product.size_guide_chart),
    video: getProductText(product.video),
    certificate: getProductText(product.certificate),
    rating: getProductText(product.rating, EMPTY.rating),
  };
};

function AddProducts({ onCancel, onSaved, productId }: Props) {
  const [form, setForm] = useState<Draft>(EMPTY);
  const [originalProduct, setOriginalProduct] = useState<Record<string, unknown> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [metals, setMetals] = useState<Metal[]>([]);
  const [currentGoldRates, setCurrentGoldRates] = useState<CurrentGoldRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [ratesError, setRatesError] = useState('');
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sizeGuideFileName, setSizeGuideFileName] = useState('');
  const [sizeGuideIsImage, setSizeGuideIsImage] = useState(false);
  const [videoFileName, setVideoFileName] = useState('');
  const [certificateFileName, setCertificateFileName] = useState('');
  const [certificateIsImage, setCertificateIsImage] = useState(false);
  const [makingChargeTypeChanged, setMakingChargeTypeChanged] = useState(false);
  const [picker, setPicker] = useState<{ label: string; field: SelectableField; options: string[] } | null>(null);

  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      try {
        const [categoryResponse, metalResponse, codeResponse, productResponse] = await Promise.all([
          api.get('/categories'),
          api.get('/metals'),
          productId ? Promise.resolve(null) : api.get('/products/latest-code'),
          productId ? api.get(`/products/${productId}`) : Promise.resolve(null),
        ]);
        if (!active) return;
        const categoryItems: Category[] = Array.isArray(categoryResponse.data)
          ? categoryResponse.data
          : [];
        const metalItems: Metal[] = Array.isArray(metalResponse.data)
          ? metalResponse.data.filter((metal: Metal) => metal.status === 'Active')
          : [];
        const initialCategory =
          categoryItems.find(item => item.name === 'Gold Jewellery') ?? categoryItems[0];
        const initialMetal =
          metalItems.find(item => item.name.toLowerCase() === 'gold') ?? metalItems[0];
        setCategories(categoryItems);
        setMetals(metalItems);
        const productPayload = productResponse?.data;
        const product =
          typeof productPayload === 'object' && productPayload !== null
            ? 'product' in productPayload &&
              typeof productPayload.product === 'object' &&
              productPayload.product !== null
              ? productPayload.product as Record<string, unknown>
              : productPayload as Record<string, unknown>
            : null;
        if (productId && !product) {
          throw new Error('The server returned invalid product details.');
        }
        if (product) {
          setOriginalProduct(product);
          setForm(productToDraft(product));
          return;
        }
        setForm(current => ({
          ...current,
          category: initialCategory?.name ?? '',
          subcategory: initialCategory?.subcategory?.[0] ?? '',
          metal_type: initialMetal?.name ?? '',
          purity: getPurityOptions(initialMetal)[0] ?? '',
          product_code:
            typeof codeResponse?.data?.latestCode === 'string' ||
            typeof codeResponse?.data?.latestCode === 'number'
              ? String(codeResponse.data.latestCode)
              : '',
        }));
      } catch (error) {
        console.error('Failed to load product form data:', error);
        if (active) setLoadError(getErrorMessage(error, 'Could not load product form options.'));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadOptions();
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    let active = true;
    const loadCurrentRates = async () => {
      try {
        const { data } = await api.get<CurrentGoldRates>('/gold-rates/current');
        if (!Array.isArray(data?.rates)) {
          throw new Error('The current gold-rates response has no rates list.');
        }
        if (active) {
          setCurrentGoldRates({
            ...data,
            rates: data.rates.filter(
              rate => typeof rate?.metal_type === 'string' && typeof rate?.purity === 'string',
            ),
          });
          setRatesError('');
        }
      } catch (error) {
        console.error('Failed to load current gold rates:', error);
        if (active) {
          setRatesError(getErrorMessage(error, 'Could not load current gold rates.'));
        }
      } finally {
        if (active) setIsLoadingRates(false);
      }
    };
    loadCurrentRates();
    return () => {
      active = false;
    };
  }, []);

  const category = categories.find(item => item.name === form.category);
  const subcategories = category?.subcategory ?? [];
  const metal = metals.find(item => item.name === form.metal_type);
  const purityOptions = getPurityOptions(metal, currentGoldRates?.rates);
  const isDiamond = form.metal_type.toLowerCase() === 'diamond';
  const selectedRate = currentGoldRates?.rates.find(rate =>
    rate.metal_type.toLowerCase() === form.metal_type.toLowerCase() &&
    normalizePurity(rate.purity) === normalizePurity(form.purity),
  );
  const currentRateValue = numericValue(selectedRate?.rate_per_gram ?? selectedRate?.rate_per_unit);
  const effectiveGoldRate = currentRateValue ?? amount(form.gold_rate_per_gram);
  const effectiveMakingChargeType = makingChargeTypeChanged
    ? form.making_charge_type
    : currentGoldRates?.making_charge_type ?? form.making_charge_type;
  const effectiveMakingCharge =
    form.making_charge || currentGoldRates?.making_charge_value === undefined
      ? form.making_charge
      : String(currentGoldRates.making_charge_value);
  const effectiveWastage =
    form.wastage || currentGoldRates?.wastage_percentage === undefined
      ? form.wastage
      : String(currentGoldRates.wastage_percentage);

  const pricing = useMemo(() => {
    const netWeight = isDiamond
      ? amount(form.net_gold_weight)
      : Math.max(0, amount(form.gross_weight) - amount(form.stone_weight));
    const metalValue = netWeight * effectiveGoldRate;
    const making = effectiveMakingChargeType === 'Percentage'
      ? metalValue * amount(effectiveMakingCharge) / 100
      : amount(effectiveMakingCharge);
    const wastage = form.wastage_type === 'Percentage'
      ? netWeight * amount(effectiveWastage) / 100 * effectiveGoldRate
      : amount(effectiveWastage) * effectiveGoldRate;
    const subtotal = metalValue + making + wastage +
      amount(form.stone_charges) + amount(form.other_charges);
    const tax = subtotal * amount(form.gst_rate) / 100;
    const estimatedMrp = form.price_includes_gst ? subtotal : subtotal + tax;
    const requestedDiscount = form.offer_type === 'Percentage'
      ? estimatedMrp * amount(form.offer) / 100
      : form.offer_type === 'Fixed Amount'
        ? amount(form.fixed_discount_amount)
        : 0;
    const offerPrice = Math.max(0, estimatedMrp - Math.min(estimatedMrp, requestedDiscount));
    return { netWeight, metalValue, making, wastage, tax, estimatedMrp, offerPrice };
  }, [form, isDiamond, effectiveGoldRate, effectiveMakingChargeType, effectiveMakingCharge, effectiveWastage]);

  const update = <K extends keyof Draft>(field: K, value: Draft[K]) =>
    setForm(current => ({ ...current, [field]: value }));

  const selectOption = (field: SelectableField, value: string) => {
    if (field === 'category') {
      const selected = categories.find(item => item.name === value);
      setForm(current => ({
        ...current,
        category: value,
        subcategory: selected?.subcategory?.[0] ?? '',
      }));
    } else if (field === 'metal_type') {
      const selected = metals.find(item => item.name === value);
      setForm(current => ({
        ...current,
        metal_type: value,
        purity: getPurityOptions(selected, currentGoldRates?.rates)[0] ?? '',
        gold_rate_per_gram: '',
      }));
    } else if (field === 'purity') {
      setForm(current => ({ ...current, purity: value, gold_rate_per_gram: '' }));
    } else {
      setForm(current => ({ ...current, [field]: value }));
      if (field === 'making_charge_type') setMakingChargeTypeChanged(true);
    }
    setPicker(null);
  };

  const selectImages = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 10 - form.images.length,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Image selection failed', result.errorMessage || 'Could not select images.');
        return;
      }
      const assets = (result.assets ?? []).filter(asset => Boolean(asset.uri));
      if (!assets.length) return;

      const body = new FormData();
      assets.forEach((asset, index) => {
        body.append('images', {
          uri: asset.uri!,
          name: asset.fileName || `product-${Date.now()}-${index}.jpg`,
          type: asset.type || 'image/jpeg',
        } as unknown as Blob);
      });
      setIsUploading(true);
      const { data } = await api.post('/products/upload-media', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!Array.isArray(data?.images) || !data.images.every((item: unknown) => typeof item === 'string')) {
        throw new Error('The server did not return uploaded image paths.');
      }
      setForm(current => ({ ...current, images: [...current.images, ...data.images].slice(0, 10) }));
    } catch (error) {
      console.error('Product image upload failed:', error);
      Alert.alert('Upload failed', getErrorMessage(error, 'Could not upload product images.'));
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSizeGuide = async (
    file: { uri: string; name: string; type: string; size?: number | null },
  ) => {
    if (file.size != null && file.size > 5 * 1024 * 1024) {
      Alert.alert('File too large', 'The size guide must be 5 MB or smaller.');
      return;
    }

    try {
      setIsUploading(true);
      const body = new FormData();
      body.append('size_guide_chart', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as unknown as Blob);
      const { data } = await api.post('/products/upload-media', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (typeof data?.size_guide_chart !== 'string' || !data.size_guide_chart) {
        throw new Error('The server did not return the uploaded size guide path.');
      }
      setForm(current => ({ ...current, size_guide_chart: data.size_guide_chart }));
      setSizeGuideFileName(file.name);
      setSizeGuideIsImage(file.type.startsWith('image/'));
    } catch (error) {
      console.error('Size guide upload failed:', error);
      Alert.alert('Upload failed', getErrorMessage(error, 'Could not upload the size guide.'));
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSingleMedia = async (
    field: 'video' | 'certificate',
    file: { uri: string; name: string; type: string; size?: number | null },
    maxBytes: number,
  ) => {
    if (file.size != null && file.size > maxBytes) {
      Alert.alert(
        'File too large',
        `${field === 'video' ? 'Video' : 'Certificate'} must be ${field === 'video' ? '25' : '5'} MB or smaller.`,
      );
      return;
    }

    try {
      setIsUploading(true);
      const body = new FormData();
      body.append(field, {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as unknown as Blob);
      const { data } = await api.post('/products/upload-media', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (typeof data?.[field] !== 'string' || !data[field]) {
        throw new Error(`The server did not return the uploaded ${field} path.`);
      }
      setForm(current => ({ ...current, [field]: data[field] }));
      if (field === 'video') setVideoFileName(file.name);
      else {
        setCertificateFileName(file.name);
        setCertificateIsImage(file.type.startsWith('image/'));
      }
    } catch (error) {
      console.error(`Product ${field} upload failed:`, error);
      Alert.alert('Upload failed', getErrorMessage(error, `Could not upload the ${field}.`));
    } finally {
      setIsUploading(false);
    }
  };

  const selectProductVideo = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'video',
        selectionLimit: 1,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Video selection failed', result.errorMessage || 'Could not select a video.');
        return;
      }
      const asset = result.assets?.find(item => Boolean(item.uri));
      if (!asset?.uri) return;
      if (asset.type !== 'video/mp4') {
        Alert.alert('Unsupported video', 'Choose an MP4 video.');
        return;
      }
      await uploadSingleMedia('video', {
        uri: asset.uri,
        name: asset.fileName || `product-video-${Date.now()}.mp4`,
        type: 'video/mp4',
        size: asset.fileSize,
      }, 25 * 1024 * 1024);
    } catch (error) {
      console.error('Product video selection failed:', error);
      Alert.alert('Video selection failed', getErrorMessage(error, 'Could not select a video.'));
    }
  };

  const selectCertificateImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Image selection failed', result.errorMessage || 'Could not select an image.');
        return;
      }
      const asset = result.assets?.find(item => Boolean(item.uri));
      if (!asset?.uri) return;
      if (asset.type !== 'image/png' && asset.type !== 'image/jpeg') {
        Alert.alert('Unsupported image', 'Choose a PNG or JPG certificate.');
        return;
      }
      await uploadSingleMedia('certificate', {
        uri: asset.uri,
        name: asset.fileName || `certificate-${Date.now()}.${asset.type === 'image/png' ? 'png' : 'jpg'}`,
        type: asset.type,
        size: asset.fileSize,
      }, 5 * 1024 * 1024);
    } catch (error) {
      console.error('Certificate image selection failed:', error);
      Alert.alert('Image selection failed', getErrorMessage(error, 'Could not select an image.'));
    }
  };

  const selectCertificatePdf = async () => {
    try {
      const [file] = await pick({ type: [types.pdf], allowMultiSelection: false });
      if (!file.hasRequestedType || (file.type && file.type !== 'application/pdf')) {
        Alert.alert('Unsupported file', 'Choose a PDF certificate.');
        return;
      }
      await uploadSingleMedia('certificate', {
        uri: file.uri,
        name: file.name || `certificate-${Date.now()}.pdf`,
        type: 'application/pdf',
        size: file.size,
      }, 5 * 1024 * 1024);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      console.error('Certificate PDF selection failed:', error);
      Alert.alert('File selection failed', getErrorMessage(error, 'Could not select a PDF.'));
    }
  };

  const selectSizeGuideImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Image selection failed', result.errorMessage || 'Could not select an image.');
        return;
      }
      const asset = result.assets?.find(item => Boolean(item.uri));
      if (!asset?.uri) return;
      if (asset.type !== 'image/png' && asset.type !== 'image/jpeg') {
        Alert.alert('Unsupported image', 'Choose a PNG or JPG size guide image.');
        return;
      }
      await uploadSizeGuide({
        uri: asset.uri,
        name: asset.fileName || `size-guide-${Date.now()}.${asset.type === 'image/png' ? 'png' : 'jpg'}`,
        type: asset.type,
        size: asset.fileSize,
      });
    } catch (error) {
      console.error('Size guide image selection failed:', error);
      Alert.alert('Image selection failed', getErrorMessage(error, 'Could not select an image.'));
    }
  };

  const selectSizeGuidePdf = async () => {
    try {
      const [file] = await pick({ type: [types.pdf], allowMultiSelection: false });
      if (!file.hasRequestedType || (file.type && file.type !== 'application/pdf')) {
        Alert.alert('Unsupported file', 'Choose a PDF size guide.');
        return;
      }
      await uploadSizeGuide({
        uri: file.uri,
        name: file.name || `size-guide-${Date.now()}.pdf`,
        type: 'application/pdf',
        size: file.size,
      });
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      console.error('Size guide PDF selection failed:', error);
      Alert.alert('File selection failed', getErrorMessage(error, 'Could not select a PDF.'));
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.product_code.trim() || !form.category) {
      Alert.alert('Required details missing', 'Product name, SKU, and category are required.');
      return;
    }
    if (!isDiamond && amount(form.stone_weight) > amount(form.gross_weight)) {
      Alert.alert('Invalid weight', 'Stone weight cannot exceed gross weight.');
      return;
    }
    const rating = amount(form.rating);
    if (rating !== 0 && (rating < 1 || rating > 5)) {
      Alert.alert('Invalid rating', 'Average rating must be between 1 and 5, or 0 if unrated.');
      return;
    }
    const stock = Math.max(0, Math.floor(amount(form.total_stock)));
    const payload = {
      ...form,
      name: form.name.trim(),
      product_code: form.product_code.trim(),
      brand: form.brand.trim() || 'Sri Gold',
      available_sizes: form.available_sizes.split(',').map(value => value.trim()).filter(Boolean),
      total_stock: stock,
      stock_status: stock <= 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'In Stock',
      mrp: amount(form.mrp) || Number(pricing.estimatedMrp.toFixed(2)),
      offer: amount(form.offer),
      fixed_discount_amount: amount(form.fixed_discount_amount),
      offer_price: pricing.offerPrice,
      discount: pricing.estimatedMrp - pricing.offerPrice,
      final_selling_price: Number(pricing.offerPrice.toFixed(2)),
      gross_weight: amount(form.gross_weight),
      net_gold_weight: pricing.netWeight,
      gold_rate_per_gram: effectiveGoldRate,
      making_charge_type: effectiveMakingChargeType,
      making_charge: amount(effectiveMakingCharge),
      wastage: amount(effectiveWastage),
      stone_weight: amount(form.stone_weight),
      stone_charges: amount(form.stone_charges),
      other_charges: amount(form.other_charges),
      gst_rate: amount(form.gst_rate),
      variants: [{ images: form.images }],
      highlights: form.highlights.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
      rating,
    };
    setIsSaving(true);
    try {
      if (productId) {
        if (!originalProduct) {
          throw new Error('Product details are not loaded. Please try again.');
        }
        await api.put(`/products/${productId}`, { ...originalProduct, ...payload });
      } else {
        await api.post('/products', payload);
      }
      Alert.alert(
        productId ? 'Product updated' : 'Product added',
        productId ? 'The product details were updated.' : 'The product was added to inventory.',
        [
        { text: 'OK', onPress: onSaved },
        ],
      );
    } catch (error) {
      console.error('Product save failed:', error);
      Alert.alert('Could not save product', getErrorMessage(error, 'Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
          <Pressable
            onPress={onCancel}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <FormIcon name="back" color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-extrabold tracking-wide text-white">
              {productId ? 'Edit Product' : 'Add Product'}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-[10px] font-medium text-emerald-200">
                Sri Golds Jewellery
              </Text>
              <Text className="mx-1.5 text-[8px] text-emerald-400">◆</Text>
              <View className="rounded bg-emerald-950/60 px-1.5 py-0.5">
                <Text className="text-[9px] font-bold tracking-wider text-accent-light">
                  {productId ? 'EDIT PRODUCT' : 'NEW PRODUCT'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['bottom', 'left', 'right']}>
          <ActivityIndicator size="large" color="#004D40" />
          <Text className="mt-3 text-sm text-muted">Preparing product form…</Text>
        </SafeAreaView>
      </SafeAreaView>
    );
  }

  const openSelector = (label: string, field: SelectableField, options: string[]) =>
    setPicker({ label, field, options });

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      {/* Top Header */}
      <View className="h-16 flex-row items-center justify-between border-b border-[#00382E] bg-primary px-4">
        <View className="flex-1 flex-row items-center pr-3">
          <Pressable
            onPress={onCancel}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            accessibilityRole="button"
            accessibilityLabel="Back to products"
          >
            <FormIcon name="back" color="#FFFFFF" />
          </Pressable>

          <View className="flex-1">
            <Text className="text-base font-extrabold tracking-wide text-white" numberOfLines={1}>
              {productId ? 'Edit Product' : 'Add Product'}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-[10px] font-medium text-emerald-200" numberOfLines={1}>
                Sri Golds Jewellery
              </Text>
              <Text className="mx-1.5 text-[8px] text-emerald-400">◆</Text>
              <View className="rounded bg-emerald-950/60 px-1.5 py-0.5">
                <Text className="text-[9px] font-bold tracking-wider text-accent-light">
                  {productId ? 'EDIT PRODUCT' : form.product_code || 'NEW PRODUCT'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={save}
          disabled={isSaving || isUploading}
          className="h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/20 active:bg-accent/30"
          accessibilityRole="button"
          accessibilityLabel="Save product"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#F5C45E" />
          ) : (
            <FormIcon name="check" color="#F5C45E" />
          )}
        </Pressable>
      </View>

      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        <ScrollView className="flex-1" contentContainerClassName="px-4 pb-12 pt-4" keyboardShouldPersistTaps="handled">

        {loadError ? (
          <View className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <Text className="text-xs leading-5 text-rose-800">{loadError}</Text>
          </View>
        ) : null}

        <FormSection step="01" title="Basic information">
          <Field label="Product name" value={form.name} onChangeText={value => update('name', value)} placeholder="Classic gold chain" />
          <Field label="SKU / product code" value={form.product_code} onChangeText={() => {}} editable={false} placeholder="Not available" />
          <Selector label="Category" value={form.category || 'Select category'} onPress={() => openSelector('Select category', 'category', categories.map(item => item.name))} />
          {subcategories.length ? <Selector label="Subcategory" value={form.subcategory || 'Select subcategory'} onPress={() => openSelector('Select subcategory', 'subcategory', subcategories)} /> : null}
          <Selector label="Metal type" value={form.metal_type || 'Select metal'} onPress={() => openSelector('Select metal', 'metal_type', metals.map(item => item.name))} />
          <Selector label="Product type" value={form.product_type} onPress={() => openSelector('Product type', 'product_type', ['Traditional', 'Daily Wear', 'Bridal', 'Designer'])} />
        </FormSection>

        <FormSection step="02" title={isDiamond ? 'Diamond details' : 'Metal details'}>
          <Selector label={isDiamond ? 'Diamond grade' : 'Purity'} value={form.purity || 'Select purity'} onPress={() => openSelector('Purity', 'purity', purityOptions)} />
          <Field label="Gross weight (g)" value={form.gross_weight} onChangeText={value => update('gross_weight', value)} keyboardType="decimal-pad" placeholder="0.000" />
          <Field label={isDiamond ? 'Net diamond weight (ct)' : 'Net metal weight (g)'} value={isDiamond ? form.net_gold_weight : form.gross_weight ? pricing.netWeight.toFixed(3) : ''} onChangeText={value => update('net_gold_weight', value)} editable={isDiamond} keyboardType="decimal-pad" placeholder={isDiamond ? '0.000' : 'Auto calculated'} />
          <Field
            label={`Current metal rate (₹ / ${selectedRate?.rate_unit === 'carat' || isDiamond ? 'carat' : 'g'})`}
            value={currentRateValue !== undefined ? String(currentRateValue) : form.gold_rate_per_gram}
            onChangeText={value => update('gold_rate_per_gram', value)}
            editable={currentRateValue === undefined}
            keyboardType="decimal-pad"
            placeholder={isLoadingRates ? 'Loading current rate…' : 'Enter rate manually'}
          />
          {isLoadingRates ? (
            <Text className="-mt-2 text-xs text-muted">Fetching the latest rate…</Text>
          ) : null}
          {ratesError ? (
            <Text className="-mt-2 text-xs text-rose-700">
              Current rates unavailable: {ratesError} You can enter the rate manually.
            </Text>
          ) : null}
          {currentGoldRates?.rate_date ? (
            <Text className="-mt-2 text-xs text-muted">
              Rate date: {currentGoldRates.rate_date}
            </Text>
          ) : null}
          <Selector label="Making charge type" value={effectiveMakingChargeType} onPress={() => openSelector('Making charge type', 'making_charge_type', ['Percentage', 'Fixed Amount'])} />
          <Field label={effectiveMakingChargeType === 'Percentage' ? 'Making charge (%)' : 'Making charge (₹)'} value={effectiveMakingCharge} onChangeText={value => update('making_charge', value)} keyboardType="decimal-pad" placeholder={currentGoldRates ? 'Current rate default' : '0'} />
          <Selector label="Wastage type" value={form.wastage_type} onPress={() => openSelector('Wastage type', 'wastage_type', ['Percentage', 'Grams'])} />
          <Field label={form.wastage_type === 'Percentage' ? 'Wastage (%)' : 'Wastage (g)'} value={effectiveWastage} onChangeText={value => update('wastage', value)} keyboardType="decimal-pad" placeholder={currentGoldRates ? 'Current rate default' : '0'} />
          <Field label="Stone weight (g)" value={form.stone_weight} onChangeText={value => update('stone_weight', value)} keyboardType="decimal-pad" placeholder="0" />
          <Field label="Stone charges (₹)" value={form.stone_charges} onChangeText={value => update('stone_charges', value)} keyboardType="decimal-pad" placeholder="0" />
          <Selector label="Stone type" value={form.stone_type} onPress={() => openSelector('Stone type', 'stone_type', ['None', 'Diamond', 'Ruby', 'Other'])} />
          <Field label="Hallmark / HUID" value={form.huid} onChangeText={value => update('huid', value)} placeholder="Verified HUID" />
        </FormSection>

        <FormSection step="03" title="Size and dimensions">
          <Field label="Available sizes" value={form.available_sizes} onChangeText={value => update('available_sizes', value)} placeholder="12, 14, 16" />
          <Selector label="Product size" value={form.product_size || 'Select size'} onPress={() => openSelector('Product size', 'product_size', ['Small', 'Medium', 'Large', 'Free Size'])} />
          <Field label="Length" value={form.length} onChangeText={value => update('length', value)} placeholder="18 inches" />
          <Field label="Width" value={form.width} onChangeText={value => update('width', value)} placeholder="5 mm" />
          <Field label="Height / thickness" value={form.height} onChangeText={value => update('height', value)} placeholder="2 mm" />
          <Field label="Ring size" value={form.ring_size} onChangeText={value => update('ring_size', value)} placeholder="Optional" />
          <Field label="Bangle size" value={form.bangle_size} onChangeText={value => update('bangle_size', value)} placeholder="Optional" />
          <Field label="Chain length" value={form.chain_length} onChangeText={value => update('chain_length', value)} placeholder="Optional" />
        </FormSection>

        <FormSection step="04" title="Pricing and offers">
          <Field label="MRP (₹)" value={form.mrp} onChangeText={value => update('mrp', value)} keyboardType="decimal-pad" placeholder={pricing.estimatedMrp ? pricing.estimatedMrp.toFixed(2) : 'Enter MRP'} />
          <Selector label="Offer type" value={form.offer_type} onPress={() => openSelector('Offer type', 'offer_type', ['None', 'Percentage', 'Fixed Amount'])} />
          {form.offer_type === 'Percentage' ? <Field label="Discount (%)" value={form.offer} onChangeText={value => update('offer', value)} keyboardType="decimal-pad" placeholder="0" /> : null}
          {form.offer_type === 'Fixed Amount' ? <Field label="Fixed discount (₹)" value={form.fixed_discount_amount} onChangeText={value => update('fixed_discount_amount', value)} keyboardType="decimal-pad" placeholder="0" /> : null}
          <Field label="Other charges (₹)" value={form.other_charges} onChangeText={value => update('other_charges', value)} keyboardType="decimal-pad" placeholder="0" />
          <Field label="GST (%)" value={form.gst_rate} onChangeText={value => update('gst_rate', value)} keyboardType="decimal-pad" placeholder="0" />
          <Toggle label="Price includes GST" value={form.price_includes_gst} onChange={value => update('price_includes_gst', value)} />
          <View className="rounded-xl bg-primary/5 p-3">
            <PriceLine label="Metal value" value={money(pricing.metalValue)} />
            <PriceLine label="Estimated MRP" value={money(amount(form.mrp) || pricing.estimatedMrp)} strong />
            <PriceLine label="Final selling price" value={money(pricing.offerPrice)} strong />
          </View>
        </FormSection>

        <FormSection step="05" title="Product content">
          <Field label="Description" value={form.description} onChangeText={value => update('description', value)} multiline placeholder="Product description" />
          <Field label="Highlights" value={form.highlights} onChangeText={value => update('highlights', value)} multiline placeholder="One highlight per line" />
          <Field label="Specifications" value={form.specifications} onChangeText={value => update('specifications', value)} multiline placeholder="Product specifications" />
          <Field label="Care instructions" value={form.care_instructions} onChangeText={value => update('care_instructions', value)} multiline placeholder="Care instructions" />
          <Field label="Warranty" value={form.warranty} onChangeText={value => update('warranty', value)} placeholder="Warranty details" />
        </FormSection>

        <FormSection step="06" title="Product images">
          <Pressable onPress={selectImages} disabled={isUploading || form.images.length >= 10} className="min-h-12 flex-row items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3" accessibilityRole="button">
            {isUploading ? <ActivityIndicator color="#004D40" /> : <FormIcon name="image" color="#004D40" />}
            <Text className="ml-2 text-sm font-bold text-primary">{isUploading ? 'Uploading…' : `Choose images (${form.images.length}/10)`}</Text>
          </Pressable>
          <View className="flex-row flex-wrap gap-3">
            {form.images.map((image, index) => {
              const uri = getProductImageUrl({ image });
              return (
                <View key={`${image}-${index}`} className="w-[30%] overflow-hidden rounded-xl border border-border bg-background">
                  {uri ? (
                    <Image
                      source={{ uri }}
                      className="h-28 w-full bg-slate-100"
                      resizeMode="cover"
                      accessibilityLabel={`Product image preview ${index + 1}`}
                    />
                  ) : (
                    <View className="h-28 items-center justify-center bg-slate-100">
                      <FormIcon name="image" color="#64748B" />
                    </View>
                  )}
                  <View className="flex-row items-center justify-between p-2">
                    <Text className="flex-1 text-[10px] text-slate-600">Image {index + 1}</Text>
                    <Pressable onPress={() => update('images', form.images.filter((_, itemIndex) => itemIndex !== index))} className="h-8 w-8 items-center justify-center rounded-lg bg-rose-50" accessibilityRole="button" accessibilityLabel={`Remove image ${index + 1}`}>
                      <FormIcon name="close" color="#DC2626" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </FormSection>

        <FormSection step="07" title="Size guide chart">
          <Text className="text-xs leading-5 text-muted">
            Upload one size guide as a PNG/JPG image or PDF. Maximum file size: 5 MB.
          </Text>
          <View className="flex-row gap-2">
            <Pressable onPress={selectSizeGuideImage} disabled={isUploading} className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-3" accessibilityRole="button">
              <FormIcon name="image" color="#004D40" />
              <Text className="ml-2 text-center text-xs font-bold text-primary">Upload image</Text>
            </Pressable>
            <Pressable onPress={selectSizeGuidePdf} disabled={isUploading} className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-3" accessibilityRole="button">
              <FormIcon name="file" color="#004D40" />
              <Text className="ml-2 text-center text-xs font-bold text-primary">Upload PDF</Text>
            </Pressable>
          </View>
          {isUploading ? <ActivityIndicator color="#004D40" /> : null}
          {form.size_guide_chart ? (
            <View className="flex-row items-center rounded-xl border border-border bg-background p-3">
              {sizeGuideIsImage ? (
                <Image
                  source={{ uri: getProductImageUrl({ image: form.size_guide_chart }) }}
                  className="h-20 w-20 rounded-lg bg-slate-100"
                  resizeMode="cover"
                  accessibilityLabel="Size guide image preview"
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-lg bg-primary/5">
                  <FormIcon name="file" color="#004D40" />
                </View>
              )}
              <Text className="flex-1 text-xs font-medium text-slate-700" numberOfLines={1}>
                {`  ${sizeGuideFileName || 'Size guide uploaded'}`}
              </Text>
              <Pressable
                onPress={() => {
                  update('size_guide_chart', '');
                  setSizeGuideFileName('');
                  setSizeGuideIsImage(false);
                }}
                className="ml-2 h-9 w-9 items-center justify-center rounded-lg bg-rose-50"
                accessibilityRole="button"
                accessibilityLabel="Remove size guide"
              >
                <FormIcon name="close" color="#DC2626" />
              </Pressable>
            </View>
          ) : null}
        </FormSection>

        <FormSection step="08" title="Product video">
          <Text className="text-xs leading-5 text-muted">
            Upload one MP4 video, up to 25 MB.
          </Text>
          <Pressable onPress={selectProductVideo} disabled={isUploading} className="min-h-12 flex-row items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3" accessibilityRole="button">
            <FormIcon name="video" color="#004D40" />
            <Text className="ml-2 text-sm font-bold text-primary">Choose MP4 video</Text>
          </Pressable>
          {form.video ? (
            <View className="flex-row items-center rounded-xl border border-border bg-background p-3">
              <Text className="flex-1 text-xs font-medium text-slate-700" numberOfLines={1}>
                {videoFileName || 'Product video uploaded'}
              </Text>
              <Pressable onPress={() => { update('video', ''); setVideoFileName(''); }} className="ml-2 h-9 w-9 items-center justify-center rounded-lg bg-rose-50" accessibilityRole="button" accessibilityLabel="Remove product video">
                <FormIcon name="close" color="#DC2626" />
              </Pressable>
            </View>
          ) : null}
          {isUploading ? <ActivityIndicator color="#004D40" /> : null}
        </FormSection>

        <FormSection step="09" title="Certificate">
          <Text className="text-xs leading-5 text-muted">
            Upload one certificate as a PNG/JPG image or PDF, up to 5 MB.
          </Text>
          <View className="flex-row gap-2">
            <Pressable onPress={selectCertificateImage} disabled={isUploading} className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-3" accessibilityRole="button">
              <FormIcon name="image" color="#004D40" />
              <Text className="ml-2 text-center text-xs font-bold text-primary">Upload image</Text>
            </Pressable>
            <Pressable onPress={selectCertificatePdf} disabled={isUploading} className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-3" accessibilityRole="button">
              <FormIcon name="file" color="#004D40" />
              <Text className="ml-2 text-center text-xs font-bold text-primary">Upload PDF</Text>
            </Pressable>
          </View>
          {form.certificate ? (
            <View className="flex-row items-center rounded-xl border border-border bg-background p-3">
              {certificateIsImage ? (
                <Image
                  source={{ uri: getProductImageUrl({ image: form.certificate }) }}
                  className="h-20 w-20 rounded-lg bg-slate-100"
                  resizeMode="cover"
                  accessibilityLabel="Certificate image preview"
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-lg bg-primary/5">
                  <FormIcon name="file" color="#004D40" />
                </View>
              )}
              <Text className="flex-1 text-xs font-medium text-slate-700" numberOfLines={1}>
                {`  ${certificateFileName || 'Certificate uploaded'}`}
              </Text>
              <Pressable onPress={() => { update('certificate', ''); setCertificateFileName(''); setCertificateIsImage(false); }} className="ml-2 h-9 w-9 items-center justify-center rounded-lg bg-rose-50" accessibilityRole="button" accessibilityLabel="Remove certificate">
                <FormIcon name="close" color="#DC2626" />
              </Pressable>
            </View>
          ) : null}
          {isUploading ? <ActivityIndicator color="#004D40" /> : null}
        </FormSection>

        <FormSection step="10" title="Rating and publishing">
          <Field label="Average rating (1–5; enter 0 if unrated)" value={form.rating} onChangeText={value => update('rating', value)} keyboardType="decimal-pad" placeholder="0.0" />
          <Field label="Stock quantity" value={form.total_stock} onChangeText={value => update('total_stock', value)} keyboardType="number-pad" placeholder="0" />
          <Field label="Warehouse / location" value={form.warehouse} onChangeText={value => update('warehouse', value)} placeholder="Main Shop" />
          <Selector label="Product status" value={form.status} onPress={() => openSelector('Product status', 'status', ['Active', 'Draft', 'Inactive'])} />
          <Toggle label="Featured product" value={form.featured} onChange={value => update('featured', value)} />
          <Toggle label="New arrival" value={form.new_arrival} onChange={value => update('new_arrival', value)} />
          <Toggle label="Best seller" value={form.best_seller} onChange={value => update('best_seller', value)} />
        </FormSection>

        <View className="mb-3 flex-row gap-3">
          <Pressable onPress={onCancel} className="flex-1 items-center rounded-xl border border-border bg-surface px-4 py-3.5" accessibilityRole="button">
            <Text className="text-sm font-bold text-slate-600">Close</Text>
          </Pressable>
          <Pressable onPress={save} disabled={isSaving || isUploading} className="flex-1 flex-row items-center justify-center rounded-xl bg-primary px-4 py-3.5" accessibilityRole="button">
            {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <FormIcon name="check" color="#FFFFFF" />}
            <Text className="ml-2 text-sm font-bold text-white">{isSaving ? 'Saving…' : 'Save product'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={Boolean(picker)} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View className="flex-1 justify-center bg-slate-950/50 px-5">
          <Pressable className="absolute inset-0" onPress={() => setPicker(null)} accessibilityLabel="Close options" />
          <View className="max-h-[75%] rounded-2xl bg-surface p-5">
            <Text className="text-lg font-bold text-slate-900">{picker?.label}</Text>
            <ScrollView className="mt-4">
              {(picker?.options ?? []).map(option => (
                <Pressable key={option} onPress={() => picker && selectOption(picker.field, option)} className="mb-2 rounded-xl border border-border bg-background px-4 py-3" accessibilityRole="button">
                  <Text className="text-sm font-semibold text-slate-800">{option}</Text>
                </Pressable>
              ))}
              {picker?.options.length === 0 ? <Text className="py-4 text-center text-xs text-muted">No options available.</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function FormSection({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-border bg-surface">
      <View className="flex-row items-center border-b border-border bg-primary/5 px-4 py-3">
        <View className="mr-2 h-6 w-7 items-center justify-center rounded-md bg-primary">
          <Text className="text-[9px] font-extrabold text-white">{step}</Text>
        </View>
        <Text className="text-sm font-extrabold text-primary-dark">{title}</Text>
      </View>
      <View className="gap-3 p-4">{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  editable = true,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  editable?: boolean;
  multiline?: boolean;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        editable={editable}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border border-border px-3.5 py-3 text-sm text-slate-800 ${editable ? 'bg-background' : 'bg-slate-100'} ${multiline ? 'min-h-24' : ''}`}
      />
    </View>
  );
}

function Selector({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View>
      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">{label}</Text>
      <Pressable onPress={onPress} className="min-h-11 flex-row items-center justify-between rounded-xl border border-border bg-background px-3.5 py-3" accessibilityRole="button">
        <Text className="flex-1 text-sm font-medium text-slate-800">{value}</Text>
        <FormIcon name="chevron" color="#64748B" />
      </Pressable>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} className="min-h-11 flex-row items-center justify-between rounded-xl border border-border bg-background px-3.5" accessibilityRole="checkbox" accessibilityState={{ checked: value }}>
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <View className={`h-5 w-9 justify-center rounded-full px-0.5 ${value ? 'bg-primary' : 'bg-slate-300'}`}>
        <View className={`h-4 w-4 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`} />
      </View>
    </Pressable>
  );
}

function PriceLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className={`text-xs ${strong ? 'font-bold text-primary-dark' : 'text-slate-600'}`}>{label}</Text>
      <Text className={`text-xs ${strong ? 'font-extrabold text-primary-dark' : 'font-medium text-slate-700'}`}>{value}</Text>
    </View>
  );
}

function FormIcon({ name, color }: { name: 'back' | 'image' | 'file' | 'video' | 'chevron' | 'check' | 'close'; color: string }) {
  const iconPaths: Record<typeof name, string[]> = {
    back: ['m15 18-6-6 6-6', 'M20 12H9'],
    image: ['M4 4h16v16H4z', 'm4 16 5-5 4 4 3-3 4 4', 'M9 9h.01'],
    file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h8'],
    video: ['m22 8-6 4 6 4V8z', 'M2 6h14v12H2z'],
    chevron: ['m9 18 6-6-6-6'],
    check: ['M20 6 9 17l-5-5'],
    close: ['M18 6 6 18', 'm6 6 12 12'],
  };
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {iconPaths[name].map(path => (
        <Path key={path} d={path} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

export default AddProducts;
