import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../api';
import { getProductImageUrl } from '../../utils/productImage';

type Props = {
  onBack: () => void;
};

type ReviewRecord = {
  id: string | number;
  user_name: string;
  rating: number;
  comment: string;
  status: string;
  created_at?: string;
  product_name?: string;
  product_id?: string | number;
  review_image?: string;
  admin_reply?: string;
};

type ReviewStats = {
  total_reviews: number;
  average_rating: number;
  pending_count: number;
};

type ReviewResponse = {
  reviews?: unknown;
  stats?: {
    total_reviews?: unknown;
    average_rating?: unknown;
    pending_count?: unknown;
  };
};

type StatusFilter = 'All' | 'Pending' | 'Published' | 'Flagged';
type RatingFilter = 1 | 2 | 3 | 4 | 5 | null;
type ActiveFilterMenu = 'status' | 'rating' | null;

type NewReview = {
  user_name: string;
  rating: number;
  comment: string;
  review_image: string | null;
};

const EMPTY_REVIEW: NewReview = {
  user_name: '',
  rating: 5,
  comment: '',
  review_image: null,
};

const EMPTY_STATS: ReviewStats = {
  total_reviews: 0,
  average_rating: 0,
  pending_count: 0,
};

const getErrorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

const getText = (value: unknown) => (typeof value === 'string' ? value : '');

const toCount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeReviews = (value: unknown): ReviewRecord[] => {
  if (!Array.isArray(value)) {
    throw new Error('The server returned an invalid review list.');
  }

  return value.flatMap(record => {
    if (typeof record !== 'object' || record === null) return [];
    const item = record as Record<string, unknown>;
    const id = item.id ?? item.review_id ?? item._id;
    const rating = Number(item.rating);
    if (
      (typeof id !== 'string' && typeof id !== 'number') ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return [];
    }

    return [{
      id,
      user_name: getText(item.user_name) || 'Customer',
      rating,
      comment: getText(item.comment),
      status: getText(item.status) || 'Pending',
      created_at: getText(item.created_at) || undefined,
      product_name: getText(item.product_name) || undefined,
      product_id:
        typeof item.product_id === 'string' || typeof item.product_id === 'number'
          ? item.product_id
          : undefined,
      review_image: getText(item.review_image) || undefined,
      admin_reply: getText(item.admin_reply) || undefined,
    }];
  });
};

