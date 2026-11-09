import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type StatIcon =
  | 'users'
  | 'calendar'
  | 'check'
  | 'pause'
  | 'loan'
  | 'box'
  | 'alert'
  | 'message'
  | 'clock'
  | 'list';

type StatTone = 'green' | 'blue' | 'purple' | 'wine' | 'teal';

const TONES: Record<StatTone, { backgroundColor: string; accentColor: string }> = {
  green: { backgroundColor: '#063D32', accentColor: '#E6BF5A' },
  blue: { backgroundColor: '#0A3768', accentColor: '#E6BF5A' },
  purple: { backgroundColor: '#4B164E', accentColor: '#E6BF5A' },
  wine: { backgroundColor: '#571E38', accentColor: '#E6BF5A' },
  teal: { backgroundColor: '#123E57', accentColor: '#E6BF5A' },
};

const ICON_PATHS: Record<StatIcon, string[]> = {
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
    'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    'M20 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  calendar: [
    'M8 2v4',
    'M16 2v4',
    'M3 10h18',
    'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z',
  ],
  check: ['M20 6 9 17l-5-5', 'M22 12a10 10 0 1 1-5.8-9.1'],
  pause: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M10 15V9', 'M14 15V9'],
  loan: ['M3 7h18l-2 12H5L3 7Z', 'M3 7 2 4H1', 'M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', 'M17 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'],
  box: ['m21 8-9 5-9-5', 'm3 8 9-5 9 5v10l-9 5-9-5V8Z', 'M12 13v10'],
  alert: [
    'M12 8v4',
    'M12 16h.01',
    'M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z',
  ],
  message: [
    'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
  ],
  clock: ['M12 8v4l3 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
};

const styles = StyleSheet.create({
  iconBadge: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 5,
  },
});

export default function AdminStatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: StatIcon;
  tone: StatTone;
}) {
  const { backgroundColor, accentColor } = TONES[tone];

  return (
    <View
      className="relative mb-3 min-h-[108px] w-[48.5%] overflow-hidden rounded-[18px] border-2 px-2.5 pb-2 pt-2 shadow-lg"
      style={{ backgroundColor, borderColor: accentColor }}
      accessibilityLabel={`${label}: ${value}`}
      accessible
    >
      <View className="absolute -left-3 -right-3 bottom-0 h-24" pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 300 96" preserveAspectRatio="none">
          <Path d="M0 64 C52 48 85 80 143 66 C210 49 245 22 300 18 V96 H0Z" fill={accentColor} opacity={0.1} />
          <Path d="M0 78 C58 60 93 92 157 76 C213 62 258 39 300 36 V96 H0Z" fill={accentColor} opacity={0.18} />
          <Path d="M0 90 C72 76 106 98 174 86 C224 76 265 55 300 52 V96 H0Z" fill={accentColor} opacity={0.34} />
        </Svg>
      </View>
      <View className="z-10 min-h-10 flex-row items-center">
        <View className="mr-1.5 h-6 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
        <Text
          className="min-w-0 flex-1 pr-1 text-[11px] font-bold leading-[14px] text-white"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {label}
        </Text>
        <View
          className="h-10 w-10 shrink-0 items-center justify-center"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            className="h-7 w-7 items-center justify-center rounded-lg border"
            style={[
              styles.iconBadge,
              {
                borderColor: accentColor,
                backgroundColor: `${accentColor}35`,
                transform: [{ rotate: '45deg' }],
                shadowColor: accentColor,
              },
            ]}
          >
            <View style={{ transform: [{ rotate: '-45deg' }] }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                {ICON_PATHS[icon].map(path => (
                  <Path
                    key={path}
                    d={path}
                    stroke={accentColor}
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </Svg>
            </View>
          </View>
          <Svg width={10} height={10} viewBox="0 0 24 24" className="absolute right-1 top-0">
            <Path
              d="M12 1.5 14.2 9.8 22.5 12l-8.3 2.2-2.2 8.3-2.2-8.3L1.5 12l8.3-2.2L12 1.5Z"
              fill="#FFF4C2"
            />
          </Svg>
        </View>
      </View>
      <Text
        className="z-10 mt-1 text-[24px] font-extrabold tracking-tight text-white"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value.toLocaleString('en-IN')}
      </Text>
    </View>
  );
}
