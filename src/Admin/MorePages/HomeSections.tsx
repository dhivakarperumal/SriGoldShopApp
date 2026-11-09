import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import api from '../../api';

type HomeSection = {
  key: string;
  label: string;
  visible: boolean;
};

type Props = {
  onBack: () => void;
};

const isHomeSection = (value: unknown): value is HomeSection =>
  typeof value === 'object' &&
  value !== null &&
  'key' in value &&
  typeof value.key === 'string' &&
  'label' in value &&
  typeof value.label === 'string' &&
  'visible' in value &&
  typeof value.visible === 'boolean';

const getSections = (data: unknown): HomeSection[] => {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('sections' in data) ||
    !Array.isArray(data.sections) ||
    !data.sections.every(isHomeSection)
  ) {
    throw new Error('The home sections response must contain a valid sections array.');
  }
  return data.sections;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  return fallback;
};

function HomeSections({ onBack }: Props) {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSections = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/home-sections', { signal });
      setSections(getSections(data));
    } catch (requestError) {
      if (signal?.aborted) {
        return;
      }
      console.error('Failed to load home section settings:', requestError);
      setError(getErrorMessage(requestError, 'Home section settings could not be loaded.'));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSections(controller.signal);
    return () => controller.abort();
  }, [loadSections]);

  const toggleSection = (key: string) => {
    setSections(current =>
      current.map(section =>
        section.key === key ? { ...section, visible: !section.visible } : section,
      ),
    );
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setSections(current => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) {
        return current;
      }
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [
        reordered[destination],
        reordered[index],
      ];
      return reordered;
    });
  };

  const saveSections = async () => {
    setIsSaving(true);
    setError('');
    try {
      const { data } = await api.put('/home-sections', {
        sections: sections.map((section, index) => ({
          key: section.key,
          visible: section.visible,
          order: index + 1,
        })),
      });
      setSections(getSections(data));
    } catch (requestError) {
      console.error('Failed to save home section settings:', requestError);
      setError(getErrorMessage(requestError, 'Home section settings could not be saved.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
        <Pressable
          onPress={onBack}
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
          accessibilityRole="button"
          accessibilityLabel="Back to more options"
        >
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-extrabold tracking-wide text-white">
            Home Product Sections
          </Text>
          <Text className="text-[10px] font-medium text-emerald-200">
            Choose what appears on Home
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-4"
        showsVerticalScrollIndicator={false}
      >
        

        {error ? (
          <View className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <Text className="text-sm font-semibold text-rose-800">{error}</Text>
            {!sections.length && !isLoading ? (
              <Pressable
                onPress={() => loadSections()}
                className="mt-2 self-start rounded-lg bg-rose-700 px-3 py-2"
                accessibilityRole="button"
                accessibilityLabel="Retry loading home section settings"
              >
                <Text className="text-xs font-bold text-white">Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {isLoading ? (
          <View className="items-center rounded-2xl bg-surface p-6">
            <ActivityIndicator color="#004D40" />
            <Text className="mt-2 text-sm text-slate-500">Loading home sections…</Text>
          </View>
        ) : sections.length === 0 ? (
          <View className="rounded-2xl bg-surface p-5">
            <Text className="text-sm text-slate-500">No home section settings are available.</Text>
          </View>
        ) : (
          <>
            {sections.map((section, index) => (
              <View
                key={section.key}
                className="mb-3 flex-row items-center rounded-2xl border border-slate-200 bg-surface p-4"
              >
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <Text className="text-sm font-black text-primary">{index + 1}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                    {section.label}
                  </Text>
                  <Text
                    className={`mt-1 text-[10px] font-semibold ${
                      section.visible ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {section.visible ? 'Visible on home page' : 'Hidden on home page'}
                  </Text>
                </View>
                <View className="ml-2 items-end">
                  <Pressable
                    onPress={() => toggleSection(section.key)}
                    className={`h-8 w-14 justify-center rounded-full px-1 ${
                      section.visible ? 'items-end bg-primary' : 'items-start bg-slate-300'
                    }`}
                    accessibilityRole="switch"
                    accessibilityLabel={`${section.visible ? 'Hide' : 'Show'} ${section.label} on home page`}
                    accessibilityState={{ checked: section.visible }}
                  >
                    <View className="h-6 w-6 rounded-full bg-white" />
                  </Pressable>
                  <View className="mt-2 flex-row">
                    <Pressable
                      onPress={() => moveSection(index, -1)}
                      disabled={index === 0}
                      className="mr-1 h-8 w-8 items-center justify-center rounded-lg border border-slate-200"
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${section.label} up`}
                      accessibilityState={{ disabled: index === 0 }}
                    >
                      <Text className="font-bold text-slate-700">↑</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => moveSection(index, 1)}
                      disabled={index === sections.length - 1}
                      className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200"
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${section.label} down`}
                      accessibilityState={{ disabled: index === sections.length - 1 }}
                    >
                      <Text className="font-bold text-slate-700">↓</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            <Pressable
              onPress={saveSections}
              disabled={isSaving}
              className={`mt-1 items-center rounded-xl bg-primary-dark px-5 py-3.5 ${
                isSaving ? 'opacity-60' : ''
              }`}
              accessibilityRole="button"
              accessibilityLabel={isSaving ? 'Saving home layout' : 'Save home layout'}
              accessibilityState={{ disabled: isSaving }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-bold text-white">Save Home Layout</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default HomeSections;
