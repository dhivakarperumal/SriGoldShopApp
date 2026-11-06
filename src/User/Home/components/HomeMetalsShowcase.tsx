import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import type { HomeMetal } from '../types';
import HomeSkeleton from './HomeSkeleton';

type MetalKey = 'gold' | 'silver' | 'diamond' | 'platinum';

type HomeMetalsShowcaseProps = {
  metalName: string;
  metal?: HomeMetal;
  isLoading: boolean;
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

function HomeMetalsShowcase({
  metalName,
  metal,
  isLoading,
  onExploreMetal,
}: HomeMetalsShowcaseProps) {
  const displayName = metal?.name || metalName;
  const key = getMetalKey(displayName);
  const colors = key ? METAL_TEXT_COLORS[key] : undefined;
  const background = key ? METAL_BACKGROUNDS[key] : undefined;
  return (
    <View
      className="mb-3 min-h-[170px] justify-center overflow-hidden rounded-xl border border-[#d8b66c] bg-[#f7e8c8] px-5 py-5"
      accessibilityLabel={`${displayName} collection`}
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
        {isLoading ? (
          <>
            <HomeSkeleton className="h-7 w-4/5 bg-white/30" />
            <HomeSkeleton className="mt-2 h-3 w-1/3 bg-white/25" />
            <HomeSkeleton className="mt-3 h-3 w-full bg-white/25" />
            <HomeSkeleton className="mt-2 h-3 w-4/5 bg-white/25" />
            <HomeSkeleton className="mt-4 h-9 w-28 rounded-full bg-white/35" />
          </>
        ) : (
          <>
            <Text
              className={`font-serif text-2xl font-bold leading-tight ${
                colors?.title || 'text-[#12372d]'
              }`}
            >
              {displayName}
            </Text>
            {metal?.purity ? (
              <Text
                className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${
                  colors?.detail || 'text-[#26382f]'
                }`}
              >
                {metal.purity}
              </Text>
            ) : null}
            {metal?.description ? (
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
              onPress={() => onExploreMetal(displayName)}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${displayName}`}
            >
              <Text className="text-[10px] font-bold text-[#382a10]">
                Explore {displayName}
              </Text>
              <Text className="ml-1.5 text-xs font-bold text-[#382a10]">›</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

export default HomeMetalsShowcase;
