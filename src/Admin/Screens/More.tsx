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
        contentContainerClassName="px-4 pb-8 pt-5"
        showsVerticalScrollIndicator={false}
      >
  



        {/* Card: Add Category / All Categories */}
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
      </ScrollView>
    </View>
  );
}

export default More;
