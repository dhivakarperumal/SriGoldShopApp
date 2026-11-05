import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../api';

type Props = {
  categoryId: string;
  onCancel: () => void;
  onSaved: () => void;
};

type SelectedImage = {
  uri: string;
  name: string;
  type: string;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

function AddCategories({ categoryId, onCancel, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subcategoryInput, setSubcategoryInput] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
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

  const selectImages = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 20 - images.length,
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
        image => !['image/png', 'image/jpeg'].includes(image.type),
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

  const saveCategory = async () => {
    if (!name.trim()) {
      Alert.alert('Category name required', 'Enter a name for this category.');
      return;
    }

    setIsSaving(true);
    try {
      const body = new FormData();
      body.append('catId', categoryId);
      body.append('name', name.trim());
      body.append('description', description.trim());
      body.append('subcategory', JSON.stringify(subcategories));
      body.append('images', JSON.stringify([]));
      images.forEach(image => {
        body.append(
          'images',
          {
            uri: image.uri,
            name: image.name,
            type: image.type,
          } as unknown as Blob,
        );
      });

      await api.post('/categories', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center justify-between border-b border-border bg-surface px-5 py-4">
          <View>
            <Text className="text-lg font-black text-slate-900">Add Category</Text>
            <Text className="mt-1 text-xs font-medium text-slate-500">
              Category ID: {categoryId}
            </Text>
          </View>
          <Pressable
            className="rounded-xl bg-slate-100 px-4 py-2.5"
            onPress={onCancel}
            accessibilityRole="button"
          >
            <Text className="text-xs font-bold text-slate-700">Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 py-5"
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text className="mb-2 text-xs font-bold text-slate-700">Category name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Gold Necklace"
              placeholderTextColor="#94A3B8"
              maxLength={100}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-slate-800"
              accessibilityLabel="Category name"
            />
          </View>

          <View>
            <Text className="mb-2 text-xs font-bold text-slate-700">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe this category"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="min-h-24 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-slate-800"
              accessibilityLabel="Category description"
            />
          </View>

          <View>
            <Text className="mb-2 text-xs font-bold text-slate-700">Subcategories</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={subcategoryInput}
                onChangeText={setSubcategoryInput}
                onSubmitEditing={addSubcategory}
                returnKeyType="done"
                placeholder="Type a subcategory"
                placeholderTextColor="#94A3B8"
                className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-slate-800"
                accessibilityLabel="New subcategory"
              />
              <Pressable
                className="justify-center rounded-xl bg-primary px-4"
                onPress={addSubcategory}
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-white">Add</Text>
              </Pressable>
            </View>
            {subcategories.length ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {subcategories.map(subcategory => (
                  <Pressable
                    key={subcategory}
                    className="rounded-full bg-amber-50 px-3 py-2"
                    onPress={() =>
                      setSubcategories(current =>
                        current.filter(item => item !== subcategory),
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${subcategory}`}
                  >
                    <Text className="text-xs font-semibold text-amber-900">
                      {subcategory}  ×
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-bold text-slate-700">Category images</Text>
              <Text className="text-[10px] text-slate-500">{images.length}/20</Text>
            </View>
            <Pressable
              className="items-center rounded-xl border border-dashed border-slate-300 bg-surface px-4 py-4"
              onPress={selectImages}
              disabled={images.length >= 20}
              accessibilityRole="button"
            >
              <Text className="text-xs font-bold text-primary">Choose PNG or JPG images</Text>
              <Text className="mt-1 text-[10px] text-slate-500">Up to 20 images</Text>
            </Pressable>
            {images.length ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {images.map((image, index) => (
                  <View key={`${image.uri}-${index}`} className="relative">
                    <Image
                      source={{ uri: image.uri }}
                      className="h-20 w-20 rounded-xl bg-slate-100"
                    />
                    <Pressable
                      className="absolute -right-1 -top-1 rounded-full bg-red-600 px-2 py-1"
                      onPress={() =>
                        setImages(current => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Remove image ${index + 1}`}
                    >
                      <Text className="text-[10px] font-bold text-white">×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View className="border-t border-border bg-surface px-5 py-4">
          <Pressable
            className={`items-center rounded-xl bg-primary py-3.5 ${
              isSaving || !name.trim() ? 'opacity-50' : 'active:opacity-80'
            }`}
            onPress={saveCategory}
            disabled={isSaving || !name.trim()}
            accessibilityRole="button"
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-bold text-white">Save Category</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default AddCategories;