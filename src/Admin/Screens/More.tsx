import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { AdminRoute } from '../Navigations/TopHeader';

type MoreProps = {
  onNavigate: (route: AdminRoute) => void;
};

function More({ onNavigate }: MoreProps) {
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {/* Card: Customers */}
        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('customers')}
          accessibilityRole="button"
          accessibilityLabel="Manage customers"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-3a4 4 0 0 1 0 8m2 3h4v-2a4 4 0 0 0-3-3.87"
                  stroke="#004D40"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Customers</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                View, search, add, edit and manage customer accounts.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('loanCustomers')}
          accessibilityRole="button"
          accessibilityLabel="Manage loan customers"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7v6m-3-3h6"
                  stroke="#047857"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Loan Customers</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                Manage borrower profiles, contact details, and KYC status.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('dealers')}
          accessibilityRole="button"
          accessibilityLabel="Manage dealers"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-3h4v3"
                  stroke="#B7791F"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Dealers</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                Manage jewellery suppliers, contact details, and account balances.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="m9 18 6-6-6-6" stroke="#64748B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </Pressable>

        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('stockDetails')}
          accessibilityRole="button"
          accessibilityLabel="Manage product stock"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
                  stroke="#004D40"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="m4.5 7.75 7.5 4.5 7.5-4.5M12 12.25V21m4-15.75-8 4.5"
                  stroke="#0284C7"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Stock Details</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                Check product availability, find low stock, and add inventory.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('enquiries')}
          accessibilityRole="button"
          accessibilityLabel="Manage customer enquiries"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-100 bg-fuchsia-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"
                  stroke="#86198F"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Gold Enquiries</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                Track customer requests, update follow-ups, and manage enquiry status.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('fundManagement')}
          accessibilityRole="button"
          accessibilityLabel="Open fund management"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 7.5h18v12H3v-12Zm0 0 2-3h14l2 3M7 12h4m-4 4h7m3-4h1"
                  stroke="#047857"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Fund Management</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                Track balances, collections, expenses, and fund transactions.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('homeSections')}
          accessibilityRole="button"
          accessibilityLabel="Manage home product sections"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 5h18M3 12h18M3 19h18M7 3v4m10 3v4m-7 3v4"
                  stroke="#004D40"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Home Product Sections</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                Choose which product sections appear on Home and change their order.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('reviews')}
          accessibilityRole="button"
          accessibilityLabel="Manage customer reviews"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="m12 3 2.8 5.67 6.26.91-4.53 4.42 1.07 6.24L12 17.29l-5.6 2.95 1.07-6.24-4.53-4.42 6.26-.91L12 3Z"
                  stroke="#D4A017"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Customer Reviews</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                Review customer feedback, moderate ratings, and reply to reviews.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        {/* Card: All Categories */}
        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('categories')}
          accessibilityRole="button"
          accessibilityLabel="Add Category, show all categories"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 6.5A2.5 2.5 0 0 1 6.5 4h3.586a2 2 0 0 1 1.414.586L13.086 6.172A2 2 0 0 0 14.5 6.75H17.5A2.5 2.5 0 0 1 20 9.25v8.25A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5V6.5Z"
                  stroke="#004D40"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M12 11v6m-3-3h6"
                  stroke="#D4A017"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-bold text-slate-900">All Categories</Text>
              </View>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                View all categories, manage subcategories, and create new product categories.
              </Text>
            </View>
          </View>

          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        {/* Card: Daily Gold Rates */}
        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('dailyGoldRates')}
          accessibilityRole="button"
          accessibilityLabel="Show today's gold and precious metal rates"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                  stroke="#004D40"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Daily Gold Rates</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                View today’s Gold, Silver, Platinum and Diamond rates.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        {/* Card: Metal Types */}
        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('metalTypes')}
          accessibilityRole="button"
          accessibilityLabel="Show all metal types"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 3h12l4 6-10 12L2 9l4-6Z"
                  stroke="#004D40"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M2 9h20M10 3l-2 6 4 12 4-12-2-6"
                  stroke="#D4A017"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-bold text-slate-900">Metal Types</Text>
                <View className="rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-amber-800">Purities</Text>
                </View>
              </View>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                View all configured metals and their purity options.
              </Text>
            </View>
          </View>

          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('reports')}
          accessibilityRole="button"
          accessibilityLabel="View reports"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 19V5m0 14h16M8 15l4-4 3 2 5-7"
                  stroke="#047857"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Reports</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                Review sales trends, customer totals, inventory and loan activity.
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>

        {/* Card: Receipt Settings */}
        <Pressable
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-xs active:bg-slate-50 active:scale-[0.99]"
          onPress={() => onNavigate('receipt')}
          accessibilityRole="button"
          accessibilityLabel="Configure receipt settings and print preview"
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"
                  stroke="#004D40"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M8 8h8M8 12h8M8 16h4"
                  stroke="#D4A017"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-bold text-slate-900">Receipt Settings</Text>
                <View className="rounded-md bg-teal-50 border border-teal-100 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-teal-800">Print</Text>
                </View>
              </View>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                Customize shop logo, address, GSTIN, and print layout for receipts.
              </Text>
            </View>
          </View>

          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100/70">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="m9 18 6-6-6-6"
                stroke="#64748B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default More;
