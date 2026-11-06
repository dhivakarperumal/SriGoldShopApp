import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { formatPrice } from '../homeUtils';
import type { HomeGoldRate } from '../types';
import HomeSkeleton from './HomeSkeleton';

type MetalName = 'Gold' | 'Silver' | 'Diamond' | 'Platinum';

type RateDefinition = {
  purity: string;
  label: string;
  detail: string;
};

type RateGroup = {
  metal: MetalName;
  tagline: string;
  rates: RateDefinition[];
};

const RATE_GROUPS: RateGroup[] = [
  {
    metal: 'Gold',
    tagline: 'Timeless value',
    rates: [
      { purity: '999', label: '24K (999)', detail: 'Pure Gold' },
      { purity: '916', label: '22K (916)', detail: 'Standard Gold' },
      { purity: '833', label: '20K (833)', detail: 'Premium Gold' },
      { purity: '750', label: '18K (750)', detail: 'Classic Gold' },
      { purity: '585', label: '14K (585)', detail: 'Light Gold' },
    ],
  },
  {
    metal: 'Silver',
    tagline: 'Everyday elegance',
    rates: [{ purity: '999', label: 'Silver 999', detail: 'Pure Silver' }],
  },
  {
    metal: 'Diamond',
    tagline: 'Exceptional sparkle',
    rates: [
      { purity: 'D-F / VVS', label: 'D – F / VVS', detail: 'Top Quality' },
      { purity: 'G-H / VS', label: 'G – H / VS', detail: 'High Quality' },
      { purity: 'I-J / SI', label: 'I – J / SI', detail: 'Good Quality' },
    ],
  },
  {
    metal: 'Platinum',
    tagline: 'Rare & enduring',
    rates: [
      { purity: '950', label: 'Platinum 950', detail: '95% Pure' },
      { purity: '900', label: 'Platinum 900', detail: '90% Pure' },
    ],
  },
];

const METAL_STYLES: Record<MetalName, { icon: string; color: string }> = {
  Gold: { icon: '◉', color: '#d9a441' },
  Silver: { icon: '✦', color: '#aeb8ad' },
  Diamond: { icon: '◇', color: '#d9a441' },
  Platinum: { icon: '◎', color: '#81968a' },
};

const styles = StyleSheet.create({
  backgroundImage: StyleSheet.absoluteFill,
  backgroundOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 40, 31, 0.84)',
  },
});

const normalizePurity = (purity: string) =>
  purity.toUpperCase().replace(/[–—]/g, '-').replace(/\s+/g, '');

function findRate(
  rates: HomeGoldRate[],
  metal: MetalName,
  purity: string,
): HomeGoldRate | undefined {
  return rates.find(
    rate =>
      rate.metal_type.toLowerCase() === metal.toLowerCase() &&
      normalizePurity(rate.purity) === normalizePurity(purity),
  );
}

function RateValue({
  rate,
  isLoading,
}: {
  rate?: HomeGoldRate;
  isLoading: boolean;
}) {
  if (isLoading && !rate) {
    return <HomeSkeleton className="h-4 w-20 bg-[#e8dfd0]" />;
  }
  if (!rate) return <Text className="text-sm font-bold text-[#123c2d]">—</Text>;

  return (
    <View className="items-end">
      <Text className="text-sm font-extrabold text-[#123c2d]">
        {formatPrice(rate.rate_per_unit ?? rate.rate_per_gram)}
      </Text>
      <Text className="mt-0.5 text-[10px] text-[#77736d]">
        per {rate.rate_unit === 'carat' ? 'carat' : 'gram'}
      </Text>
    </View>
  );
}