function AllReview({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(null);
  const [activeFilterMenu, setActiveFilterMenu] = useState<ActiveFilterMenu>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busyReviewId, setBusyReviewId] = useState<ReviewRecord['id'] | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newReview, setNewReview] = useState<NewReview>(EMPTY_REVIEW);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const addButtonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(addButtonPulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(addButtonPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [addButtonPulse]);

  const fetchReviews = useCallback(async (refresh = false) => {
    setLoadError('');
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data } = await api.get<ReviewResponse>('/reviews/admin/all');
      if (!data || !Array.isArray(data.reviews)) {
        throw new Error('The server returned an invalid review response.');
      }

      setReviews(normalizeReviews(data.reviews));
      setStats({
        total_reviews: toCount(data.stats?.total_reviews),
        average_rating: toCount(data.stats?.average_rating),
        pending_count: toCount(data.stats?.pending_count),
      });
    } catch (error) {
      console.error('Error fetching customer reviews:', error);
      setLoadError(getErrorMessage(error, 'Could not load customer reviews.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const visibleReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter(review => {
      const matchesStatus = statusFilter === 'All' || review.status === statusFilter;
      const matchesRating = ratingFilter === null || review.rating === ratingFilter;
      const searchableText = [
        review.user_name,
        review.product_name || '',
        review.comment,
      ]
        .join(' ')
        .toLowerCase();
      return matchesStatus && matchesRating && (!query || searchableText.includes(query));
    });
  }, [ratingFilter, reviews, search, statusFilter]);

  const updateStatus = async (id: ReviewRecord['id'], status: 'Published' | 'Flagged') => {
    if (busyReviewId !== null) return;
    setBusyReviewId(id);
    try {
      await api.put(`/reviews/admin/${id}/status`, { status });
      await fetchReviews(true);
    } catch (error) {
      Alert.alert('Update failed', getErrorMessage(error, 'Could not update review status.'));
    } finally {
      setBusyReviewId(null);
    }
  };

  const deleteReview = (review: ReviewRecord) => {
    Alert.alert('Delete review?', 'This review will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteReviewConfirmed(review);
        },
      },
    ]);
  };

  const deleteReviewConfirmed = async (review: ReviewRecord) => {
    if (busyReviewId !== null) return;
    setBusyReviewId(review.id);
    try {
      await api.delete(`/reviews/admin/${review.id}`);
      await fetchReviews(true);
    } catch (error) {
      Alert.alert('Delete failed', getErrorMessage(error, 'Could not delete the review.'));
    } finally {
      setBusyReviewId(null);
    }
  };

  const sendReply = async (id: ReviewRecord['id'], reply: string) => {
    if (busyReviewId !== null) return false;
    setBusyReviewId(id);
    try {
      await api.put(`/reviews/admin/${id}/reply`, { admin_reply: reply });
      await fetchReviews(true);
      return true;
    } catch (error) {
      Alert.alert('Reply failed', getErrorMessage(error, 'Could not send your reply.'));
      return false;
    } finally {
      setBusyReviewId(null);
    }
  };

  const uploadReviewImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });
      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) {
        Alert.alert('Image selection failed', 'The selected image could not be opened.');
        return;
      }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Image too large', 'Review images must be 5 MB or smaller.');
        return;
      }

      const body = new FormData();
      body.append('image', {
        uri: asset.uri,
        name: asset.fileName || `review-${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      } as unknown as Blob);

      setIsUploadingImage(true);
      const { data } = await api.post<{ url?: unknown }>('/reviews/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (typeof data?.url !== 'string' || !data.url) {
        throw new Error('The server did not return an uploaded image URL.');
      }
      const imageUrl = data.url;
      setNewReview(current => ({ ...current, review_image: imageUrl }));
    } catch (error) {
      console.error('Review image upload failed:', error);
      Alert.alert('Upload failed', getErrorMessage(error, 'Could not upload the review image.'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const submitNewReview = async () => {
    if (!newReview.user_name.trim() || !newReview.comment.trim()) {
      Alert.alert('Required fields', 'Enter the customer name and review comment.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reviews', {
        ...newReview,
        user_name: newReview.user_name.trim(),
        comment: newReview.comment.trim(),
      });
      setIsAddModalVisible(false);
      setNewReview(EMPTY_REVIEW);
      await fetchReviews(true);
    } catch (error) {
      console.error('Failed to create review:', error);
      Alert.alert('Create failed', getErrorMessage(error, 'Could not create the review.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: StatusFilter[] = ['All', 'Pending', 'Published', 'Flagged'];
  const newReviewImageUrl = newReview.review_image
    ? getProductImageUrl({ image: newReview.review_image })
    : undefined;

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" />
      <View className="h-16 flex-row items-center border-b border-[#00382E] bg-primary px-4">
        <Pressable
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to More"
        >
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-extrabold tracking-wide text-white">
            Customer Reviews
          </Text>
          <Text className="text-[10px] font-medium text-emerald-200">
            Moderate feedback and reply to customers
          </Text>
        </View>
      </View>

      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-24 pt-4"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchReviews(true)}
              tintColor="#004D40"
            />
          }
        >
          <View className="mb-4 flex-row gap-2">
            <StatCard label="Total" value={stats.total_reviews.toLocaleString('en-IN')} />
            <StatCard label="Average" value={`${stats.average_rating.toFixed(1)} ★`} />
            <StatCard label="Pending" value={stats.pending_count.toLocaleString('en-IN')} />
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search reviews, products or customers"
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search reviews"
            className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
          />

          <View className="mb-4 flex-row gap-3">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onPress={() => setActiveFilterMenu('status')}
            />
            <FilterSelect
              label="Rating"
              value={ratingFilter === null ? 'All ratings' : `${ratingFilter} Stars`}
              onPress={() => setActiveFilterMenu('rating')}
            />
          </View>

          {isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#004D40" />
              <Text className="mt-3 text-sm text-slate-500">Loading reviews…</Text>
            </View>
          ) : loadError ? (
            <View className="items-center rounded-2xl border border-rose-100 bg-white px-5 py-8">
              <Text className="text-center text-sm font-semibold text-rose-700">{loadError}</Text>
              <Pressable
                onPress={() => fetchReviews()}
                className="mt-4 rounded-lg bg-primary px-4 py-2"
                accessibilityRole="button"
              >
                <Text className="text-xs font-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : visibleReviews.length === 0 ? (
            <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10">
              <Text className="text-base font-bold text-slate-800">No reviews found</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                Try changing your search or filters.
              </Text>
            </View>
          ) : (
            visibleReviews.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                isBusy={busyReviewId === review.id || busyReviewId !== null}
                onChangeStatus={updateStatus}
                onDelete={deleteReview}
                onReply={sendReply}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <View className="absolute bottom-5 right-5 items-end">
        <View className="h-14 w-14 items-center justify-center">
          <Animated.View
            pointerEvents="none"
            className="absolute h-14 w-14 rounded-full bg-accent"
            style={{
              opacity: addButtonPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 0],
              }),
              transform: [
                {
                  scale: addButtonPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.22],
                  }),
                },
              ],
            }}
          />
          <Pressable
            onPress={() => setIsAddModalVisible(true)}
            className="h-14 w-14 items-center justify-center rounded-full border-2 border-accent-light bg-primary shadow-lg"
            accessibilityRole="button"
            accessibilityLabel="Add manual review"
          >
            <Text className="text-2xl font-bold text-white">+</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="max-h-[90%] rounded-t-3xl bg-white px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-slate-900">Add manual review</Text>
                <Text className="mt-1 text-xs text-slate-500">Enter customer feedback</Text>
              </View>
              <Pressable
                onPress={() => setIsAddModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close add review form"
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <Text className="text-lg font-bold text-slate-600">×</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-1 text-xs font-bold text-slate-600">Customer name *</Text>
              <TextInput
                value={newReview.user_name}
                onChangeText={value => setNewReview(current => ({ ...current, user_name: value }))}
                placeholder="Customer name"
                placeholderTextColor="#94A3B8"
                accessibilityLabel="Customer name"
                className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800"
              />

              <Text className="mb-2 text-xs font-bold text-slate-600">Rating</Text>
              <View className="mb-4 flex-row items-center gap-1">
                {[1, 2, 3, 4, 5].map(rating => (
                  <Pressable
                    key={rating}
                    onPress={() => setNewReview(current => ({ ...current, rating }))}
                    accessibilityRole="button"
                    accessibilityLabel={`${rating} star rating`}
                    accessibilityState={{ selected: newReview.rating === rating }}
                    className="p-1"
                  >
                    <Text className={`text-3xl ${rating <= newReview.rating ? 'text-amber-500' : 'text-slate-300'}`}>
                      ★
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="mb-1 text-xs font-bold text-slate-600">Review comment *</Text>
              <TextInput
                value={newReview.comment}
                onChangeText={value => setNewReview(current => ({ ...current, comment: value }))}
                placeholder="Write the customer's feedback"
                placeholderTextColor="#94A3B8"
                accessibilityLabel="Review comment"
                multiline
                textAlignVertical="top"
                className="mb-4 min-h-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800"
              />

              <Text className="mb-2 text-xs font-bold text-slate-600">Photo (optional)</Text>
              <Pressable
                disabled={isUploadingImage}
                onPress={() => uploadReviewImage()}
                accessibilityRole="button"
                className="mb-5 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 disabled:opacity-50"
              >
                {newReviewImageUrl ? (
                  <Image
                    source={{ uri: newReviewImageUrl }}
                    accessibilityLabel="Selected review photo"
                    className="h-32 w-full rounded-lg"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-sm font-semibold text-slate-600">
                    {isUploadingImage ? 'Uploading…' : 'Choose photo (max 5 MB)'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                disabled={isSubmitting || isUploadingImage}
                onPress={() => submitNewReview()}
                accessibilityRole="button"
                className="items-center rounded-xl bg-primary px-4 py-3 disabled:opacity-50"
              >
                <Text className="text-sm font-bold text-white">
                  {isSubmitting ? 'Creating…' : 'Create review'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeFilterMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveFilterMenu(null)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setActiveFilterMenu(null)}
          accessibilityRole="button"
          accessibilityLabel="Close filter options"
        >
          <View
            className="rounded-t-3xl bg-white px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Text className="mb-3 text-lg font-extrabold text-slate-900">
              {activeFilterMenu === 'status' ? 'Review status' : 'Review rating'}
            </Text>
            {activeFilterMenu === 'status'
              ? statusOptions.map(status => (
                  <Pressable
                    key={status}
                    onPress={() => {
                      setStatusFilter(status);
                      setActiveFilterMenu(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: statusFilter === status }}
                    className={`mb-2 rounded-xl px-4 py-3 ${
                      statusFilter === status ? 'bg-emerald-50' : 'bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        statusFilter === status ? 'text-primary' : 'text-slate-700'
                      }`}
                    >
                      {status}
                    </Text>
                  </Pressable>
                ))
              : [
                  { label: 'All ratings', value: null },
                  ...[5, 4, 3, 2, 1].map(rating => ({
                    label: `${rating} Stars`,
                    value: rating as Exclude<RatingFilter, null>,
                  })),
                ].map(option => (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      setRatingFilter(option.value);
                      setActiveFilterMenu(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ratingFilter === option.value }}
                    className={`mb-2 rounded-xl px-4 py-3 ${
                      ratingFilter === option.value ? 'bg-emerald-50' : 'bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        ratingFilter === option.value ? 'text-primary' : 'text-slate-700'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ReviewCard({
  review,
  isBusy,
  onChangeStatus,
  onDelete,
  onReply,
}: {
  review: ReviewRecord;
  isBusy: boolean;
  onChangeStatus: (id: ReviewRecord['id'], status: 'Published' | 'Flagged') => void;
  onDelete: (review: ReviewRecord) => void;
  onReply: (id: ReviewRecord['id'], reply: string) => Promise<boolean>;
}) {
  const [reply, setReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const imageUrl = review.review_image
    ? getProductImageUrl({ image: review.review_image })
    : undefined;
  const date = review.created_at ? new Date(review.created_at) : null;
  const dateLabel =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Date unavailable';
  const statusClassName =
    review.status.toLowerCase() === 'published'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : review.status.toLowerCase() === 'flagged'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : 'border-amber-200 bg-amber-50 text-amber-800';

  const sendReply = async () => {
    const message = reply.trim();
    if (!message || isSendingReply) return;
    setIsSendingReply(true);
    try {
      if (await onReply(review.id, message)) setReply('');
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            {review.user_name}
          </Text>
          <Text className="mt-1 text-xs text-slate-500">{dateLabel}</Text>
        </View>
        <View className={`rounded-full border px-2.5 py-1 ${statusClassName}`}>
          <Text className="text-[10px] font-bold uppercase">{review.status}</Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center">
        <Text className="text-sm font-bold text-amber-600">{'★'.repeat(review.rating)}</Text>
        <Text className="text-sm text-slate-300">{'★'.repeat(5 - review.rating)}</Text>
        <Text className="ml-2 text-xs font-semibold text-slate-500">
          {review.rating} / 5
        </Text>
      </View>

      <Text className="mt-3 text-sm leading-5 text-slate-700">{review.comment}</Text>

      <View className="mt-3 flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
        <View className="flex-1 pr-2">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Product
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-slate-700" numberOfLines={1}>
            {review.product_name || 'Product deleted'}
          </Text>
        </View>
        {review.product_id !== undefined ? (
          <Text className="text-[10px] text-slate-400">ID: {review.product_id}</Text>
        ) : null}
      </View>

      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel="Customer review photo"
          className="mt-3 h-44 w-full rounded-xl bg-slate-100"
          resizeMode="cover"
        />
      ) : null}

      {review.admin_reply ? (
        <View className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            Official reply
          </Text>
          <Text className="mt-1 text-xs leading-5 text-slate-700">{review.admin_reply}</Text>
        </View>
      ) : null}

      <View className="mt-4 flex-row flex-wrap gap-2">
        {review.status.toLowerCase() !== 'published' ? (
          <Pressable
            disabled={isBusy}
            onPress={() => onChangeStatus(review.id, 'Published')}
            accessibilityRole="button"
            className="rounded-lg bg-primary px-3 py-2 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-xs font-bold text-white">Approve</Text>
          </Pressable>
        ) : null}
        {review.status.toLowerCase() !== 'flagged' ? (
          <Pressable
            disabled={isBusy}
            onPress={() => onChangeStatus(review.id, 'Flagged')}
            accessibilityRole="button"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-xs font-bold text-rose-800">Flag</Text>
          </Pressable>
        ) : null}
        <Pressable
          disabled={isBusy}
          onPress={() => onDelete(review)}
          accessibilityRole="button"
          className="rounded-lg border border-slate-200 px-3 py-2 active:bg-slate-50 disabled:opacity-50"
        >
          <Text className="text-xs font-bold text-slate-700">Delete</Text>
        </Pressable>
      </View>

      <View className="mt-3">
        <TextInput
          value={reply}
          onChangeText={setReply}
          placeholder="Write an official reply..."
          placeholderTextColor="#94A3B8"
          accessibilityLabel={`Reply to ${review.user_name}`}
          editable={!isBusy && !isSendingReply}
          multiline
          className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
        />
        <Pressable
          disabled={isBusy || isSendingReply || !reply.trim()}
          onPress={() => sendReply()}
          accessibilityRole="button"
          className="mt-2 self-end rounded-lg bg-primary px-4 py-2 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-xs font-bold text-white">
            {isSendingReply ? 'Sending…' : 'Send reply'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </Text>
      <Text className="mt-1 text-lg font-extrabold text-primary">{value}</Text>
    </View>
  );
}

function FilterSelect({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      className="min-w-0 flex-1 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3"
    >
      <View className="min-w-0 flex-1">
        <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </Text>
        <Text className="mt-0.5 text-sm font-bold text-slate-800" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text className="ml-2 text-xs font-bold text-slate-500">
        ▼
      </Text>
    </Pressable>
  );
}

export default AllReview;