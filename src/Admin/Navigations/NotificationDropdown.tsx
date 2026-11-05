import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { ChevronRightIcon, CloseIcon, OrdersIcon } from './NavIcons';

export type TodayOrder = {
  id: string;
  customerName: string;
  time: string;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  isRead?: boolean;
};

type NotificationDropdownProps = {
  visible: boolean;
  ordersEndpoint?: string;
  onClose: () => void;
  onViewAllOrders: () => void;
  onSelectOrder: (order: TodayOrder) => void;
  onUnreadCountChange?: (count: number) => void;
};

type ApiOrder = {
  id?: string | number;
  _id?: string | number;
  orderId?: string | number;
  customerName?: string;
  customer?: string | { name?: string };
  createdAt?: string;
  time?: string;
  total?: number;
  totalAmount?: number;
  status?: string;
  isRead?: boolean;
};

function parseOrders(payload: unknown): TodayOrder[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const response = payload as {
    orders?: unknown;
    data?: unknown;
  };
  const nestedData =
    response.data && typeof response.data === 'object'
      ? (response.data as { orders?: unknown })
      : undefined;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(response.orders)
      ? response.orders
      : Array.isArray(response.data)
        ? response.data
        : Array.isArray(nestedData?.orders)
          ? nestedData.orders
          : [];

  const validItems = items
    .filter(
      (item): item is ApiOrder =>
        Boolean(item) && typeof item === 'object',
    )
    .filter(
      item => item.orderId != null || item.id != null || item._id != null,
    );

  const today = new Date();
  return validItems
    .map(item => {
      const customer =
        typeof item.customer === 'string'
          ? item.customer
          : item.customer?.name;
      const normalizedStatus = item.status?.toLowerCase();
      const status: TodayOrder['status'] =
        normalizedStatus === 'processing' ||
        normalizedStatus === 'completed' ||
        normalizedStatus === 'cancelled'
          ? normalizedStatus
          : 'pending';

      return {
        id: String(item.orderId ?? item.id ?? item._id),
        customerName: item.customerName ?? customer ?? 'Customer',
        time: item.createdAt ?? item.time ?? '',
        total: Number(item.totalAmount ?? item.total ?? 0),
        status,
        isRead: item.isRead,
      };
    })
    .filter(order => {
      const date = new Date(order.time);
      return (
        Number.isNaN(date.getTime()) ||
        (date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate())
      );
    })
    .sort(
      (first, second) =>
        (Date.parse(second.time) || 0) - (Date.parse(first.time) || 0),
    );
}

function formatOrderTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || 'Time unavailable'
    : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatAmount(value: number) {
  if (!Number.isFinite(value)) return '₹0';
  return `₹${value.toLocaleString('en-IN')}`;
}

