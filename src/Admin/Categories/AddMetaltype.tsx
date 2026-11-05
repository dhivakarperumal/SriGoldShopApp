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
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { getProductImageUrl } from '../../utils/productImage';

export type MetalFormData = {
  name: string;
  purity: string;
  description: string;
  imagePath: string;
  status: string;
};

export type MetalImageSelection = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

type Props = {
  form: MetalFormData;
  editing: boolean;
  saving: boolean;
  selectedImage: MetalImageSelection | null;
  onChange: (field: keyof MetalFormData, value: string) => void;
  onSelectImage: () => void;
  onRemoveImage: () => void;
  onCancel: () => void;
  onSave: () => void;
};

const COMMON_PURITY_PRESETS = [
  '24K (99.9%)',
  '22K (91.6%)',
  '18K (75.0%)',
  '14K (58.5%)',
  '999 Fine',
  '925 Silver',
  'PT950',
];

function AddMetaltype({
  form,
  editing,
  saving,
  selectedImage,
  onChange,
  onSelectImage,
  onRemoveImage,
  onCancel,
  onSave,
}: Props) {
  const imagePreview =
    selectedImage?.uri ||
    (form.imagePath ? getProductImageUrl({ image: form.imagePath }) : undefined);

  const togglePurityPreset = (preset: string) => {
    const currentList = form.purity
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    let updatedList: string[];
    if (currentList.includes(preset)) {
      updatedList = currentList.filter(p => p !== preset);
    } else {
      updatedList = [...currentList, preset];
    }
    onChange('purity', updatedList.join(', '));
  };

  const isPresetSelected = (preset: string) => {
    const currentList = form.purity
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    return currentList.includes(preset);
  };

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View className="h-14 flex-row items-center justify-between border-b border-[#00382E] bg-primary px-4">
          <View className="flex-1 flex-row items-center pr-3">
            <Pressable
              onPress={onCancel}
              disabled={saving}
              className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
              accessibilityRole="button"
              accessibilityLabel="Back to metal types"
            >
              <MetalIcon name="back" color="#FFFFFF" size={18} />
            </Pressable>

            <View className="flex-1">
              <Text className="text-base font-extrabold tracking-wide text-white" numberOfLines={1}>
                {editing ? 'Edit Metal Type' : 'Add Metal Type'}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Text className="text-[10px] font-medium text-emerald-200">
                  Sri Golds Jewellery
                </Text>
                <Text className="mx-1.5 text-[8px] text-emerald-400">◆</Text>
                <Text className="text-[10px] font-bold text-accent-light">
                  {editing ? 'Update Metal' : 'New Configuration'}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={onSave}
            disabled={saving || !form.name.trim()}
            className={`h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/20 ${
              saving || !form.name.trim() ? 'opacity-40' : 'active:bg-accent/30'
            }`}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Save changes' : 'Save metal'}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#F5C45E" />
            ) : (
              <MetalIcon name="check" color="#F5C45E" size={18} />
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
            {/* Section 01: Metal Information */}
            <FormSection step="01" title="Metal Information">
              {/* Metal Name */}
              <View>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Metal Name <Text className="text-red-500">*</Text>
                  </Text>
                  <Text className="text-[10px] text-slate-400">{form.name.length}/100</Text>
                </View>
                <TextInput
                  value={form.name}
                  onChangeText={value => onChange('name', value)}
                  placeholder="e.g. Gold, Silver, Platinum"
                  placeholderTextColor="#94A3B8"
                  maxLength={100}
                  className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-slate-800"
                  accessibilityLabel="Metal name"
                />
              </View>

              {/* Purity Options */}
              <View>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Purity Grades
                  </Text>
                  <Text className="text-[10px] text-slate-400">Comma separated</Text>
                </View>
                <TextInput
                  value={form.purity}
                  onChangeText={value => onChange('purity', value)}
                  placeholder="e.g. 24K, 22K (916), 18K"
                  placeholderTextColor="#94A3B8"
                  maxLength={200}
                  className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-slate-800"
                  accessibilityLabel="Purity"
                />

                {/* Quick Purity Preset Chips */}
                <View className="mt-2.5">
                  <Text className="mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Preset Suggestions
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {COMMON_PURITY_PRESETS.map(preset => {
                      const selected = isPresetSelected(preset);
                      return (
                        <Pressable
                          key={preset}
                          onPress={() => togglePurityPreset(preset)}
                          className={`rounded-lg border px-2.5 py-1.5 active:opacity-80 ${
                            selected
                              ? 'border-emerald-600 bg-emerald-50'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                          accessibilityRole="button"
                          accessibilityLabel={`Toggle purity ${preset}`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              selected ? 'text-emerald-800' : 'text-slate-600'
                            }`}
                          >
                            {selected ? `✓ ${preset}` : `+ ${preset}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Description */}
              <View>
                <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  Description
                </Text>
                <TextInput
                  value={form.description}
                  onChangeText={value => onChange('description', value)}
                  placeholder="Add optional purity benchmarks, hallmark details, or description…"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="min-h-24 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-slate-800"
                  accessibilityLabel="Description"
                />
              </View>

              {/* Status Radio Cards */}
              <View>
                <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  Status
                </Text>
                <View className="flex-row gap-3">
                  {(['Active', 'Inactive'] as const).map(statusOption => {
                    const isSelected =
                      form.status.toLowerCase() === statusOption.toLowerCase();
                    return (
                      <Pressable
                        key={statusOption}
                        onPress={() => onChange('status', statusOption)}
                        className={`flex-1 rounded-xl border p-3 active:opacity-90 ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface'
                        }`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Status ${statusOption}`}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <View
                              className={`mr-2 h-2.5 w-2.5 rounded-full ${
                                statusOption === 'Active' ? 'bg-success' : 'bg-slate-400'
                              }`}
                            />
                            <Text
                              className={`text-sm font-bold ${
                                isSelected ? 'text-primary' : 'text-slate-700'
                              }`}
                            >
                              {statusOption}
                            </Text>
                          </View>
                          <View
                            className={`h-4 w-4 rounded-full border items-center justify-center ${
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected ? (
                              <View className="h-1.5 w-1.5 rounded-full bg-white" />
                            ) : null}
                          </View>
                        </View>
                        <Text className="mt-1 text-[11px] text-slate-400">
                          {statusOption === 'Active'
                            ? 'Available in product forms'
                            : 'Hidden from new entries'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </FormSection>

            {/* Section 02: Visual & Media */}
            <FormSection step="02" title="Visual & Media">
              <Text className="text-xs text-slate-500 leading-4">
                Upload an icon or banner image representing this metal type.
              </Text>

              {imagePreview ? (
                <View className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs">
                  <View className="h-44 w-full bg-slate-50 items-center justify-center p-3">
                    <Image
                      source={{ uri: imagePreview }}
                      className="h-full w-full"
                      resizeMode="contain"
                    />
                  </View>
                  <View className="flex-row items-center justify-between border-t border-slate-100 bg-slate-50/70 p-3">
                    <View className="flex-row items-center">
                      <MetalIcon name="image" color="#004D40" size={16} />
                      <Text className="ml-2 text-xs font-semibold text-slate-600">
                        {selectedImage?.name || 'Metal Image Attached'}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={onSelectImage}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 active:bg-slate-50 shadow-xs"
                        accessibilityRole="button"
                        accessibilityLabel="Change metal image"
                      >
                        <Text className="text-xs font-bold text-slate-700">Change</Text>
                      </Pressable>
                      <Pressable
                        onPress={onRemoveImage}
                        className="flex-row items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 active:bg-rose-100"
                        accessibilityRole="button"
                        accessibilityLabel="Remove metal image"
                      >
                        <MetalIcon name="trash" color="#DC2626" size={12} />
                        <Text className="ml-1 text-xs font-bold text-rose-600">Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={onSelectImage}
                  className="items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-6 active:bg-emerald-50/70"
                  accessibilityRole="button"
                  accessibilityLabel="Upload metal image"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-white shadow-xs">
                    <MetalIcon name="gem" color="#004D40" size={24} />
                  </View>
                  <Text className="mt-3 text-sm font-bold text-slate-800">
                    Upload Metal Image
                  </Text>
                  <Text className="mt-1 text-center text-xs text-slate-500">
                    PNG or JPG • Up to 5 MB
                  </Text>
                  <View className="mt-3 rounded-lg bg-primary px-3.5 py-1.5 shadow-xs">
                    <Text className="text-xs font-bold text-white">Browse Gallery</Text>
                  </View>
                </Pressable>
              )}
            </FormSection>
          </ScrollView>

          {/* Sticky Bottom Actions Bar */}
          <View className="flex-row items-center gap-3 border-t border-border bg-surface px-4 py-3.5 shadow-sm">
            <Pressable
              onPress={onCancel}
              disabled={saving}
              className="flex-1 items-center justify-center rounded-xl border border-border bg-slate-100 py-3.5 active:bg-slate-200"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="text-sm font-bold text-slate-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onSave}
              disabled={saving || !form.name.trim()}
              className={`flex-[2] flex-row items-center justify-center rounded-xl bg-primary py-3.5 shadow-sm ${
                saving || !form.name.trim() ? 'opacity-50' : 'active:opacity-90'
              }`}
              accessibilityRole="button"
              accessibilityLabel={editing ? 'Save changes' : 'Save metal'}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MetalIcon name="check" color="#FFFFFF" size={16} />
                  <Text className="ml-2 text-sm font-bold text-white">
                    {editing ? 'Save Changes' : 'Save Metal'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

function MetalIcon({
  name,
  color,
  size = 18,
}: {
  name: 'back' | 'check' | 'close' | 'image' | 'gem' | 'trash';
  color: string;
  size?: number;
}) {
  const iconPaths: Record<typeof name, string[]> = {
    back: ['m15 18-6-6 6-6', 'M20 12H9'],
    check: ['M20 6 9 17l-5-5'],
    close: ['M18 6 6 18', 'm6 6 12 12'],
    image: ['M4 4h16v16H4z', 'm4 16 5-5 4 4 3-3 4 4', 'M9 9h.01'],
    gem: [
      'M6 3h12l4 6-10 12L2 9l4-6Z',
      'M2 9h20',
      'M10 3l-2 6 4 12 4-12-2-6',
    ],
    trash: [
      'M3 6h18',
      'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
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

export default AddMetaltype;
