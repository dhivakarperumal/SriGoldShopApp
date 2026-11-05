import { Text, View } from 'react-native';

function Orders() {
  return (
    <View className="flex-1 bg-background px-5 py-6">
      <Text className="text-xl font-semibold text-primary-dark">Orders</Text>
      <View className="mt-5 items-center rounded-2xl border border-border bg-surface px-5 py-8">
        <Text className="text-base font-medium text-primary-dark">
          Orders are unavailable
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">
          Configure the orders API endpoint to load and manage orders.
        </Text>
      </View>
    </View>
  );
}

export default Orders;