function NotificationDropdown({
  visible,
  ordersEndpoint,
  onClose,
  onViewAllOrders,
  onSelectOrder,
  onUnreadCountChange,
}: NotificationDropdownProps) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<TodayOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const requestInFlight = useRef(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!ordersEndpoint) {
      setErrorMessage("Today's orders endpoint isn't connected yet.");
      return;
    }

    if (requestInFlight.current || hasFetched.current) {
      return;
    }

    requestInFlight.current = true;
    hasFetched.current = true;
    setIsLoading(true);
    setErrorMessage('');

    api
      .get(ordersEndpoint)
      .then(response => {
        const nextOrders = parseOrders(response.data);
        setOrders(nextOrders);
        onUnreadCountChange?.(
          nextOrders.filter(order => order.isRead === false).length,
        );
      })
      .catch(error => {
        hasFetched.current = false;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load today’s orders. Please try again.',
        );
      })
      .finally(() => {
        requestInFlight.current = false;
        setIsLoading(false);
      });
  }, [onUnreadCountChange, ordersEndpoint, retryCount]);

  const pendingCount = orders.filter(
    order => order.status === 'pending' || order.status === 'processing',
  ).length;
  const completedCount = orders.filter(
    order => order.status === 'completed',
  ).length;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const topOffset = insets.top + 66;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        <Pressable
          className="absolute inset-0 bg-slate-950/25"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close notifications"
        />

        <View
          style={[styles.dropdownContainer, { top: topOffset }]}
          className="absolute left-3 right-3 max-h-[78%] overflow-hidden rounded-2xl border border-slate-200/90 bg-surface"
        >
          {/* Gold accent hairline */}
          <View className="h-1 w-full bg-accent" />

          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-slate-200/80 px-4 py-3.5 bg-slate-50/50">
            <View>
              <View className="flex-row items-center">
                <Text className="text-base font-bold text-primary-dark">
                  Today’s Orders
                </Text>
                <View className="ml-2 rounded-full bg-accent/15 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-accent-dark">
                    LIVE
                  </Text>
                </View>
              </View>
              <Text className="mt-0.5 text-xs text-muted">{dateLabel}</Text>
            </View>

            <Pressable
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-200/60 active:bg-slate-300/80"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close notifications"
            >
              <CloseIcon color="#475569" size={12} />
            </Pressable>
          </View>

          {/* Summary Metric Counters */}
          <View className="flex-row gap-2.5 px-4 py-3 bg-white">
            <SummaryCard
              label="Total"
              value={orders.length}
              bg="bg-slate-50"
              color="text-primary-dark"
            />
            <SummaryCard
              label="Pending"
              value={pendingCount}
              bg="bg-amber-50"
              color="text-accent-dark"
            />
            <SummaryCard
              label="Completed"
              value={completedCount}
              bg="bg-emerald-50"
              color="text-emerald-700"
            />
          </View>

          <ScrollView className="shrink" keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#004D40" size="small" />
                <Text className="mt-3 text-xs font-medium text-muted">
                  Loading today’s orders…
                </Text>
              </View>
            ) : errorMessage ? (
              <View className="mx-4 my-3 items-center rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <OrdersIcon color="#D4A017" size={20} />
                </View>
                <Text className="text-center text-sm font-bold text-primary-dark">
                  Orders aren’t connected yet
                </Text>
                <Text className="mt-1 text-center text-xs leading-4 text-muted">
                  {errorMessage}
                </Text>
                {ordersEndpoint ? (
                  <Pressable
                    className="mt-3 rounded-full bg-primary px-4 py-1.5 active:bg-primary-dark"
                    onPress={() => setRetryCount(count => count + 1)}
                    accessibilityRole="button"
                  >
                    <Text className="text-xs font-semibold text-white">
                      Try again
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : orders.length === 0 ? (
              <View className="items-center px-6 py-10">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <OrdersIcon color="#94A3B8" size={22} />
                </View>
                <Text className="text-sm font-bold text-primary-dark">
                  No orders recorded today
                </Text>
                <Text className="mt-1 text-center text-xs text-muted">
                  Incoming gold & jewellery orders will appear here in real-time.
                </Text>
              </View>
            ) : (
              orders.slice(0, 8).map(order => (
                <Pressable
                  key={order.id}
                  className="border-b border-slate-100 px-4 py-3 active:bg-slate-50"
                  onPress={() => onSelectOrder(order)}
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="mr-2 rounded bg-primary/10 px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-primary">
                          #{order.id}
                        </Text>
                      </View>
                      <Text className="text-sm font-semibold text-slate-900">
                        {order.customerName}
                      </Text>
                    </View>
                    <StatusBadge status={order.status} />
                  </View>

                  <View className="mt-1.5 flex-row items-center justify-between">
                    <Text className="text-xs text-muted">
                      {formatOrderTime(order.time)}
                    </Text>
                    <Text className="text-xs font-bold text-primary-dark">
                      {formatAmount(order.total)}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Bottom Button */}
          <Pressable
            className="flex-row items-center justify-center border-t border-slate-200/80 bg-slate-50/70 px-4 py-3.5 active:bg-slate-100"
            onPress={onViewAllOrders}
            accessibilityRole="button"
          >
            <Text className="mr-1.5 text-xs font-bold text-primary">
              View All Orders
            </Text>
            <ChevronRightIcon color="#004D40" size={12} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SummaryCard({
  label,
  value,
  bg,
  color,
}: {
  label: string;
  value: number;
  bg: string;
  color: string;
}) {
  return (
    <View className={`flex-1 items-center rounded-xl border border-slate-200/60 p-2.5 ${bg}`}>
      <Text className={`text-base font-extrabold ${color}`}>{value}</Text>
      <Text className="mt-0.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: TodayOrder['status'] }) {
  const badgeConfig = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-800' },
    processing: { bg: 'bg-teal-100', text: 'text-teal-800' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    cancelled: { bg: 'bg-rose-100', text: 'text-rose-800' },
  }[status];

  return (
    <View className={`rounded-full px-2 py-0.5 ${badgeConfig.bg}`}>
      <Text className={`text-[10px] font-bold capitalize ${badgeConfig.text}`}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownContainer: {
    shadowColor: '#002F28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
});

export default NotificationDropdown;
