import { StyleSheet, Text, View } from 'react-native';

function AddBotton() {
  return (
    <View
      style={styles.button}
      className="-mt-3.5 h-12 w-12 items-center justify-center rounded-full bg-accent border-2 border-[#00382E]"
    >
      <Text className="text-3xl font-bold leading-9 text-primary-dark">+</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    shadowColor: '#D4A017',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default AddBotton;
