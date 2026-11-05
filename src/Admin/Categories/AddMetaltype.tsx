import {
  ActivityIndicator,
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

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-end bg-slate-950/50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView className="max-h-[92%] rounded-t-3xl bg-background" edges={['bottom']}>
        <View className="flex-row items-center justify-between border-b border-border bg-surface px-5 py-4">
          <View>
            <Text className="text-lg font-black text-slate-900">
              {editing ? 'Edit Metal' : 'Add Metal'}
            </Text>
            <Text className="mt-1 text-xs text-slate-500">
              Enter the metal type and catalog details.
            </Text>
          </View>
          <Pressable
            className="rounded-full bg-slate-100 px-3 py-2"
            onPress={onCancel}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Close metal form"
          >
            <Text className="font-bold text-slate-600">×</Text>
          </Pressable>
        </View>

        <ScrollView
          className="shrink"
          contentContainerClassName="gap-4 px-5 py-5"
          keyboardShouldPersistTaps="handled"
        >
          <FormField
            label="Metal name *"
            value={form.name}
            onChangeText={value => onChange('name', value)}
            placeholder="e.g. Gold"
            maxLength={100}
          />
          <FormField
            label="Purity"
            value={form.purity}
            onChangeText={value => onChange('purity', value)}
            placeholder="e.g. 22K or 24K"
            maxLength={200}
          />
          <View>
            <Text className="mb-2 text-xs font-bold text-slate-700">Description</Text>
            <TextInput
              value={form.description}
              onChangeText={value => onChange('description', value)}
              placeholder="Add optional details about this metal..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="min-h-28 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-slate-800"
            />
          </View>

          <View>
            <Text className="mb-2 text-xs font-bold text-slate-700">Metal image</Text>
            {imagePreview ? (
              <View className="overflow-hidden rounded-xl border border-border bg-surface">
                <Image
                  source={{ uri: imagePreview }}
                  className="h-40 w-full"
                  resizeMode="contain"
                />
                <View className="flex-row justify-end gap-2 border-t border-border p-2">
                  <Pressable
                    className="rounded-lg bg-slate-100 px-3 py-2"
                    onPress={onSelectImage}
                    accessibilityRole="button"
                  >
                    <Text className="text-xs font-bold text-slate-700">Change</Text>
                  </Pressable>
                  <Pressable
                    className="rounded-lg bg-red-50 px-3 py-2"
                    onPress={onRemoveImage}
                    accessibilityRole="button"
                    accessibilityLabel="Remove metal image"
                  >
                    <Text className="text-xs font-bold text-red-600">Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                className="min-h-36 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5"
                onPress={onSelectImage}
                accessibilityRole="button"
              >
                <Text className="mb-2 text-2xl font-bold text-amber-600">⇧</Text>
                <Text className="text-sm font-bold text-slate-700">Upload Metal Image</Text>
                <Text className="mt-1 text-[10px] text-slate-500">PNG or JPG, up to 5 MB</Text>
              </Pressable>
            )}
          </View>

          <View>
            <Text className="mb-2 text-xs font-bold text-slate-700">Status</Text>
            <View className="flex-row gap-2">
              {(['Active', 'Inactive'] as const).map(status => (
                <Pressable
                  key={status}
                  className={`flex-1 items-center rounded-xl border py-3 ${
                    form.status === status
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface'
                  }`}
                  onPress={() => onChange('status', status)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: form.status === status }}
                >
                  <Text
                    className={`text-xs font-bold ${
                      form.status === status ? 'text-primary' : 'text-slate-600'
                    }`}
                  >
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View className="flex-row justify-end gap-3 border-t border-border bg-surface px-5 py-4">
          <Pressable
            className="rounded-xl bg-slate-100 px-5 py-3"
            onPress={onCancel}
            disabled={saving}
            accessibilityRole="button"
          >
            <Text className="text-xs font-bold text-slate-700">Cancel</Text>
          </Pressable>
          <Pressable
            className={`min-w-28 items-center rounded-xl bg-primary px-5 py-3 ${
              saving || !form.name.trim() ? 'opacity-50' : 'active:opacity-80'
            }`}
            onPress={onSave}
            disabled={saving || !form.name.trim()}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-xs font-bold text-white">
                {editing ? 'Save Changes' : 'Save Metal'}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <View>
      <Text className="mb-2 text-xs font-bold text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        maxLength={maxLength}
        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-slate-800"
      />
    </View>
  );
}

export default AddMetaltype;