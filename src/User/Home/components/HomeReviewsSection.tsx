import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import api from '../../../api';
import { resolveImageUrl } from '../homeUtils';
import type { HomeReview } from '../types';

function getInitials(name?: string) {
  return (name || 'Customer')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

function HomeReviewsSection({ refreshVersion }: { refreshVersion: number }) {
  const [reviews, setReviews] = useState<HomeReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    api
      .get('/reviews/public', {
        params: { limit: 20 },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!Array.isArray(data?.reviews)) {
          throw new TypeError('The reviews response must contain a reviews array.');
        }
        setReviews(data.reviews);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          console.error('Failed to load customer reviews:', error);
          setReviews([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [refreshVersion]);

  if (!isLoading && reviews.length === 0) return null;

  return (
    <View className="bg-[#fffdf8] py-5">
      <View className="px-4">
        <Text className="text-[9px] font-bold uppercase tracking-[2px] text-[#a67b2e]">
          Trusted by customers
        </Text>
        <Text className="mt-1 text-xl font-bold text-[#201a13]">
          What our customers say
        </Text>
        <View className="mb-4 mt-2 h-px w-20 bg-[#d9a441]" />

        {isLoading ? (
          <ActivityIndicator
            className="py-6"
            color="#004D40"
            accessibilityLabel="Loading customer reviews"
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pb-2"
          >
            {reviews.map(review => {
              const rating = Math.min(5, Math.max(0, Number(review.rating) || 0));
              const reviewImage = resolveImageUrl(review.review_image);

              return (
                <View
                  key={review.id}
                  className="w-[280px] rounded-2xl border border-[#d4a017]/20 bg-white p-4"
                >
                  <View className="flex-row items-center">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary">
                      <Text className="text-xs font-bold text-white">
                        {getInitials(review.user_name)}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-sm font-bold text-slate-800"
                        numberOfLines={1}
                      >
                        {review.user_name || 'Customer'}
                      </Text>
                      {review.product_name ? (
                        <Text
                          className="text-[10px] text-slate-400"
                          numberOfLines={1}
                        >
                          {review.product_name}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Text
                    className="mt-2 text-sm tracking-widest text-[#d9a441]"
                    accessibilityLabel={`${rating} out of 5 stars`}
                  >
                    {'★'.repeat(Math.round(rating))}
                    <Text className="text-slate-200">
                      {'★'.repeat(5 - Math.round(rating))}
                    </Text>
                  </Text>
                  <View className="my-3 h-px bg-[#eadfc8]" />
                  <Text className="text-xs leading-5 text-slate-600">
                    “{review.comment || 'Thank you for sharing your experience.'}”
                  </Text>

                  {reviewImage || review.admin_reply ? (
                    <View className="mt-3">
                      {reviewImage ? (
                        <Image
                          source={{ uri: reviewImage }}
                          className="mb-2 h-14 w-14 rounded-lg bg-[#f9f5ee]"
                          resizeMode="contain"
                          accessibilityLabel="Customer review image"
                        />
                      ) : null}
                      {review.admin_reply ? (
                        <View className="rounded-lg border-l-[3px] border-primary bg-[#004d40]/5 p-2.5">
                          <Text className="text-[10px] leading-4 text-slate-600">
                            <Text className="font-bold text-primary">Sri Golds: </Text>
                            {review.admin_reply}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export default HomeReviewsSection;
