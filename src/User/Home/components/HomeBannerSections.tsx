import {
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const BANNER_HEIGHT = 170;
const HOME_PADDING = 32;

const styles = StyleSheet.create({
  banner: {
    height: BANNER_HEIGHT,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

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
  const { width } = useWindowDimensions();
  const bannerWidth = width - HOME_PADDING;

  return (
    <View className="mb-5 gap-3">
      {PROMOTIONS.map(promotion => (
        <View
          key={promotion.title}
          className="relative justify-center overflow-hidden rounded-xl border border-[#d9b568] p-5"
          style={[styles.banner, { width: bannerWidth }]}
          accessibilityLabel={`${promotion.title}. ${promotion.subtitle}`}
          accessible
        >
          <Image
            source={promotion.image}
            resizeMode="stretch"
            style={[
              styles.backgroundImage,
              { width: bannerWidth, height: BANNER_HEIGHT },
            ]}
            accessible={false}
          />
          <View className="relative max-w-[78%]">
            <Text
              className={`text-[9px] font-semibold uppercase tracking-[2px] ${
                promotion.lightText ? 'text-[#f8d77e]' : 'text-[#8a5814]'
              }`}
            >
              {promotion.eyebrow}
            </Text>
            <Text
              className={`mt-1 font-serif text-xl font-bold ${
                promotion.lightText ? 'text-white' : 'text-[#35220d]'
              }`}
            >
              {promotion.title}
            </Text>
            <Text
              className={`mt-1.5 text-xs leading-5 ${
                promotion.lightText ? 'text-white' : 'text-[#493314]'
              }`}
            >
              {promotion.subtitle}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default HomeBannerSections;
