import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import api from '../../../api';

type Metal = {
  id: string | number;
  name: string;
  status?: string;
  purity?: string;
  description?: string;
};

type MetalKey = 'gold' | 'silver' | 'diamond' | 'platinum';

type HomeMetalsShowcaseProps = {
  onExploreMetal: (metalName: string) => void;
};

const METAL_ORDER: MetalKey[] = ['gold', 'silver', 'diamond', 'platinum'];
const METAL_BACKGROUNDS: Record<MetalKey, ImageSourcePropType> = {
  gold: require('../assets/metals/goldmetal.png'),
  silver: require('../assets/metals/silvermetal.png'),
  diamond: require('../assets/metals/diamondmetal.png'),
  platinum: require('../assets/metals/platinummetal.png'),
};
const METAL_TEXT_COLORS: Record<
  MetalKey,
  { title: string; detail: string; overlay: string }
> = {
  gold: {
    title: 'text-[#fff8e7]',
    detail: 'text-white',
    overlay: 'bg-[#00382c]/20',
  },
  silver: {
    title: 'text-[#10382d]',
    detail: 'text-[#172f26]',
    overlay: 'bg-[#f4f4ed]/20',
  },
  diamond: {
    title: 'text-[#70420f]',
    detail: 'text-[#283c32]',
    overlay: 'bg-[#fff8e9]/15',
  },
  platinum: {
    title: 'text-[#fff1bd]',
    detail: 'text-white',
    overlay: 'bg-[#00382c]/20',
  },
};
const styles = StyleSheet.create({
  background: StyleSheet.absoluteFill,
});

function getMetalKey(name: string): MetalKey | undefined {
  const normalizedName = name.toLowerCase();
  return METAL_ORDER.find(metal => normalizedName.includes(metal));
}

function HomeMetalsShowcase({ onExploreMetal }: HomeMetalsShowcaseProps) {
  const [metals, setMetals] = useState<Metal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadMetals = async () => {
      try {
        const response = await api.get('/metals', {
          signal: controller.signal,
        });
        if (!Array.isArray(response.data)) {
          throw new TypeError('The metals response must be an array.');
        }

        const activeMetals = (response.data as Metal[]).filter(
          metal =>
            typeof metal.name === 'string' &&
            String(metal.status || '').toLowerCase() === 'active',
        );
        activeMetals.sort((first, second) => {
          const firstOrder = METAL_ORDER.findIndex(metal =>
            first.name.toLowerCase().includes(metal),
          );
          const secondOrder = METAL_ORDER.findIndex(metal =>
            second.name.toLowerCase().includes(metal),
          );
          return (
            (firstOrder < 0 ? METAL_ORDER.length : firstOrder) -
            (secondOrder < 0 ? METAL_ORDER.length : secondOrder)
          );
        });
        setMetals(activeMetals);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        console.error('Failed to load Home metals showcase:', requestError);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadMetals().catch(requestError => {
      if (controller.signal.aborted) return;
      console.error('Failed to load Home metals showcase:', requestError);
      setError(true);
      setIsLoading(false);
    });

    return () => controller.abort();
  }, []);

  if (isLoading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator size="small" color="#004D40" />
        <Text className="mt-2 text-xs text-[#756b5b]">Loading metals...</Text>
      </View>
    );
  }

  if (error || metals.length === 0) {
    return (
      <Text
        className="mb-5 py-5 text-center text-sm text-[#756b5b]"
        accessibilityRole={error ? 'alert' : 'text'}
      >
        {error
          ? 'Metal collections could not be loaded.'
          : 'No active metal collections are available.'}
      </Text>
    );
  }

  return (
    <View className="mb-5 gap-3">
      {metals.map(metal => {
        const key = getMetalKey(metal.name);
        const colors = key ? METAL_TEXT_COLORS[key] : undefined;
        const background = key ? METAL_BACKGROUNDS[key] : undefined;

        return (
          <View
            key={metal.id}
            className="min-h-[170px] justify-center overflow-hidden rounded-xl border border-[#d8b66c] bg-[#f7e8c8] px-5 py-5"
            accessibilityLabel={`${metal.name} collection`}
          >
            {background ? (
              <Image
                source={background}
                resizeMode="cover"
                style={styles.background}
                accessible={false}
              />
            ) : null}
            {colors ? (
              <View
                pointerEvents="none"
                className={`absolute inset-0 ${colors.overlay}`}
              />
            ) : null}
            <View className="w-[68%]">
              <Text
                className={`font-serif text-2xl font-bold leading-tight ${
                  colors?.title || 'text-[#12372d]'
                }`}
              >
                {metal.name}
              </Text>
              {metal.purity ? (
                <Text
                  className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${
                    colors?.detail || 'text-[#26382f]'
                  }`}
                >
                  {metal.purity}
                </Text>
              ) : null}
              {metal.description ? (
                <Text
                  className={`mt-1.5 text-[10px] leading-4 ${
                    colors?.detail || 'text-[#26382f]'
                  }`}
                  numberOfLines={2}
                >
                  {metal.description}
                </Text>
              ) : null}
              <Pressable
                className="mt-3 min-h-9 flex-row items-center self-start rounded-full bg-[#e7b848] px-3.5 py-2"
                onPress={() => onExploreMetal(metal.name)}
                accessibilityRole="button"
                accessibilityLabel={`Explore ${metal.name}`}
              >
                <Text className="text-[10px] font-bold text-[#382a10]">
                  Explore {metal.name}
                </Text>
                <Text className="ml-1.5 text-xs font-bold text-[#382a10]">
                  ›
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default HomeMetalsShowcase;