function HomeGoldRatesSection({
  rates,
  isLoading,
  error,
}: {
  rates: HomeGoldRate[];
  isLoading: boolean;
  error?: string;
}) {
  const [selectedMetal, setSelectedMetal] = useState<MetalName | null>(null);
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const visibleGroups = selectedMetal
    ? RATE_GROUPS.filter(group => group.metal === selectedMetal)
    : RATE_GROUPS;

  return (
    <>
      <View className="relative mb-5 overflow-hidden rounded-2xl border border-[#d9b568] bg-primary-dark px-4 py-4">
        <Image
          source={require('../assets/bridalcollection.png')}
          resizeMode="cover"
          style={styles.backgroundImage}
          accessible={false}
        />
        <View pointerEvents="none" style={styles.backgroundOverlay} />

        <View>
          <Text className="text-[9px] font-bold uppercase tracking-[2.4px] text-[#f2d58a]">
            Today&apos;s market rates
          </Text>
          <Text className="mt-1 font-serif text-2xl font-bold leading-tight text-[#fff9e9]">
            Know today&apos;s <Text className="text-[#f2d58a]">rates</Text>
          </Text>
          <Text className="mt-1 text-[11px] leading-4 text-white/80">
            Gold, silver, diamond and platinum rates at a glance.
          </Text>
        </View>

        <View className="mt-4 flex-row items-start">
          {RATE_GROUPS.map((group, index) => {
            const style = METAL_STYLES[group.metal];
            return (
              <Pressable
                key={group.metal}
                accessibilityRole="button"
                accessibilityLabel={`View ${group.metal} rates`}
                onPress={() => {
                  setSelectedMetal(group.metal);
                  setIsRatesOpen(true);
                }}
                className={`min-w-0 flex-1 items-center px-1 ${
                  index < RATE_GROUPS.length - 1
                    ? 'border-r border-white/15'
                    : ''
                }`}
              >
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: style.color }}
                >
                  {group.metal === 'Gold' ? (
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                      <Circle cx="12" cy="12" r="8" fill="none" stroke="#fff" strokeWidth="2" />
                      <Circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="2" />
                    </Svg>
                  ) : group.metal === 'Diamond' ? (
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                      <Path d="M3 9 7 4h10l4 5-9 11L3 9Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                      <Path d="m3 9 18 0M7 4l5 16 5-16" fill="none" stroke="#fff" strokeWidth="1.5" />
                    </Svg>
                  ) : group.metal === 'Platinum' ? (
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                      <Circle cx="12" cy="12" r="8" fill="none" stroke="#fff" strokeWidth="2" />
                      <Circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="2" />
                    </Svg>
                  ) : (
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                      <Path d="M12 2 14.5 9.5 22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                    </Svg>
                  )}
                </View>
                <Text className="mt-1 text-[10px] font-semibold text-white">
                  {group.metal}
                </Text>
                <Text
                  className="mt-0.5 text-center text-[8px] leading-3 text-white/65"
                  numberOfLines={1}
                >
                  {group.tagline}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-4 flex-row items-center justify-between border-t border-white/15 pt-3">
          <View className="flex-row items-center">
            <Text className="mr-1.5 text-[#f2d58a]">◷</Text>
            <Text className="text-[9px] text-white/70">
              {isLoading ? 'Rates updating' : error ? 'Rates unavailable' : 'Rates updated daily'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSelectedMetal(null);
              setIsRatesOpen(true);
            }}
            className="flex-row items-center rounded-full bg-[#e7b848] px-3 py-2"
          >
            <Text className="text-[10px] font-bold text-[#153729]">
              View today&apos;s rates
            </Text>
            <Text className="ml-1 text-xs font-bold text-[#153729]">›</Text>
          </Pressable>
        </View>
        {error ? (
          <Text className="mt-2 text-[10px] text-amber-100" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </View>

      <Modal
        visible={isRatesOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRatesOpen(false)}
      >
        <View className="flex-1 justify-center bg-black/60 px-4 py-8">
          <Pressable
            className="absolute inset-0"
            onPress={() => setIsRatesOpen(false)}
            accessibilityLabel="Close rates"
            accessibilityRole="button"
          />
          {visibleGroups.length > 0 ? (
            <View className="max-h-[85%] overflow-hidden rounded-2xl border border-[#e7d4a8] bg-[#fffaf0]">
              <View className="flex-row items-start justify-between bg-primary px-4 py-4">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#f1d384]">
                    Today&apos;s market rates
                  </Text>
                  <Text className="mt-1 text-xl font-bold text-white">
                    {selectedMetal ? `${selectedMetal} rates` : 'Precious metal rates'}
                  </Text>
                  <Text className="mt-1 text-xs text-white/75">
                    Rates are updated daily
                  </Text>
                </View>
                <Pressable
                  onPress={() => setIsRatesOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close rates"
                  className="h-9 w-9 items-center justify-center rounded-full border border-white/30"
                >
                  <Text className="text-xl text-white">×</Text>
                </Pressable>
              </View>
              <ScrollView className="p-3">
                {visibleGroups.map(group => (
                  <View key={group.metal} className="mb-3">
                    {!selectedMetal ? (
                      <Text className="mb-2 text-base font-bold text-[#153c2e]">
                        {group.metal}
                      </Text>
                    ) : null}
                    {group.rates.map(item => {
                      const rate = findRate(rates, group.metal, item.purity);
                      return (
                        <View
                          key={`${group.metal}-${item.purity}`}
                          className="mb-2 min-h-[62px] flex-row items-center justify-between gap-2 rounded-lg border border-[#f1e8d8] bg-white px-3 py-2"
                        >
                          <View className="min-w-0 flex-1">
                            <Text
                              className="text-sm font-bold text-[#29251e]"
                              numberOfLines={1}
                            >
                              {item.label}
                            </Text>
                            <Text className="mt-0.5 text-xs text-[#77736d]">
                              {item.detail}
                            </Text>
                          </View>
                          <RateValue rate={rate} isLoading={isLoading} />
                        </View>
                      );
                    })}
                  </View>
                ))}
                <Text className="px-1 py-2 text-[11px] leading-4 text-[#514832]">
                  {selectedMetal === 'Diamond'
                    ? 'Diamond rates are per carat. Final jewellery prices may include making charges, stones and applicable taxes.'
                    : 'Rates are per gram. Final jewellery prices may include making charges, stones and applicable taxes.'}
                </Text>
                {error ? (
                  <Text className="px-1 pb-2 text-xs text-amber-800">
                    The latest rate refresh failed.
                  </Text>
                ) : null}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

export default HomeGoldRatesSection;
