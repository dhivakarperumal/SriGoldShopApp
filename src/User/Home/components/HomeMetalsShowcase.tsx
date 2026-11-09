import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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

// Card height — tall enough to let the image breathe
const CARD_HEIGHT = 170;
// Horizontal padding from HomeUserHome px-4 = 16 each side
const HOME_PADDING = 32;

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8b66c',
    backgroundColor: '#f7e8c8',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: '60%',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  exploreBtn: {
    marginTop: 12,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#e7b848',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exploreBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#382a10',
  },
  exploreBtnArrow: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#382a10',
  },
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
  const { width } = useWindowDimensions();
  // Card width = screen width minus the px-4 padding on both sides
  const cardWidth = width - HOME_PADDING;

  const displayName = metal?.name || metalName;
  const key = getMetalKey(displayName);
  const colors = key ? METAL_TEXT_COLORS[key] : undefined;
  const background = key ? METAL_BACKGROUNDS[key] : undefined;

  return (
    <View
      style={[styles.card, { width: cardWidth }]}
      accessibilityLabel={`${displayName} collection`}
    >
      {/* Full-width background image — stretch so the whole image is always visible */}
      {background ? (
        <Image
          source={background}
          style={[styles.bgImage, { width: cardWidth, height: CARD_HEIGHT }]}
          resizeMode="stretch"
          accessible={false}
        />
      ) : null}

      {/* Subtle tint overlay */}
      {colors ? (
        <View
          pointerEvents="none"
          style={[
            styles.overlay,
            { backgroundColor: colors.overlay.replace('bg-[', '').replace(']', '') },
          ]}
        />
      ) : null}

      {/* Text content — left 60% so the image subject on the right stays visible */}
      <View style={styles.content}>
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
              style={styles.exploreBtn}
              onPress={() => onExploreMetal(displayName)}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${displayName}`}
            >
              <Text style={styles.exploreBtnText}>Explore {displayName}</Text>
              <Text style={styles.exploreBtnArrow}>›</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

export default HomeMetalsShowcase;
