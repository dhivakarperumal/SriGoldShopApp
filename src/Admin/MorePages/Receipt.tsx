import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';

export type ReceiptSettingsData = {
  shopName: string;
  logoUrl: string;
  address: string;
  gstNumber: string;
  phone: string;
  email: string;
  footerMessage: string;
};

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettingsData = {
  shopName: 'Sri Golds',
  logoUrl: '/images/logo.png',
  address: 'Tirupattur – Singarapet Road, Tirupattur, Tirupathur, Tirupattur, Tamil Nadu, 635600, India',
  gstNumber: '',
  phone: '',
  email: '',
  footerMessage: 'Thank you for choosing us. We value your trust and look forward to serving you again.',
};

type Props = {
  onBack: () => void;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error !== 'object' || error === null) return fallback;
  if ('message' in error && typeof error.message === 'string') return error.message;
  return fallback;
};

function Receipt({ onBack }: Props) {
  const [settings, setSettings] = useState<ReceiptSettingsData>({ ...DEFAULT_RECEIPT_SETTINGS });
  const [draftSettings, setDraftSettings] = useState<ReceiptSettingsData>({ ...DEFAULT_RECEIPT_SETTINGS });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const addButtonPulse = useRef(new Animated.Value(0)).current;

  const previewDate = useMemo(() => new Date().toLocaleDateString('en-IN'), []);
  const previewInvoiceNumber = useMemo(() => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BILL-${dateStr}-${randStr}`;
  }, []);

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

  const fetchSettings = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await api.get('/receipt-settings');
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        const loaded: ReceiptSettingsData = {
          shopName: response.data.shopName ?? DEFAULT_RECEIPT_SETTINGS.shopName,
          logoUrl: response.data.logoUrl ?? DEFAULT_RECEIPT_SETTINGS.logoUrl,
          address: response.data.address ?? DEFAULT_RECEIPT_SETTINGS.address,
          gstNumber: response.data.gstNumber ?? DEFAULT_RECEIPT_SETTINGS.gstNumber,
          phone: response.data.phone ?? DEFAULT_RECEIPT_SETTINGS.phone,
          email: response.data.email ?? DEFAULT_RECEIPT_SETTINGS.email,
          footerMessage: response.data.footerMessage ?? DEFAULT_RECEIPT_SETTINGS.footerMessage,
        };
        setSettings(loaded);
        setDraftSettings(loaded);
      }
    } catch (error) {
      console.error('Error fetching receipt settings:', error);
      // Fallback to defaults gracefully
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateDraft = (key: keyof ReceiptSettingsData, value: string) => {
    setDraftSettings(current => ({ ...current, [key]: value }));
  };

  const uploadLogo = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 1024 * 1024) {
        Alert.alert('Logo too large', 'Logo image must be 1 MB or smaller.');
        return;
      }

      if (asset.base64) {
        const mimeType = asset.type || 'image/png';
        const dataUri = `data:${mimeType};base64,${asset.base64}`;
        updateDraft('logoUrl', dataUri);
      } else if (asset.uri) {
        updateDraft('logoUrl', asset.uri);
      }
    } catch (error) {
      console.error('Failed to select receipt logo:', error);
      Alert.alert('Selection failed', 'Could not select logo image.');
    }
  };

  const removeLogo = () => {
    updateDraft('logoUrl', '');
  };

  const saveSettings = async (targetSettings?: ReceiptSettingsData) => {
    const toSave = targetSettings || draftSettings;
    if (!toSave.shopName.trim()) {
      Alert.alert('Shop name required', 'Please enter a shop name.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: ReceiptSettingsData = {
        shopName: toSave.shopName.trim(),
        logoUrl: toSave.logoUrl.trim(),
        address: toSave.address.trim(),
        gstNumber: toSave.gstNumber.trim(),
        phone: toSave.phone.trim(),
        email: toSave.email.trim(),
        footerMessage: toSave.footerMessage.trim(),
      };

      const response = await api.put('/receipt-settings', payload);
      const saved: ReceiptSettingsData = {
        ...DEFAULT_RECEIPT_SETTINGS,
        ...(response.data || payload),
      };

      setSettings(saved);
      setDraftSettings(saved);
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Receipt settings saved successfully.');
    } catch (error) {
      console.error('Failed to save receipt settings:', error);
      Alert.alert('Save failed', getErrorMessage(error, 'Could not save receipt settings.'));
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Restore Defaults?',
      'This will reset receipt settings back to default Sri Golds configuration.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            saveSettings(DEFAULT_RECEIPT_SETTINGS);
          },
        },
      ],
    );
  };

  const openEditModal = () => {
    setDraftSettings({ ...settings });
    setIsEditModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View className="h-16 flex-row items-center justify-between border-b border-[#00382E] bg-primary px-4">
        <View className="flex-1 flex-row items-center pr-3">
          <Pressable
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
            accessibilityRole="button"
            accessibilityLabel="Back to more options"
          >
            <ReceiptIcon name="back" color="#FFFFFF" size={18} />
          </Pressable>

          <View className="flex-1">
            <Text className="text-base font-extrabold tracking-wide text-white" numberOfLines={1}>
              Receipt Settings
            </Text>
            <Text className="text-[10px] font-medium text-emerald-200" numberOfLines={1}>
              Sri Golds · Print Preferences
            </Text>
          </View>
        </View>

        <Pressable
          onPress={openEditModal}
          className="flex-row items-center rounded-xl border border-accent/40 bg-accent/20 px-3 py-2 active:bg-accent/30"
          accessibilityRole="button"
          accessibilityLabel="Edit receipt settings"
        >
          <ReceiptIcon name="edit" color="#F5C45E" size={14} />
          <Text className="ml-1.5 text-xs font-bold text-accent-light">Edit</Text>
        </Pressable>
      </View>

      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        {/* Tab Switcher */}
        <View className="flex-row border-b border-slate-200 bg-surface px-4 py-2.5">
          <Pressable
            onPress={() => setActiveTab('preview')}
            className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
              activeTab === 'preview' ? 'bg-primary' : 'bg-transparent'
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'preview' }}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'preview' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Receipt Preview
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('settings')}
            className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
              activeTab === 'settings' ? 'bg-primary' : 'bg-transparent'
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'settings' }}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'settings' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Settings Form
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#004D40" />
            <Text className="mt-3 text-xs text-slate-500">Loading receipt preferences…</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pb-24 pt-4"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchSettings(true)}
                tintColor="#004D40"
              />
            }
          >
            {activeTab === 'preview' ? (
              /* LIVE RECEIPT PREVIEW */
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-black text-slate-900">Live Bill Preview</Text>
                    <Text className="text-xs text-slate-500">
                      Sample bill showing your configured header, contact & footer.
                    </Text>
                  </View>
                  <Pressable
                    onPress={openEditModal}
                    className="rounded-lg bg-primary/10 px-3 py-1.5 active:bg-primary/20"
                    accessibilityRole="button"
                  >
                    <Text className="text-xs font-bold text-primary">Modify</Text>
                  </Pressable>
                </View>

                {/* The Paper Bill Card */}
                <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {/* Shop Header */}
                  <View className="items-center pb-4 text-center border-b border-dashed border-slate-200">
                    {settings.logoUrl && (settings.logoUrl.startsWith('data:') || settings.logoUrl.startsWith('http')) ? (
                      <Image
                        source={{ uri: settings.logoUrl }}
                        className="h-16 w-28 mb-2"
                        resizeMode="contain"
                      />
                    ) : (
                      <View className="mb-2 h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 p-1.5 shadow-xs">
                        <Image
                          source={require('../../Images/logo.png')}
                          className="h-10 w-10"
                          resizeMode="contain"
                        />
                      </View>
                    )}

                    <Text className="text-xl font-black text-primary">
                      {settings.shopName || 'Sri Golds'}
                    </Text>
                    <Text className="text-[10px] font-extrabold tracking-widest text-accent-dark uppercase">
                      JEWELLERS
                    </Text>

                    {settings.address ? (
                      <Text className="mt-2 text-center text-[11px] leading-4 text-slate-600 px-4">
                        {settings.address}
                      </Text>
                    ) : null}

                    {settings.gstNumber ? (
                      <Text className="mt-1 text-center text-[11px] font-semibold text-slate-700">
                        GSTIN: <Text className="font-bold text-slate-900">{settings.gstNumber}</Text>
                      </Text>
                    ) : null}

                    <View className="mt-1 flex-row flex-wrap justify-center gap-x-3 gap-y-0.5">
                      {settings.phone ? (
                        <Text className="text-[11px] text-slate-600">Ph: {settings.phone}</Text>
                      ) : null}
                      {settings.email ? (
                        <Text className="text-[11px] text-slate-600">Email: {settings.email}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Invoice & Date Bar */}
                  <View className="flex-row items-center justify-between border-b border-dashed border-slate-200 py-3">
                    <View>
                      <Text className="text-[10px] font-bold text-slate-400 uppercase">Invoice No</Text>
                      <Text className="text-xs font-black text-slate-800">{previewInvoiceNumber}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase">Date</Text>
                      <Text className="text-xs font-bold text-slate-800">{previewDate}</Text>
                    </View>
                  </View>

                  {/* Customer Info */}
                  <View className="py-3 border-b border-dashed border-slate-200">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Customer Details</Text>
                    <Text className="mt-0.5 text-xs font-bold text-slate-800">Sample Customer</Text>
                    <Text className="text-[10px] text-slate-500">Contact & delivery address printed here</Text>
                  </View>

                  {/* Sample Items List */}
                  <View className="py-3 border-b border-dashed border-slate-200">
                    <Text className="mb-2 text-[10px] font-bold text-slate-400 uppercase">Items Summary</Text>

                    <View className="mb-2 rounded-xl bg-slate-50 p-2.5">
                      <View className="flex-row justify-between">
                        <Text className="text-xs font-bold text-slate-800">1. Gold Necklace</Text>
                        <Text className="text-xs font-bold text-slate-900">₹85,000.00</Text>
                      </View>
                      <Text className="text-[10px] text-slate-500 mt-0.5">
                        Necklace · 22K (916) · 10 g @ ₹8,250.00/g
                      </Text>
                      <Text className="text-[10px] text-emerald-700">Making Charge: ₹2,500.00</Text>
                    </View>

                    <View className="rounded-xl bg-rose-50/70 p-2.5 border border-rose-100">
                      <View className="flex-row justify-between">
                        <Text className="text-xs font-bold text-rose-800">2. Exchange Gold</Text>
                        <Text className="text-xs font-bold text-rose-700">−₹20,000.00</Text>
                      </View>
                      <Text className="text-[10px] text-rose-600 mt-0.5">
                        Old Gold · 22K · 10 g @ ₹2,000.00/g
                      </Text>
                    </View>
                  </View>

                  {/* Calculation Breakdown */}
                  <View className="py-3 border-b border-slate-200 gap-1.5">
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-slate-500">Sub-Total</Text>
                      <Text className="text-xs font-semibold text-slate-800">₹85,000.00</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-rose-600">Exchange Amount</Text>
                      <Text className="text-xs font-semibold text-rose-600">−₹20,000.00</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-slate-500">GST (3%)</Text>
                      <Text className="text-xs font-semibold text-slate-800">₹1,950.00</Text>
                    </View>
                    <View className="mt-1 flex-row justify-between border-t border-slate-200 pt-2">
                      <Text className="text-sm font-black text-slate-900">Grand Total</Text>
                      <Text className="text-sm font-black text-primary">₹66,950.00</Text>
                    </View>
                  </View>

                  {/* Footer Message */}
                  {settings.footerMessage ? (
                    <View className="pt-4 items-center">
                      <Text className="text-center text-[11px] italic leading-4 text-slate-600">
                        {settings.footerMessage}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : (
              /* SETTINGS FORM */
              <View className="gap-4">
                {/* Section 01: Shop Profile */}
                <View className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
                  <View className="flex-row items-center border-b border-border bg-primary/5 px-4 py-3">
                    <View className="mr-2.5 h-6 w-7 items-center justify-center rounded-md bg-primary">
                      <Text className="text-[10px] font-extrabold text-white">01</Text>
                    </View>
                    <Text className="text-sm font-extrabold text-primary-dark">Shop Profile</Text>
                  </View>

                  <View className="gap-3.5 p-4">
                    {/* Logo Section */}
                    <View>
                      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        Shop Logo
                      </Text>
                      <View className="flex-row items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                        {draftSettings.logoUrl && (draftSettings.logoUrl.startsWith('data:') || draftSettings.logoUrl.startsWith('http')) ? (
                          <Image
                            source={{ uri: draftSettings.logoUrl }}
                            className="h-16 w-20 rounded-lg bg-white border border-slate-200"
                            resizeMode="contain"
                          />
                        ) : (
                          <View className="h-16 w-20 items-center justify-center rounded-lg border border-slate-200 bg-white">
                            <ReceiptIcon name="image" color="#94A3B8" size={24} />
                          </View>
                        )}
                        <View className="flex-1 gap-2">
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={uploadLogo}
                              className="rounded-lg bg-primary px-3 py-1.5 active:bg-primary-dark"
                              accessibilityRole="button"
                            >
                              <Text className="text-xs font-bold text-white">Upload Logo</Text>
                            </Pressable>
                            {draftSettings.logoUrl ? (
                              <Pressable
                                onPress={removeLogo}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 active:bg-rose-100"
                                accessibilityRole="button"
                              >
                                <Text className="text-xs font-bold text-rose-700">Remove</Text>
                              </Pressable>
                            ) : null}
                          </View>
                          <Text className="text-[10px] text-slate-500 leading-3">
                            PNG, JPG, or WebP • Max 1 MB
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Shop Name */}
                    <View>
                      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        Shop Name <Text className="text-red-500">*</Text>
                      </Text>
                      <TextInput
                        value={draftSettings.shopName}
                        onChangeText={text => updateDraft('shopName', text)}
                        placeholder="Sri Golds"
                        placeholderTextColor="#94A3B8"
                        maxLength={120}
                        className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                        accessibilityLabel="Shop Name"
                      />
                    </View>

                    {/* GSTIN */}
                    <View>
                      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        GST Number
                      </Text>
                      <TextInput
                        value={draftSettings.gstNumber}
                        onChangeText={text => updateDraft('gstNumber', text)}
                        placeholder="Enter GSTIN"
                        placeholderTextColor="#94A3B8"
                        maxLength={50}
                        className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                        accessibilityLabel="GST Number"
                      />
                    </View>
                  </View>
                </View>

                {/* Section 02: Contact Details */}
                <View className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
                  <View className="flex-row items-center border-b border-border bg-primary/5 px-4 py-3">
                    <View className="mr-2.5 h-6 w-7 items-center justify-center rounded-md bg-primary">
                      <Text className="text-[10px] font-extrabold text-white">02</Text>
                    </View>
                    <Text className="text-sm font-extrabold text-primary-dark">Contact Information</Text>
                  </View>

                  <View className="gap-3.5 p-4">
                    {/* Contact Phone */}
                    <View>
                      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        Contact Phone
                      </Text>
                      <TextInput
                        value={draftSettings.phone}
                        onChangeText={text => updateDraft('phone', text)}
                        placeholder="e.g. +91 98765 43210"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                        accessibilityLabel="Contact Phone"
                      />
                    </View>

                    {/* Contact Email */}
                    <View>
                      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        Contact Email
                      </Text>
                      <TextInput
                        value={draftSettings.email}
                        onChangeText={text => updateDraft('email', text)}
                        placeholder="e.g. shop@srigolds.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                        accessibilityLabel="Contact Email"
                      />
                    </View>

                    {/* Address */}
                    <View>
                      <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        Shop Address
                      </Text>
                      <TextInput
                        value={draftSettings.address}
                        onChangeText={text => updateDraft('address', text)}
                        placeholder="Enter the full address printed on receipts…"
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        className="min-h-20 rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                        accessibilityLabel="Shop Address"
                      />
                    </View>
                  </View>
                </View>

                {/* Section 03: Footer Note */}
                <View className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
                  <View className="flex-row items-center border-b border-border bg-primary/5 px-4 py-3">
                    <View className="mr-2.5 h-6 w-7 items-center justify-center rounded-md bg-primary">
                      <Text className="text-[10px] font-extrabold text-white">03</Text>
                    </View>
                    <Text className="text-sm font-extrabold text-primary-dark">Receipt Footer</Text>
                  </View>

                  <View className="p-4">
                    <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Footer Message
                    </Text>
                    <TextInput
                      value={draftSettings.footerMessage}
                      onChangeText={text => updateDraft('footerMessage', text)}
                      placeholder="Thank you message or return policy printed at the bottom of bills…"
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      className="min-h-20 rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                      accessibilityLabel="Receipt Footer Message"
                    />
                  </View>
                </View>

                {/* Bottom Actions */}
                <View className="flex-row gap-3 pt-2">
                  <Pressable
                    onPress={resetToDefaults}
                    disabled={isSaving}
                    className="flex-1 items-center justify-center rounded-xl border border-border bg-slate-100 py-3.5 active:bg-slate-200"
                    accessibilityRole="button"
                  >
                    <Text className="text-xs font-bold text-slate-700">Restore Defaults</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => saveSettings()}
                    disabled={isSaving || !draftSettings.shopName.trim()}
                    className={`flex-[2] flex-row items-center justify-center rounded-xl bg-primary py-3.5 shadow-sm ${
                      isSaving || !draftSettings.shopName.trim() ? 'opacity-50' : 'active:opacity-90'
                    }`}
                    accessibilityRole="button"
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <ReceiptIcon name="check" color="#FFFFFF" size={16} />
                        <Text className="ml-2 text-sm font-bold text-white">Save Receipt Settings</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Floating Pulsing "+" Button to Add / Edit Receipt */}
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
              onPress={openEditModal}
              className="h-14 w-14 items-center justify-center rounded-full border-2 border-accent-light bg-primary shadow-lg"
              accessibilityRole="button"
              accessibilityLabel="Add or edit receipt settings"
            >
              <Text className="text-2xl font-bold text-white">+</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Edit / Add Receipt Settings Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        onRequestClose={() => {
          if (!isSaving) setIsEditModalVisible(false);
        }}
        statusBarTranslucent
      >
        <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
          <StatusBar barStyle="light-content" />
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Modal Header */}
            <View className="h-16 flex-row items-center justify-between border-b border-[#00382E] bg-primary px-4">
              <View className="flex-1 flex-row items-center pr-3">
                <Pressable
                  onPress={() => setIsEditModalVisible(false)}
                  disabled={isSaving}
                  className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-900/40 active:bg-emerald-900/70"
                  accessibilityRole="button"
                  accessibilityLabel="Close receipt editor"
                >
                  <ReceiptIcon name="close" color="#FFFFFF" size={16} />
                </Pressable>
                <View className="flex-1">
                  <Text className="text-base font-extrabold tracking-wide text-white" numberOfLines={1}>
                    Edit Receipt Settings
                  </Text>
                  <Text className="text-[10px] font-medium text-emerald-200">
                    Customize printed receipt information
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => saveSettings()}
                disabled={isSaving || !draftSettings.shopName.trim()}
                className={`h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/20 ${
                  isSaving || !draftSettings.shopName.trim() ? 'opacity-40' : 'active:bg-accent/30'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Save receipt settings"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#F5C45E" />
                ) : (
                  <ReceiptIcon name="check" color="#F5C45E" size={18} />
                )}
              </Pressable>
            </View>

            {/* Modal Form ScrollView */}
            <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
              <ScrollView
                className="flex-1"
                contentContainerClassName="px-4 pb-8 pt-4 gap-4"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Logo Uploader */}
                <View className="overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-xs">
                  <Text className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Shop Logo
                  </Text>
                  <View className="flex-row items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                    {draftSettings.logoUrl && (draftSettings.logoUrl.startsWith('data:') || draftSettings.logoUrl.startsWith('http')) ? (
                      <Image
                        source={{ uri: draftSettings.logoUrl }}
                        className="h-16 w-20 rounded-lg bg-white border border-slate-200"
                        resizeMode="contain"
                      />
                    ) : (
                      <View className="h-16 w-20 items-center justify-center rounded-lg border border-slate-200 bg-white">
                        <ReceiptIcon name="image" color="#94A3B8" size={24} />
                      </View>
                    )}
                    <View className="flex-1 gap-2">
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={uploadLogo}
                          className="rounded-lg bg-primary px-3 py-1.5 active:bg-primary-dark"
                          accessibilityRole="button"
                        >
                          <Text className="text-xs font-bold text-white">Upload</Text>
                        </Pressable>
                        {draftSettings.logoUrl ? (
                          <Pressable
                            onPress={removeLogo}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 active:bg-rose-100"
                            accessibilityRole="button"
                          >
                            <Text className="text-xs font-bold text-rose-700">Remove</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <Text className="text-[10px] text-slate-500">Max 1 MB (PNG, JPG, WebP)</Text>
                    </View>
                  </View>
                </View>

                {/* Shop Name */}
                <View className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
                  <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Shop Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={draftSettings.shopName}
                    onChangeText={text => updateDraft('shopName', text)}
                    placeholder="Sri Golds"
                    placeholderTextColor="#94A3B8"
                    maxLength={120}
                    className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                    accessibilityLabel="Modal Shop Name"
                  />
                </View>

                {/* Contact Phone & Email */}
                <View className="rounded-2xl border border-border bg-surface p-4 shadow-xs gap-3">
                  <View>
                    <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Contact Phone
                    </Text>
                    <TextInput
                      value={draftSettings.phone}
                      onChangeText={text => updateDraft('phone', text)}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                      accessibilityLabel="Modal Contact Phone"
                    />
                  </View>
                  <View>
                    <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Contact Email
                    </Text>
                    <TextInput
                      value={draftSettings.email}
                      onChangeText={text => updateDraft('email', text)}
                      placeholder="e.g. contact@srigolds.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                      accessibilityLabel="Modal Contact Email"
                    />
                  </View>
                  <View>
                    <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      GST Number
                    </Text>
                    <TextInput
                      value={draftSettings.gstNumber}
                      onChangeText={text => updateDraft('gstNumber', text)}
                      placeholder="GSTIN"
                      placeholderTextColor="#94A3B8"
                      className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                      accessibilityLabel="Modal GST Number"
                    />
                  </View>
                </View>

                {/* Shop Address */}
                <View className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
                  <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Shop Address
                  </Text>
                  <TextInput
                    value={draftSettings.address}
                    onChangeText={text => updateDraft('address', text)}
                    placeholder="Address printed on bills…"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="min-h-20 rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                    accessibilityLabel="Modal Shop Address"
                  />
                </View>

                {/* Footer Message */}
                <View className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
                  <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Receipt Footer Message
                  </Text>
                  <TextInput
                    value={draftSettings.footerMessage}
                    onChangeText={text => updateDraft('footerMessage', text)}
                    placeholder="Thank you message printed at the bottom of bills…"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="min-h-20 rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-slate-800"
                    accessibilityLabel="Modal Receipt Footer"
                  />
                </View>
              </ScrollView>

              {/* Modal Bottom Actions */}
              <View className="flex-row items-center gap-3 border-t border-border bg-surface px-4 py-3.5 shadow-sm">
                <Pressable
                  onPress={() => setIsEditModalVisible(false)}
                  disabled={isSaving}
                  className="flex-1 items-center justify-center rounded-xl border border-border bg-slate-100 py-3.5 active:bg-slate-200"
                  accessibilityRole="button"
                >
                  <Text className="text-sm font-bold text-slate-700">Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={() => saveSettings()}
                  disabled={isSaving || !draftSettings.shopName.trim()}
                  className={`flex-[2] flex-row items-center justify-center rounded-xl bg-primary py-3.5 shadow-sm ${
                    isSaving || !draftSettings.shopName.trim() ? 'opacity-50' : 'active:opacity-90'
                  }`}
                  accessibilityRole="button"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <ReceiptIcon name="check" color="#FFFFFF" size={16} />
                      <Text className="ml-2 text-sm font-bold text-white">Save Settings</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ReceiptIcon({
  name,
  color,
  size = 18,
}: {
  name: 'back' | 'check' | 'close' | 'edit' | 'image' | 'upload' | 'trash';
  color: string;
  size?: number;
}) {
  const iconPaths: Record<typeof name, string[]> = {
    back: ['m15 18-6-6 6-6', 'M20 12H9'],
    check: ['M20 6 9 17l-5-5'],
    close: ['M18 6 6 18', 'm6 6 12 12'],
    edit: [
      'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
      'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    ],
    image: ['M4 4h16v16H4z', 'm4 16 5-5 4 4 3-3 4 4', 'M9 9h.01'],
    upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
    trash: [
      'M3 6h18',
      'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    ],
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {iconPaths[name].map((path, i) => (
        <Path
          key={`${name}-${i}`}
          d={path}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export default Receipt;
