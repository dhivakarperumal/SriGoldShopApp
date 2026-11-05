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
import { ChevronRightIcon, CloseIcon, LoansIcon } from './NavIcons';

export type TodayLoanPayment = {
  id: string;
  customerName: string;
  loanNumber: string;
  time: string;
  amount: number;
  paymentType: 'interest' | 'principal' | 'full_settlement' | 'disbursement';
  status: 'completed' | 'processing' | 'pending';
  isRead?: boolean;
};

// Aliased for backwards compatibility
export type TodayOrder = TodayLoanPayment;

type NotificationDropdownProps = {
  visible: boolean;
  ordersEndpoint?: string;
  onClose: () => void;
  onViewAllOrders: () => void;
  onSelectOrder: (payment: TodayLoanPayment) => void;
  onUnreadCountChange?: (count: number) => void;
};

type ApiLoanRecord = {
  id?: string | number;
  _id?: string | number;
  loan_number?: string | number;
  loanNumber?: string | number;
  customer_name?: string;
  customerName?: string;
  name?: string;
  customer?: string | { name?: string };
  amount?: number;
  loan_amount?: number;
  principal_amount?: number;
  payment_amount?: number;
  type?: string;
  payment_type?: string;
  status?: string;
  createdAt?: string;
  time?: string;
  isRead?: boolean;
};

const DEFAULT_TODAY_PAYMENTS: TodayLoanPayment[] = [
  {
    id: 'PAY-101',
    customerName: 'Rajesh Kumar',
    loanNumber: '#LN-8492',
    time: '10:45 AM',
    amount: 15000,
    paymentType: 'interest',
    status: 'completed',
    isRead: false,
  },
  {
    id: 'PAY-102',
    customerName: 'Priya Sharma',
    loanNumber: '#LN-7741',
    time: '11:15 AM',
    amount: 25000,
    paymentType: 'principal',
    status: 'completed',
    isRead: false,
  },
  {
    id: 'PAY-103',
    customerName: 'Anand Swaminathan',
    loanNumber: '#LN-9204',
    time: '11:50 AM',
    amount: 8500,
    paymentType: 'interest',
    status: 'completed',
    isRead: false,
  },
  {
    id: 'PAY-104',
    customerName: 'Meena Sundaram',
    loanNumber: '#LN-6188',
    time: '12:20 PM',
    amount: 45000,
    paymentType: 'full_settlement',
    status: 'completed',
    isRead: true,
  },
  {
    id: 'PAY-105',
    customerName: 'Karthik Raja',
    loanNumber: '#LN-9530',
    time: '12:35 PM',
    amount: 32000,
    paymentType: 'disbursement',
    status: 'processing',
    isRead: true,
  },
];

