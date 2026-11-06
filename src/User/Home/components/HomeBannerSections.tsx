import { ImageBackground, Text, View } from 'react-native';

const PROMOTIONS = [
  {
    title: 'Bridal Collection',
    subtitle: 'For your most precious moments',
    eyebrow: 'Exclusive Collection',
    image: require('../assets/bridalcollection.png'),
    lightText: true,
  },
  {
    title: 'Gold Coins & Bars',
    subtitle: 'A symbol of prosperity for generations',
    eyebrow: 'Timeless Investment',
    image: require('../assets/goldcoinandbars.png'),
    lightText: false,
  },
];

function HomeBannerSections() {
  return (
    <View className="mb-5 gap-3">
      {PROMOTIONS.map(promotion => (
        <ImageBackground
          key={promotion.title}
          source={promotion.image}
          resizeMode="cover"
          className="min-h-40 justify-center overflow-hidden rounded-xl border border-[#d9b568] p-5"
          accessibilityLabel={`${promotion.title}. ${promotion.subtitle}`}
        >
          <View
            className={`absolute inset-0 ${
              promotion.lightText ? 'bg-primary-dark/70' : 'bg-[#36210b]/55'
            }`}
          />
          <View className="relative max-w-[78%]">
            <Text className="text-[9px] font-semibold uppercase tracking-[2px] text-[#f8d77e]">
              {promotion.eyebrow}
            </Text>
            <Text className="mt-1 font-serif text-xl font-bold text-white">
              {promotion.title}
            </Text>
            <Text className="mt-1.5 text-xs leading-5 text-white">
              {promotion.subtitle}
            </Text>
          </View>
        </ImageBackground>
      ))}
    </View>
  );
}

export default HomeBannerSections;
