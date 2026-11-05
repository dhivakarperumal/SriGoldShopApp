import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';

export type Category = {
  catId: string;
  name: string;
  description?: string;
  subcategory?: string[] | string;
  images?: string[] | string;
  status?: string;
  totalProducts?: number | string;
};

type CategoriesAllProps = {
  onBack?: () => void;
  onAddCategory: (categoryId: string) => void;
  onEditCategory: (category: Category) => void;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value !== 'string' || !value.trim()) return [];
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

function categoryImage(category: Category): string | undefined {
  const image = parseList(category.images)[0];
  return image ? getProductImageUrl({ image }) : undefined;
}

function CategoriesAll({ onBack, onAddCategory, onEditCategory }: CategoriesAllProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const addButtonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(addButtonPulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(addButtonPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [addButtonPulse]);

  const fetchCategories = useCallback(async (refresh = false) => {
    setLoadError('');
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data } = await api.get('/categories');
      if (!Array.isArray(data)) {
        throw new Error('The server returned an invalid category list.');
      }
      setCategories(data as Category[]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoadError(getErrorMessage(error, 'Could not load categories.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(category =>
      `${category.name} ${category.catId}`.toLowerCase().includes(query),
    );
  }, [categories, search]);

  const nextCategoryId = useMemo(() => {
    const maxId = categories.reduce((max, category) => {
      const match = category.catId?.match(/\d+/);
      return Math.max(max, match ? Number(match[0]) : 0);
    }, 0);
    return `CAT${String(maxId + 1).padStart(3, '0')}`;
  }, [categories]);

  const deleteCategory = (category: Category) => {
    Alert.alert(
      'Delete category?',
      `Remove ${category.name} from categories?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/categories/${encodeURIComponent(category.catId)}`);
              setCategories(current =>
                current.filter(item => item.catId !== category.catId),
              );
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert(
                'Delete failed',
                getErrorMessage(error, 'Could not delete the category.'),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center justify-between border-b border-[#00382E] bg-primary px-4">
        <View className="flex-1 flex-row items-center pr-3">
          {onBack ? (
            <Pressable
              onPress={onBack}
              className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
              accessibilityRole="button"
              accessibilityLabel="Back to products"
            >
              <Text className="text-xl font-bold text-white">‹</Text>
            </Pressable>
          ) : null}
          <View className="flex-1">
            <Text className="text-base font-extrabold tracking-wide text-white" numberOfLines={1}>
              Categories
            </Text>
            <Text className="text-[10px] font-medium text-emerald-200" numberOfLines={1}>
              Sri Golds Jewellery
            </Text>
          </View>
        </View>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchCategories(true)}
            tintColor="#004D40"
          />
        }
      >
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search category name or ID"
          placeholderTextColor="#94A3B8"
          className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-slate-800"
          accessibilityLabel="Search categories"
        />

        {loadError ? (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <Text className="text-sm font-semibold text-red-700">{loadError}</Text>
            <Pressable
              className="mt-3 self-start rounded-lg bg-red-100 px-3 py-2"
              onPress={() => fetchCategories()}
              accessibilityRole="button"
            >
              <Text className="text-xs font-bold text-red-800">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading ? (
          <View className="items-center rounded-2xl border border-border bg-surface py-12">
            <ActivityIndicator color="#004D40" />
            <Text className="mt-3 text-xs text-slate-500">Loading categories…</Text>
          </View>
        ) : filteredCategories.length ? (
          <View className="gap-3">
            {filteredCategories.map(category => {
              const imageUrl = categoryImage(category);
              const subcategories = parseList(category.subcategory);
              const isInactive = category.status?.toLowerCase() === 'inactive';

              return (
                <View
                  key={category.catId}
                  className="flex-row rounded-2xl border border-border bg-surface p-4"
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      className="mr-3 h-16 w-16 rounded-xl bg-slate-100"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="mr-3 h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                      <Text className="text-xl font-black text-primary">◇</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-bold text-slate-900">
                          {category.name}
                        </Text>
                        <Text className="mt-0.5 text-[11px] font-medium text-slate-400">
                          ID: {category.catId || 'N/A'}
                        </Text>
                      </View>
                      <View
                        className={`rounded-md px-2 py-1 ${
                          isInactive ? 'bg-slate-100' : 'bg-emerald-50'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            isInactive ? 'text-slate-600' : 'text-emerald-800'
                          }`}
                        >
                          {isInactive ? 'Inactive' : 'Active'}
                        </Text>
                      </View>
                    </View>
                    {subcategories.length ? (
                      <Text className="mt-3 text-[11px] text-slate-500" numberOfLines={2}>
                        Subcategories: {subcategories.join(', ')}
                      </Text>
                    ) : null}
                    <View className="mt-3 flex-row items-center justify-between">
                      <View className="flex-1" />
                      <Pressable
                        className="mr-2 h-9 w-9 items-center justify-center rounded-xl bg-amber-50 active:bg-amber-100"
                        onPress={() => onEditCategory(category)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${category.name}`}
                      >
                        <CategoryActionIcon name="edit" color="#B45309" />
                      </Pressable>
                      <Pressable
                        className="h-9 w-9 items-center justify-center rounded-xl bg-red-50 active:bg-red-100"
                        onPress={() => deleteCategory(category)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${category.name}`}
                      >
                        <CategoryActionIcon name="delete" color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-border bg-surface px-5 py-10">
            <Text className="text-sm font-bold text-slate-800">
              {categories.length ? 'No categories found' : 'No categories yet'}
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">
              {categories.length
                ? 'Try another search.'
                : 'Add a category to organize your products.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-5 right-5 items-end">
        <View className="h-14 w-14 items-center justify-center">
          <Animated.View
            pointerEvents="none"
            className="absolute h-14 w-14 rounded-full bg-accent"
            style={{
              opacity: addButtonPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 0],
              }),
              transform: [
                {
                  scale: addButtonPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.22],
                  }),
                },
              ],
            }}
          />
          <Pressable
            onPress={() => onAddCategory(nextCategoryId)}
            className="h-14 w-14 items-center justify-center rounded-full border-2 border-accent-light bg-primary shadow-lg"
            accessibilityRole="button"
            accessibilityLabel="Open add category page"
          >
            <Text className="text-2xl font-bold text-white">+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function CategoryActionIcon({
  name,
  color,
}: {
  name: 'edit' | 'delete';
  color: string;
}) {
  const paths =
    name === 'edit'
      ? ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z']
      : ['M3 6h18', 'M8 6V4h8v2', 'm19 6-1 14H6L5 6', 'M10 11v5', 'M14 11v5'];

  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      {paths.map(path => (
        <Path
          key={path}
          d={path}
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export default CategoriesAll;