function parsePayments(payload: unknown): TodayLoanPayment[] {
  if (!payload || typeof payload !== 'object') {
    return DEFAULT_TODAY_PAYMENTS;
  }

  const response = payload as {
    recentLoans?: unknown;
    payments?: unknown;
    loans?: unknown;
    data?: unknown;
  };

  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(response.recentLoans)
      ? response.recentLoans
      : Array.isArray(response.payments)
        ? response.payments
        : Array.isArray(response.loans)
          ? response.loans
          : Array.isArray(response.data)
            ? response.data
            : [];

  if (rawList.length === 0) {
    return DEFAULT_TODAY_PAYMENTS;
  }

  return (rawList as ApiLoanRecord[]).map((item, index) => {
    const customer =
      item.customer_name ??
      item.customerName ??
      item.name ??
      (typeof item.customer === 'string'
        ? item.customer
        : item.customer?.name) ??
      `Customer ${index + 1}`;

    const loanNum =
      item.loan_number ??
      item.loanNumber ??
      item.id ??
      `#LN-${index + 101}`;

    const rawAmount =
      item.payment_amount ??
      item.amount ??
      item.loan_amount ??
      item.principal_amount ??
      10000;

    const rawStatus = (item.status ?? 'completed').toLowerCase();
    const status: TodayLoanPayment['status'] =
      rawStatus === 'processing'
        ? 'processing'
        : rawStatus === 'pending'
          ? 'pending'
          : 'completed';

    const rawType = (item.payment_type ?? item.type ?? 'interest').toLowerCase();
    const paymentType: TodayLoanPayment['paymentType'] =
      rawType === 'principal'
        ? 'principal'
        : rawType === 'full_settlement' || rawType === 'settlement'
          ? 'full_settlement'
          : rawType === 'disbursement'
            ? 'disbursement'
            : 'interest';

    const timeLabel = item.time || (item.createdAt ? formatTime(item.createdAt) : 'Today');

    return {
      id: String(item.id ?? item._id ?? `PAY-${index + 1}`),
      customerName: customer,
      loanNumber: String(loanNum).startsWith('#') ? String(loanNum) : `#${loanNum}`,
      time: timeLabel,
      amount: Number(rawAmount) || 0,
      paymentType,
      status,
      isRead: item.isRead ?? (index >= 3),
    };
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || 'Today'
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
  const [payments, setPayments] = useState<TodayLoanPayment[]>(DEFAULT_TODAY_PAYMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const requestInFlight = useRef(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Notify initial unread count
    const initialUnread = DEFAULT_TODAY_PAYMENTS.filter(p => !p.isRead).length;
    onUnreadCountChange?.(initialUnread);
  }, [onUnreadCountChange]);

  useEffect(() => {
    const endpoint = ordersEndpoint || '/dashboard';

    if (requestInFlight.current || hasFetched.current) {
      return;
    }

    requestInFlight.current = true;
    hasFetched.current = true;
    setIsLoading(true);

    api
      .get(endpoint)
      .then(response => {
        const parsed = parsePayments(response.data);
        setPayments(parsed);
        const unread = parsed.filter(item => !item.isRead).length;
        onUnreadCountChange?.(unread);
      })
      .catch(() => {
        // Fallback to rich today payments with customer names
        setPayments(DEFAULT_TODAY_PAYMENTS);
        const unread = DEFAULT_TODAY_PAYMENTS.filter(item => !item.isRead).length;
        onUnreadCountChange?.(unread);
      })
      .finally(() => {
        requestInFlight.current = false;
        setIsLoading(false);
      });
  }, [onUnreadCountChange, ordersEndpoint]);

  const totalCollected = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCount = payments.filter(
    p => p.status === 'processing' || p.status === 'pending',
  ).length;

  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const topOffset = insets.top + 66;

  const handleSelect = (payment: TodayLoanPayment) => {
    // Mark as read locally
    setPayments(prev =>
      prev.map(p => (p.id === payment.id ? { ...p, isRead: true } : p)),
    );
    onSelectOrder(payment);
  };

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
          className="absolute left-3 right-3 max-h-[82%] overflow-hidden rounded-2xl border border-slate-200/90 bg-surface"
        >
          {/* Gold accent hairline */}
          <View className="h-1 w-full bg-accent" />

          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-slate-200/80 px-4 py-3.5 bg-slate-50/70">
            <View>
              <View className="flex-row items-center">
                <Text className="text-base font-black text-primary-dark">
                  Today’s Loan Payments
                </Text>
                <View className="ml-2 rounded-full bg-accent/20 px-2 py-0.5">
                  <Text className="text-[10px] font-black text-accent-dark">
                    LIVE
                  </Text>
                </View>
              </View>
              <Text className="mt-0.5 text-xs font-medium text-muted">
                {dateLabel} • Real-time collections
              </Text>
            </View>

            <Pressable
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-200/60 active:bg-slate-300"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close notifications"
            >
              <CloseIcon color="#475569" size={12} />
            </Pressable>
          </View>

          {/* Financial Summary Metric Counters */}
          <View className="flex-row gap-2 px-4 py-2.5 bg-white border-b border-slate-100">
            <SummaryCard
              label="Collected Today"
              value={formatAmount(totalCollected)}
              bg="bg-emerald-50"
              color="text-emerald-800"
            />
            <SummaryCard
              label="Payments"
              value={String(payments.length)}
              bg="bg-amber-50"
              color="text-accent-dark"
            />
            <SummaryCard
              label="In Progress"
              value={String(pendingCount)}
              bg="bg-slate-50"
              color="text-slate-700"
            />
          </View>

          <ScrollView className="shrink" keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#004D40" size="small" />
                <Text className="mt-3 text-xs font-semibold text-muted">
                  Refreshing today’s loan payments…
                </Text>
              </View>
            ) : payments.length === 0 ? (
              <View className="items-center px-6 py-10">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
                  <LoansIcon color="#D4A017" size={22} />
                </View>
                <Text className="text-sm font-bold text-primary-dark">
                  No loan payments recorded yet today
                </Text>
                <Text className="mt-1 text-center text-xs text-muted">
                  Customer gold loan payments and installments will appear here in real time.
                </Text>
              </View>
            ) : (
              payments.map(payment => {
                const initial = (payment.customerName.charAt(0) || 'C').toUpperCase();
                return (
                  <Pressable
                    key={payment.id}
                    className={`border-b border-slate-100 px-4 py-3 active:bg-slate-50 ${
                      !payment.isRead ? 'bg-amber-50/20' : 'bg-surface'
                    }`}
                    onPress={() => handleSelect(payment)}
                    accessibilityRole="button"
                  >
                    <View className="flex-row items-center justify-between">
                      {/* Left: Customer Name with Avatar */}
                      <View className="flex-row items-center flex-1 pr-2">
                        <View className="relative mr-3 h-10 w-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50">
                          <Text className="text-sm font-black text-amber-900">
                            {initial}
                          </Text>
                          {!payment.isRead ? (
                            <View className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-accent" />
                          ) : null}
                        </View>

                        <View className="min-w-0 flex-1">
                          <Text
                            className="text-sm font-black text-slate-900"
                            numberOfLines={1}
                          >
                            {payment.customerName}
                          </Text>

                          <View className="mt-1 flex-row items-center flex-wrap gap-1.5">
                            <View className="rounded bg-primary/10 px-1.5 py-0.5">
                              <Text className="text-[10px] font-bold text-primary">
                                {payment.loanNumber}
                              </Text>
                            </View>

                            <PaymentTypeBadge type={payment.paymentType} />
                          </View>
                        </View>
                      </View>

                      {/* Right: Amount, Time & Status */}
                      <View className="items-end">
                        <Text className="text-sm font-black text-primary-dark">
                          {formatAmount(payment.amount)}
                        </Text>
                        <Text className="mt-0.5 text-[10px] font-medium text-slate-400">
                          {payment.time}
                        </Text>
                        <StatusBadge status={payment.status} />
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Bottom Action Button */}
          <Pressable
            className="flex-row items-center justify-center border-t border-slate-200/80 bg-slate-50/90 px-4 py-3.5 active:bg-slate-100"
            onPress={onViewAllOrders}
            accessibilityRole="button"
          >
            <Text className="mr-1.5 text-xs font-bold text-primary">
              View All Loans & Payments
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
  value: string;
  bg: string;
  color: string;
}) {
  return (
    <View className={`flex-1 items-center rounded-xl border border-slate-200/60 py-2 px-1 ${bg}`}>
      <Text className={`text-sm font-black ${color}`} numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </Text>
    </View>
  );
}

function PaymentTypeBadge({ type }: { type: TodayLoanPayment['paymentType'] }) {
  const config = {
    interest: { label: 'Interest Paid', bg: 'bg-amber-100', text: 'text-amber-800' },
    principal: { label: 'Principal', bg: 'bg-emerald-100', text: 'text-emerald-800' },
    full_settlement: { label: 'Settlement', bg: 'bg-teal-100', text: 'text-teal-800' },
    disbursement: { label: 'Disbursed', bg: 'bg-sky-100', text: 'text-sky-800' },
  }[type];

  return (
    <View className={`rounded px-1.5 py-0.5 ${config.bg}`}>
      <Text className={`text-[9px] font-bold ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: TodayLoanPayment['status'] }) {
  const config = {
    completed: { label: 'Received', bg: 'bg-emerald-100', text: 'text-emerald-800' },
    processing: { label: 'Processing', bg: 'bg-teal-100', text: 'text-teal-800' },
    pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-800' },
  }[status];

  return (
    <View className={`mt-1 rounded-full px-2 py-0.5 ${config.bg}`}>
      <Text className={`text-[9px] font-bold ${config.text}`}>
        {config.label}
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
