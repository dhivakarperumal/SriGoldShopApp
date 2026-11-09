import {
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';

type Props = {
  categoryId: string;
  category?: {
    catId: string;
    name: string;
    description?: string;
    status?: string;
    subcategory?: string[] | string;
    images?: string[] | string;
  };
  onCancel: () => void;
  onSaved: () => void;
};

type SelectedImage = {
  uri?: string;
  name?: string;
  type?: string;
  size?: number;
  path?: string;
  previewUri?: string;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

function parseSavedList(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return [value];
  }
  return [];
}

function AddCategories({ categoryId, category, onCancel, onSaved }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [status, setStatus] = useState<'active' | 'inactive'>(
    category?.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active',
  );
  const [subcategories, setSubcategories] = useState<string[]>(() =>
    parseSavedList(category?.subcategory),
  );
  const [subcategoryInput, setSubcategoryInput] = useState('');
  const [images, setImages] = useState<SelectedImage[]>(() =>
    parseSavedList(category?.images).map(path => ({
      path,
      previewUri: getProductImageUrl({ image: path }),
    })),
  );
  const [isSaving, setIsSaving] = useState(false);

  const addSubcategory = () => {
    const value = subcategoryInput.trim();
    if (!value) return;
    if (subcategories.some(item => item.toLowerCase() === value.toLowerCase())) {
      setSubcategoryInput('');
      return;
    }
    setSubcategories(current => [...current, value]);
    setSubcategoryInput('');
  };

  const removeSubcategory = (indexToRemove: number) => {
    setSubcategories(current => current.filter((_, index) => index !== indexToRemove));
  };

  const selectImages = async () => {
    try {
      const remainingSlots = 20 - images.length;
      if (remainingSlots <= 0) return;

      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: remainingSlots,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert(
          'Image selection failed',
          result.errorMessage || 'Could not select images.',
        );
        return;
      }

      const selected = (result.assets ?? [])
        .filter(asset => Boolean(asset.uri))
        .map((asset, index) => ({
          uri: asset.uri!,
          name: asset.fileName || `category-${Date.now()}-${index}.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize,
        }));

      const unsupported = selected.find(
        image =>
          !['image/png', 'image/jpeg', 'image/jpg'].includes(
            (image.type || '').toLowerCase(),
          ),
      );
      if (unsupported) {
        Alert.alert('Unsupported image', 'Choose PNG or JPG images only.');
        return;
      }

      if (selected.some(image => image.size !== undefined && image.size > 5 * 1024 * 1024)) {
        Alert.alert('Image too large', 'Each image must be 5 MB or smaller.');
        return;
      }

      setImages(current => [...current, ...selected].slice(0, 20));
    } catch (error) {
      console.error('Category image selection failed:', error);
      Alert.alert(
        'Image selection failed',
        getErrorMessage(error, 'Could not select category images.'),
      );
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(current => current.filter((_, index) => index !== indexToRemove));
  };

  const saveCategory = async () => {
    if (!name.trim()) {
      Alert.alert('Category name required', 'Please enter a name for this category.');
      return;
    }

    setIsSaving(true);
    try {
      const body = new FormData();
      body.append('catId', categoryId);
      body.append('name', name.trim());
      body.append('description', description.trim());
      body.append('status', status);
      body.append('subcategory', JSON.stringify(subcategories));
      body.append(
        'images',
        JSON.stringify(images.flatMap(image => (image.path ? [image.path] : []))),
      );

      images.forEach((image, index) => {
        if (!image.uri) return;
        body.append(
          'images',
          {
            uri: image.uri,
            name: image.name || `category-${Date.now()}-${index}.jpg`,
            type: image.type || 'image/jpeg',
          } as unknown as Blob,
        );
      });

      if (category) {
        await api.put(`/categories/${encodeURIComponent(category.catId)}`, body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/categories', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onSaved();
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert(
        'Save failed',
        getErrorMessage(error, 'Could not save this category.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View className="h-16 flex-row items-center justify-between border-b border-[#00382E] bg-primary px-4">
          <View className="flex-1 flex-row items-center pr-3">
            <Pressable
              onPress={onCancel}
              className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
              accessibilityRole="button"
              accessibilityLabel="Back to categories"
            >
              <CategoryIcon name="back" color="#FFFFFF" size={18} />
            </Pressable>

            <View className="flex-1">
              <Text className="text-base font-extrabold tracking-wide text-white" numberOfLines={1}>
                {category ? 'Edit Category' : 'Add Category'}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Text className="text-[10px] font-medium text-emerald-200">
                  Sri Golds Jewellery
                </Text>
                <Text className="mx-1.5 text-[8px] text-emerald-400">◆</Text>
                <View className="rounded bg-emerald-950/60 px-1.5 py-0.5">
                  <Text className="text-[9px] font-bold text-accent-light tracking-wider">
                    {categoryId}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable
            onPress={saveCategory}
            disabled={isSaving || !name.trim()}
            className={`h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/20 ${
              isSaving || !name.trim() ? 'opacity-40' : 'active:bg-accent/30'
            }`}
            accessibilityRole="button"
            accessibilityLabel={category ? 'Save category changes' : 'Save category'}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#F5C45E" />
            ) : (
              <CategoryIcon name="check" color="#F5C45E" size={18} />
            )}
          </Pressable>
        </View>

        {/* Content Body */}
        <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pb-10 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Section 01: Category Details */}
            <FormSection step="01" title="Category Details">
              {/* Category ID info card */}
              <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <View className="flex-row items-center">
                  <CategoryIcon name="folder" color="#004D40" size={16} />
                  <Text className="ml-2 text-xs font-semibold text-slate-600">Category Code</Text>
                </View>
                <View className="rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1">
                  <Text className="text-xs font-extrabold text-primary">{categoryId}</Text>
                </View>
              </View>

              {/* Category Name */}
              <View>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Category Name <Text className="text-red-500">*</Text>
                  </Text>
                  <Text className="text-[10px] text-slate-400">{name.length}/100</Text>
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Gold Necklaces, Bangles, Diamond Rings"
                  placeholderTextColor="#94A3B8"
                  maxLength={100}
                  className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-slate-800"
                  accessibilityLabel="Category name"
                />
              </View>

              {/* Description */}
              <View>
                <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Write a brief description of the products in this category…"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="min-h-24 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-slate-800"
                  accessibilityLabel="Category description"
                />
              </View>

              {/* Status Toggle */}
              <View>
                <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  Category Status
                </Text>
                <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface p-3.5">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center">
                      <View
                        className={`mr-2 h-2.5 w-2.5 rounded-full ${
                          status === 'active' ? 'bg-success' : 'bg-slate-400'
                        }`}
                      />
                      <Text className="text-sm font-bold text-slate-800">
                        {status === 'active' ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    <Text className="mt-0.5 text-xs text-slate-500">
                      {status === 'active'
                        ? 'Visible in customer app & active product listings'
                        : 'Hidden from store listings and new entries'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setStatus(s => (s === 'active' ? 'inactive' : 'active'))}
                    className={`h-7 w-12 justify-center rounded-full px-0.5 ${
                      status === 'active' ? 'bg-primary' : 'bg-slate-300'
                    }`}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: status === 'active' }}
                    accessibilityLabel="Toggle category active status"
                  >
                    <View
                      className={`h-6 w-6 rounded-full bg-white shadow-xs ${
                        status === 'active' ? 'self-end' : 'self-start'
                      }`}
                    />
                  </Pressable>
                </View>
              </View>
            </FormSection>

            {/* Section 02: Subcategories */}
            <FormSection step="02" title="Subcategories">
              <Text className="text-xs text-slate-500 leading-4">
                Add subcategories to organize products under this category (e.g. Antique, Choker, Temple).
              </Text>

              {/* Subcategory input row */}
              <View className="flex-row gap-2">
                <TextInput
                  value={subcategoryInput}
                  onChangeText={setSubcategoryInput}
                  onSubmitEditing={addSubcategory}
                  returnKeyType="done"
                  placeholder="Enter subcategory name"
                  placeholderTextColor="#94A3B8"
                  className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-slate-800"
                  accessibilityLabel="New subcategory"
                />
                <Pressable
                  className="flex-row items-center justify-center rounded-xl bg-primary px-4 active:bg-primary-dark"
                  onPress={addSubcategory}
                  accessibilityRole="button"
                  accessibilityLabel="Add subcategory"
                >
                  <CategoryIcon name="plus" color="#FFFFFF" size={14} />
                  <Text className="ml-1 text-xs font-bold text-white">Add</Text>
                </Pressable>
              </View>

              {/* Subcategories tags display */}
              {subcategories.length > 0 ? (
                <View className="mt-1">
                  <View className="flex-row flex-wrap gap-2">
                    {subcategories.map((sub, index) => (
                      <View
                        key={`${sub}-${index}`}
                        className="flex-row items-center rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2"
                      >
                        <CategoryIcon name="tag" color="#B45309" size={12} />
                        <Text className="mx-2 text-xs font-bold text-amber-950">{sub}</Text>
                        <Pressable
                          onPress={() => removeSubcategory(index)}
                          className="h-4 w-4 items-center justify-center rounded-full bg-amber-200/80 active:bg-amber-300"
                          accessibilityRole="button"
                          accessibilityLabel={`Remove subcategory ${sub}`}
                        >
                          <CategoryIcon name="close" color="#78350F" size={9} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                  <Text className="mt-2 text-[10px] text-slate-400">
                    {subcategories.length} {subcategories.length === 1 ? 'subcategory' : 'subcategories'} configured.
                  </Text>
                </View>
              ) : (
                <View className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3.5 items-center">
                  <Text className="text-xs font-medium text-slate-400">
                    No subcategories added yet (optional)
                  </Text>
                </View>
              )}
            </FormSection>

            {/* Section 03: Media & Images */}
            <FormSection step="03" title="Category Media">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500">
                  Upload photos for this category banner and catalog previews.
                </Text>
                <View className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-slate-600">
                    {images.length}/20
                  </Text>
                </View>
              </View>

              {/* Upload Drop Zone */}
              <Pressable
                onPress={selectImages}
                disabled={images.length >= 20}
                className={`items-center justify-center rounded-2xl border-2 border-dashed p-6 ${
                  images.length >= 20
                    ? 'border-slate-200 bg-slate-50 opacity-60'
                    : 'border-emerald-200 bg-emerald-50/40 active:bg-emerald-50/70'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Upload category images"
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-white shadow-xs">
                  <CategoryIcon name="image" color="#004D40" size={24} />
                </View>
                <Text className="mt-3 text-sm font-bold text-slate-800">
                  {images.length >= 20 ? 'Image limit reached (20/20)' : 'Upload Category Images'}
                </Text>
                <Text className="mt-1 text-center text-xs text-slate-500">
                  Choose PNG or JPG files • Up to 5 MB each
                </Text>
                {images.length < 20 ? (
                  <View className="mt-3 rounded-lg bg-primary px-3.5 py-1.5 shadow-xs">
                    <Text className="text-xs font-bold text-white">Browse Gallery</Text>
                  </View>
                ) : null}
              </Pressable>

              {/* Selected Images Preview Grid */}
              {images.length > 0 ? (
                <View className="mt-2">
                  <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Selected Images ({images.length})
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    {images.map((image, index) => (
                      <View
                        key={`${image.path || image.uri}-${index}`}
                        className="relative h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs"
                      >
                        <Image
                          source={{ uri: image.uri || image.previewUri }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                        {/* Cover label for the first image */}
                        {index === 0 ? (
                          <View className="absolute bottom-1.5 left-1.5 rounded-md bg-slate-900/80 px-1.5 py-0.5">
                            <Text className="text-[9px] font-extrabold text-amber-300">
                              COVER
                            </Text>
                          </View>
                        ) : null}

                        {/* Remove button */}
                        <Pressable
                          onPress={() => removeImage(index)}
                          className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-rose-600 shadow-sm active:bg-rose-700"
                          accessibilityRole="button"
                          accessibilityLabel={`Remove image ${index + 1}`}
                        >
                          <CategoryIcon name="close" color="#FFFFFF" size={11} />
                        </Pressable>
                      </View>
                    ))}

                    {/* Quick Add More Tile */}
                    {images.length < 20 ? (
                      <Pressable
                        onPress={selectImages}
                        className="h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 active:bg-emerald-100/60"
                        accessibilityRole="button"
                        accessibilityLabel="Add more images"
                      >
                        <CategoryIcon name="plus" color="#004D40" size={20} />
                        <Text className="mt-1 text-[10px] font-bold text-primary">Add More</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </FormSection>
          </ScrollView>

          {/* Sticky Bottom Actions Bar */}
          <View className="flex-row items-center gap-3 border-t border-border bg-surface px-4 py-3.5 shadow-sm">
            <Pressable
              onPress={onCancel}
              disabled={isSaving}
              className="flex-1 items-center justify-center rounded-xl border border-border bg-slate-100 py-3.5 active:bg-slate-200"
              accessibilityRole="button"
            >
              <Text className="text-sm font-bold text-slate-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={saveCategory}
              disabled={isSaving || !name.trim()}
              className={`flex-[2] flex-row items-center justify-center rounded-xl bg-primary py-3.5 shadow-sm ${
                isSaving || !name.trim() ? 'opacity-50' : 'active:opacity-90'
              }`}
              accessibilityRole="button"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CategoryIcon name="check" color="#FFFFFF" size={16} />
                  <Text className="ml-2 text-sm font-bold text-white">
                    {category ? 'Save Changes' : 'Save Category'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FormSection({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
      <View className="flex-row items-center border-b border-border bg-primary/5 px-4 py-3">
        <View className="mr-2.5 h-6 w-7 items-center justify-center rounded-md bg-primary">
          <Text className="text-[10px] font-extrabold text-white">{step}</Text>
        </View>
        <Text className="text-sm font-extrabold text-primary-dark">{title}</Text>
      </View>
      <View className="gap-3.5 p-4">{children}</View>
    </View>
  );
}

function CategoryIcon({
  name,
  color,
  size = 18,
}: {
  name: 'back' | 'check' | 'close' | 'image' | 'tag' | 'plus' | 'folder';
  color: string;
  size?: number;
}) {
  const iconPaths: Record<typeof name, string[]> = {
    back: ['m15 18-6-6 6-6', 'M20 12H9'],
    check: ['M20 6 9 17l-5-5'],
    close: ['M18 6 6 18', 'm6 6 12 12'],
    image: ['M4 4h16v16H4z', 'm4 16 5-5 4 4 3-3 4 4', 'M9 9h.01'],
    tag: [
      'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z',
      'M7 7h.01',
    ],
    plus: ['M12 5v14', 'M5 12h14'],
    folder: [
      'M4 6.5A2.5 2.5 0 0 1 6.5 4h3.586a2 2 0 0 1 1.414.586L13.086 6.172A2 2 0 0 0 14.5 6.75H17.5A2.5 2.5 0 0 1 20 9.25v8.25A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5V6.5Z',
    ],
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {iconPaths[name].map((path, i) => (
        <Path
          key={`${name}-${i}`}
          d={path}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export default AddCategories;
