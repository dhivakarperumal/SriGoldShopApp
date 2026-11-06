import { Text, View } from 'react-native';
import { formatPrice } from '../homeUtils';
import type { HomeGoldRate } from '../types';

type HomeGoldRatesSectionProps = {
  rates: HomeGoldRate[];
  isLoading: boolean;
  error?: string;
};

function HomeGoldRatesSection({
  rates,
  isLoading,
  error,
}: HomeGoldRatesSectionProps) {
  return (
    <View className="mb-5 overflow-hidden rounded-2xl border border-[#d9b568] bg-primary-dark p-4">
      <Text className="text-[10px] font-bold uppercase tracking-[2px] text-accent-light">
        Today&apos;s market rates
      </Text>
      <Text className="mt-1 text-lg font-bold text-white">Know today&apos;s rates</Text>
      <Text className="mt-1 text-xs text-emerald-100">
        Gold and silver rates at a glance
      </Text>
      {error ? (
        <Text className="mt-3 text-xs text-amber-100" accessibilityRole="alert">
          {error}
        </Text>
      ) : (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {['999', '916', 'Silver'].map((purity, index) => {
            const rate =
              index === 2
                ? rates.find(item =>
                    item.metal_type.toLowerCase().includes('silver'),
                  )
                : rates.find(
                    item =>
                      item.metal_type.toLowerCase() === 'gold' &&
                      item.purity.replace(/\D/g, '') === purity,
                  );
            const title = index === 2 ? 'Silver' : index === 0 ? '24K Gold' : '22K Gold';

            return (
              <View
                key={purity}
                className="min-w-[30%] flex-1 rounded-xl border border-white/15 bg-white/10 p-3"
              >
                <Text className="text-[10px] text-emerald-100">{title}</Text>
                <Text className="mt-1 text-sm font-bold text-[#f5d994]">
                  {rate
                    ? formatPrice(rate.rate_per_unit ?? rate.rate_per_gram)
                    : isLoading
                      ? '…'
                      : '—'}
                </Text>
                <Text className="mt-0.5 text-[9px] text-white/70">
                  per {rate?.rate_unit === 'carat' ? 'carat' : 'gram'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default HomeGoldRatesSection;
