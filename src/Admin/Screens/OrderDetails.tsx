import { Text, View } from 'react-native';
import type { TodayOrder } from '../Navigations/NotificationDropdown';

function OrderDetails({ order }: { order: TodayOrder | null }) {
  return (
    <View className="flex-1 bg-background px-5 py-6">
      <Text className="text-xl font-semibold text-primary-dark">
        Order Details
      </Text>
      {order ? (
        <View className="mt-5 rounded-2xl border border-border bg-surface p-5">
          <Detail label="Order ID" value={order.id} />
          <Detail label="Customer" value={order.customerName} />
          <Detail label="Time" value={order.time || 'Not provided'} />
          <Detail
            label="Total"
            value={order.total.toLocaleString(undefined, {
              style: 'currency',
              currency: 'INR',
            })}
          />
          <Detail label="Status" value={order.status} />
        </View>
      ) : (
        <Text className="mt-3 text-sm text-muted">
          Select an order from notifications to view its details.
        </Text>
      )}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-4">
      <Text className="text-xs text-muted">{label}</Text>
      <Text className="mt-1 text-sm font-medium capitalize text-slate-800">
        {value}
      </Text>
    </View>
  );
}

export default OrderDetails;
