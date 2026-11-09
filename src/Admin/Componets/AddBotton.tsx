import { StyleSheet, Text, View } from 'react-native';

function AddBotton() {
  return (
    <View style={styles.button}>
      <Text style={styles.plusText}>+</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDB628',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  plusText: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
    color: '#000000',
    marginTop: -2,
    textAlign: 'center',
  },
});

export default AddBotton;
