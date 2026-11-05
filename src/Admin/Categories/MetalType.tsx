import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';
import AddMetaltype, {
  type MetalFormData,
  type MetalImageSelection,
} from './AddMetaltype';

type Metal = {
  id: string | number;
  name: string;
  purity?: string | string[];
  description?: string;
  image?: string | null;
  status?: string;
};

const EMPTY_FORM: MetalFormData = {
  name: '',
  purity: '',
  description: '',
  imagePath: '',
  status: 'Active',
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

function purityLabels(purity: Metal['purity']): string[] {
  if (Array.isArray(purity)) {
    return purity.map(value => value.trim()).filter(Boolean);
  }
  if (typeof purity !== 'string' || !purity.trim()) return [];
  return purity.split(',').map(value => value.trim()).filter(Boolean);
}

function MetalType({ onBack }: { onBack: () => void }) {
  const [metals, setMetals] = useState<Metal[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMetal, setEditingMetal] = useState<Metal | null>(null);
  const [form, setForm] = useState<MetalFormData>(EMPTY_FORM);
  const [selectedImage, setSelectedImage] = useState<MetalImageSelection | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchMetals = useCallback(async (refresh = false) => {
    setLoadError('');
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data } = await api.get('/metals');
      if (!Array.isArray(data)) {
        throw new Error('The server returned an invalid metal list.');
      }
      setMetals(data as Metal[]);
    } catch (error) {
      console.error('Error fetching metal types:', error);
      setLoadError(getErrorMessage(error, 'Could not load metal types.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetals();
  }, [fetchMetals]);

  const filteredMetals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return metals.filter(metal => {
      const matchesSearch =
        !query ||
        `${metal.name} ${metal.status ?? ''} ${metal.description ?? ''} ${purityLabels(metal.purity).join(' ')}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === 'All' || (metal.status || 'Active') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [metals, search, statusFilter]);

  const activeCount = metals.filter(metal => (metal.status || 'Active') === 'Active').length;
  const inactiveCount = metals.length - activeCount;

  const openAddModal = () => {
    setEditingMetal(null);
    setForm(EMPTY_FORM);
    setSelectedImage(null);
    setIsModalVisible(true);
  };

  const openEditModal = (metal: Metal) => {
    setEditingMetal(metal);
    setForm({
      name: metal.name || '',
      purity: Array.isArray(metal.purity) ? metal.purity.join(', ') : metal.purity || '',
      description: metal.description || '',
      imagePath: metal.image || '',
      status: metal.status || 'Active',
    });
    setSelectedImage(null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalVisible(false);
    setEditingMetal(null);
    setForm(EMPTY_FORM);
    setSelectedImage(null);
  };

  const selectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert(
          'Image selection failed',
          result.errorMessage || 'Could not select the metal image.',
        );
        return;
      }

      const asset = result.assets?.find(item => Boolean(item.uri));
      if (!asset?.uri) return;
      if (asset.type && !['image/png', 'image/jpeg'].includes(asset.type)) {
        Alert.alert('Unsupported image', 'Choose a PNG or JPG image.');
        return;
      }
      if (asset.fileSize !== undefined && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Image too large', 'Image must be 5 MB or smaller.');
        return;
      }

      setSelectedImage({
        uri: asset.uri,
        name: asset.fileName || `metal-${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize,
      });
      setForm(current => ({ ...current, imagePath: '' }));
    } catch (error) {
      console.error('Failed to select metal image:', error);
      Alert.alert(
        'Image selection failed',
        getErrorMessage(error, 'Could not select the metal image.'),
      );
    }
  };

  const saveMetal = async () => {
    const payload: Omit<Metal, 'id'> = {
      name: form.name.trim(),
      purity: form.purity.trim(),
      description: form.description.trim(),
      image: form.imagePath || null,
      status: form.status,
    };
    if (!payload.name) {
      Alert.alert('Metal name required', 'Enter a metal name.');
      return;
    }

    setIsSaving(true);
    try {
      if (selectedImage) {
        const imageForm = new FormData();
        imageForm.append(
          'image',
          {
            uri: selectedImage.uri,
            name: selectedImage.name,
            type: selectedImage.type,
          } as unknown as Blob,
        );
        const uploaded = await api.post('/metals/images', imageForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (typeof uploaded.data?.image !== 'string') {
          throw new Error('The server did not return the uploaded image path.');
        }
        payload.image = uploaded.data.image;
      }

      if (editingMetal) {
        const { data } = await api.put(`/metals/${editingMetal.id}`, payload);
        setMetals(current =>
          current.map(metal => (metal.id === editingMetal.id ? data : metal)),
        );
        Alert.alert('Metal updated', 'Metal details were updated successfully.');
      } else {
        const { data } = await api.post('/metals', payload);
        setMetals(current => [data, ...current]);
        Alert.alert('Metal added', 'Metal was added successfully.');
      }
      setIsModalVisible(false);
      setEditingMetal(null);
      setForm(EMPTY_FORM);
      setSelectedImage(null);
    } catch (error) {
      console.error('Failed to save metal:', error);
      Alert.alert('Save failed', getErrorMessage(error, 'Could not save this metal.'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMetal = (metal: Metal) => {
    Alert.alert('Delete metal?', `Delete ${metal.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/metals/${metal.id}`);
            setMetals(current => current.filter(item => item.id !== metal.id));
            Alert.alert('Metal deleted', `${metal.name} was deleted.`);
          } catch (error) {
            console.error('Failed to delete metal:', error);
            Alert.alert('Delete failed', getErrorMessage(error, 'Could not delete this metal.'));
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-5"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchMetals(true)}
            tintColor="#004D40"
          />
        }
      >
        <View className="mb-5 flex-row items-center">
          <Pressable
            className="mr-3 rounded-xl bg-primary/10 px-3 py-2"
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to additional menu"
          >
            <Text className="text-xs font-bold text-primary">Back</Text>
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-black text-slate-900">Metal Types</Text>
            <Text className="mt-1 text-xs text-slate-500">
              {metals.length} configured {metals.length === 1 ? 'metal' : 'metals'}
            </Text>
          </View>
          <Pressable
            className="rounded-xl bg-primary px-4 py-3 active:opacity-80"
            onPress={openAddModal}
            accessibilityRole="button"
          >
            <Text className="text-xs font-bold text-white">+ Add Metal</Text>
          </Pressable>
        </View>

        <View className="mb-4 flex-row gap-2">
          <StatCard label="Total" value={metals.length} />
          <StatCard label="Active" value={activeCount} />
          <StatCard label="Inactive" value={inactiveCount} />
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search metals, purity, or description"
          placeholderTextColor="#94A3B8"
          className="mb-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-slate-800"
          accessibilityLabel="Search metal types"
        />
        <View className="mb-4 flex-row gap-2">
          {(['All', 'Active', 'Inactive'] as const).map(status => (
            <Pressable
              key={status}
              className={`rounded-full px-4 py-2 ${
                statusFilter === status ? 'bg-primary' : 'border border-border bg-surface'
              }`}
              onPress={() => setStatusFilter(status)}
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === status }}
            >
              <Text
                className={`text-xs font-bold ${
                  statusFilter === status ? 'text-white' : 'text-slate-600'
                }`}
              >
                {status === 'All' ? 'All statuses' : status}
              </Text>
            </Pressable>
          ))}
        </View>

        {loadError ? (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <Text className="text-sm font-semibold text-red-700">{loadError}</Text>
            <Pressable
              className="mt-3 self-start rounded-lg bg-red-100 px-3 py-2"
              onPress={() => fetchMetals()}
              accessibilityRole="button"
            >
              <Text className="text-xs font-bold text-red-800">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading ? (
          <View className="items-center rounded-2xl border border-border bg-surface py-12">
            <ActivityIndicator color="#004D40" />
            <Text className="mt-3 text-xs text-slate-500">Loading metal types…</Text>
          </View>
        ) : filteredMetals.length ? (
          <View className="gap-3">
            {filteredMetals.map((metal, index) => {
              const isInactive = metal.status === 'Inactive';
              const purities = purityLabels(metal.purity);
              const imageUrl = metal.image ? getProductImageUrl({ image: metal.image }) : undefined;
              return (
                <View
                  key={metal.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="min-w-0 flex-1 flex-row items-center">
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          className="mr-3 h-12 w-12 rounded-xl bg-slate-100"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-primary">
                          <Text className="text-sm font-bold text-white">{index + 1}</Text>
                        </View>
                      )}
                      <View className="min-w-0 flex-1">
                        <Text className="text-base font-bold text-slate-900">{metal.name}</Text>
                        <Text className="mt-0.5 text-[11px] font-medium text-slate-400">
                          Metal type
                        </Text>
                      </View>
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
                        {metal.status || 'Active'}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 border-t border-slate-100 pt-3">
                    <Text className="text-[11px] font-semibold uppercase text-slate-400">
                      Purity
                    </Text>
                    {purities.length ? (
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        {purities.map(purity => (
                          <View key={purity} className="rounded-lg bg-amber-50 px-3 py-1.5">
                            <Text className="text-xs font-semibold text-amber-900">{purity}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text className="mt-1 text-sm text-slate-500">—</Text>
                    )}
                    <Text className="mt-3 text-[11px] font-semibold uppercase text-slate-400">
                      Description
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-slate-600">
                      {metal.description || '—'}
                    </Text>
                  </View>

                  <View className="mt-4 flex-row justify-end gap-2 border-t border-slate-100 pt-3">
                    <Pressable
                      className="rounded-lg bg-amber-50 px-4 py-2"
                      onPress={() => openEditModal(metal)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${metal.name}`}
                    >
                      <Text className="text-xs font-bold text-amber-800">Edit</Text>
                    </Pressable>
                    <Pressable
                      className="rounded-lg bg-red-50 px-4 py-2"
                      onPress={() => deleteMetal(metal)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${metal.name}`}
                    >
                      <Text className="text-xs font-bold text-red-600">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-border bg-surface px-5 py-10">
            <Text className="text-sm font-bold text-slate-800">
              {metals.length ? 'No metals match the selected filters' : 'No metal types configured'}
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">
              {metals.length
                ? 'Try another search or status filter.'
                : 'Add a metal type to configure purity options.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <AddMetaltype
          form={form}
          editing={Boolean(editingMetal)}
          saving={isSaving}
          selectedImage={selectedImage}
          onChange={(field, value) =>
            setForm(current => ({ ...current, [field]: value }))
          }
          onSelectImage={selectImage}
          onRemoveImage={() => {
            setSelectedImage(null);
            setForm(current => ({ ...current, imagePath: '' }));
          }}
          onCancel={closeModal}
          onSave={saveMetal}
        />
      </Modal>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-surface px-3 py-3">
      <Text className="text-[10px] font-bold text-slate-400">{label}</Text>
      <Text className="mt-1 text-xl font-black text-slate-800">{value}</Text>
    </View>
  );
}

export default MetalType;
