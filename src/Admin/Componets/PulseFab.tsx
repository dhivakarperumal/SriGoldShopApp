import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type PulseFabProps = {
  accessibilityLabel: string;
  expanded?: boolean;
  onPress: () => void;
};

function PulseFab({ accessibilityLabel, expanded = false, onPress }: PulseFabProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View className="h-14 w-14 items-center justify-center">
      {!expanded ? (
        <Animated.View
          pointerEvents="none"
          className="absolute h-14 w-14 rounded-full bg-accent"
          style={{
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.35, 0],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.22],
                }),
              },
            ],
          }}
        />
      ) : null}
      <Pressable
        onPress={onPress}
        className="h-14 w-14 items-center justify-center rounded-full border-2 border-accent-light bg-primary shadow-lg"
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded }}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          {(expanded ? ['M18 6 6 18', 'm6 6 12 12'] : ['M12 5v14', 'M5 12h14']).map(path => (
            <Path
              key={path}
              d={path}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    elevation: 8,
    shadowColor: '#064A41',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

export default PulseFab;
