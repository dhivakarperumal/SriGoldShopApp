import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../Components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import Svg, { Path } from 'react-native-svg';
import api from '../../api';

export type LoanCustomer = {
  id: string | number;
  customer_code?: string;
  customer_type?: string;
  full_name: string;
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  occupation?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  guarantor_name?: string;
  guarantor_mobile?: string;
  guarantor_email?: string;
  guarantor_relationship?: string;
  guarantor_address?: string;
  kyc_status?: string;
  photo_url?: string;
  notes?: string;
};

type Props = {
  customer?: LoanCustomer | null;
  onCancel: () => void;
  onSaved: () => void;
};

type CustomerForm = Omit<LoanCustomer, 'id' | 'customer_code'> & { password: string };
type StagedDocument = {
  document_type: string;
  document_side: 'front' | 'back';
  uri: string;
  name: string;
  type: string;
  size?: number | null;
};
type DatePickerTarget = 'date_of_birth';

const EMPTY_FORM: CustomerForm = {
  customer_type: 'Individual',
  full_name: '',
  mobile: '',
  alternate_mobile: '',
  email: '',
  date_of_birth: '',
  gender: '',
  occupation: '',
  address: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
  guarantor_name: '',
  guarantor_mobile: '',
  guarantor_email: '',
  guarantor_relationship: '',
  guarantor_address: '',
  kyc_status: 'Pending',
  photo_url: '',
  notes: '',
  password: '',
};

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];
const DOCUMENT_TYPES = [
  { label: 'Aadhaar Card', value: 'aadhaar' },
  { label: 'PAN Card', value: 'pan' },
  { label: 'Voter ID Card', value: 'voter_id' },
  { label: 'Driving Licence', value: 'driving_license' },
  { label: 'Passport', value: 'passport' },
  { label: 'Ration Card', value: 'ration_card' },
  { label: 'Other Government-Issued ID', value: 'other' },
];

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCalendarWeeks = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
};

function CreateCustomers({ customer, onCancel, onSaved }: Props) {
  const [form, setForm] = useState<CustomerForm>(() => ({
    ...EMPTY_FORM,
    ...customer,
    password: '',
    date_of_birth: customer?.date_of_birth?.slice(0, 10) || '',
  }));
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0].value);
  const [documents, setDocuments] = useState<StagedDocument[]>([]);
  const [persistedCustomer, setPersistedCustomer] = useState(customer || null);
  const [uploadedDocumentKeys, setUploadedDocumentKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [existingDocuments, setExistingDocuments] = useState<Array<Record<string, unknown>>>([]);
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [draftDate, setDraftDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  useEffect(() => {
    if (!customer) return;
    let active = true;
    api.get(`/loan-customers/${customer.id}/documents`)
      .then(({ data }) => {
        if (active && Array.isArray(data)) setExistingDocuments(data);
      })
      .catch(error => {
        console.error('Failed to load loan customer documents:', error);
        Alert.alert('Documents unavailable', getErrorMessage(error, 'Could not load KYC documents.'));
      });
    return () => {
      active = false;
    };
  }, [customer]);

  const photoUri = photo?.uri;
  const stagedBySide = useMemo(
    () => new Map(documents.map(document => [`${document.document_type}:${document.document_side}`, document])),
    [documents],
  );

  const update = (field: keyof CustomerForm, value: string) => {
    setForm(current => ({
      ...current,
      [field]: value,
      ...(field === 'mobile' && !customer && !current.password ? { password: value } : {}),
    }));
  };

  const openDatePicker = (target: DatePickerTarget) => {
    const date = parseLocalDate(form[target] || formatLocalDate(new Date()));
    setDraftDate(date);
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setDatePickerTarget(target);
  };

  const applyDateSelection = () => {
    if (!datePickerTarget) return;
    update(datePickerTarget, formatLocalDate(draftDate));
    setDatePickerTarget(null);
  };

  const uploadCustomerPhoto = async (asset: Asset | undefined) => {
    if (!asset?.uri) return;
    if (asset.type && !['image/png', 'image/jpeg'].includes(asset.type)) {
      Alert.alert('Unsupported photo', 'Choose a PNG or JPG photo.');
      return;
    }
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Photo too large', 'Customer photo must be 5 MB or smaller.');
      return;
    }

    try {
      setPhoto(asset);
      setUploadingPhoto(true);
      const data = new FormData();
      data.append('photo', {
        uri: asset.uri,
        name: asset.fileName || `customer-${Date.now()}.${asset.type === 'image/png' ? 'png' : 'jpg'}`,
        type: asset.type || 'image/jpeg',
      } as unknown as Blob);
      const { data: response } = await api.post('/loan-customers/photos', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (typeof response?.photo_url !== 'string' || !response.photo_url) {
        throw new Error('The server did not return the saved photo reference.');
      }
      setForm(current => ({ ...current, photo_url: response.photo_url }));
    } catch (error) {
      console.error('Failed to upload loan customer photo:', error);
      setPhoto(null);
      Alert.alert('Photo upload failed', getErrorMessage(error, 'Could not upload customer photo.'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });
      if (result.didCancel) return;
      if (result.errorCode) throw new Error(result.errorMessage || 'Could not choose a photo.');
      await uploadCustomerPhoto(result.assets?.[0]);
    } catch (error) {
      console.error('Failed to select loan customer photo:', error);
      Alert.alert('Photo selection failed', getErrorMessage(error, 'Could not choose a photo.'));
    }
  };

  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });
      if (result.didCancel) return;
      if (result.errorCode) throw new Error(result.errorMessage || 'Could not take a photo.');
      await uploadCustomerPhoto(result.assets?.[0]);
    } catch (error) {
      console.error('Failed to capture loan customer photo:', error);
      Alert.alert('Camera failed', getErrorMessage(error, 'Could not take a photo.'));
    }
  };

  const stageDocument = (
    side: 'front' | 'back',
    file: { uri: string; name: string; type: string; size?: number | null },
  ) => {
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      Alert.alert('Unsupported document', 'Choose or take a PDF, PNG, or JPG document.');
      return;
    }
    if (file.size && file.size > 10 * 1024 * 1024) {
      Alert.alert('Document too large', 'Each KYC document must be 10 MB or smaller.');
      return;
    }
    const documentKey = `${documentType}:${side}`;
    setUploadedDocumentKeys(current => current.filter(key => key !== documentKey));
    setDocuments(current => [
      ...current.filter(item => item.document_type !== documentType || item.document_side !== side),
      {
        document_type: documentType,
        document_side: side,
        ...file,
      },
    ]);
  };

  const pickDocument = async (side: 'front' | 'back') => {
    try {
      const [file] = await pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });
      if (!file) return;
      const mimeType = file.type || '';
      stageDocument(side, {
        uri: file.uri,
        name: file.name || `${documentType}-${side}.${mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`,
        type: mimeType,
        size: file.size,
      });
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      console.error('Failed to select loan customer KYC document:', error);
      Alert.alert('Document selection failed', getErrorMessage(error, 'Could not select document.'));
    }
  };

  const captureDocument = async (side: 'front' | 'back') => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1600,
        maxHeight: 1600,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Could not take a document photo.');
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      stageDocument(side, {
        uri: asset.uri,
        name: asset.fileName || `${documentType}-${side}-${Date.now()}.${asset.type === 'image/png' ? 'png' : 'jpg'}`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize,
      });
    } catch (error) {
      console.error('Failed to capture loan customer KYC document:', error);
      Alert.alert('Camera failed', getErrorMessage(error, 'Could not take a document photo.'));
    }
  };

  const submit = async () => {
    if (saving) return;
    const requiredFields: Array<[keyof CustomerForm, string]> = [
      ['full_name', 'Full name'],
      ['mobile', 'Mobile'],
      ['gender', 'Gender'],
      ['address', 'Residential address'],
      ['city', 'City / town'],
      ['district', 'District'],
      ['state', 'State / UT'],
      ['pincode', 'PIN code'],
      ['guarantor_name', 'Guarantor name'],
      ['guarantor_mobile', 'Guarantor mobile'],
      ['guarantor_relationship', 'Guarantor relationship'],
    ];
    const missingField = requiredFields.find(([field]) => !String(form[field] || '').trim());
    if (missingField) {
      Alert.alert('Required fields', `Enter ${missingField[1].toLowerCase()} to continue.`);
      return;
    }
    if (!form.photo_url) {
      Alert.alert('Customer photo required', 'Upload a customer photo before saving.');
      return;
    }
    if (!persistedCustomer && !form.password.trim()) {
      Alert.alert('Password required', 'Enter an account password or provide the mobile number.');
      return;
    }
    const documentTypes = new Set(documents.map(item => item.document_type));
    for (const type of documentTypes) {
      const sides = new Set<string>([
        ...existingDocuments
          .filter(item => item.document_type === type)
          .map(item => String(item.document_side || 'front')),
        ...documents.filter(item => item.document_type === type).map(item => item.document_side),
      ]);
      if (sides.size !== 2) {
        Alert.alert('KYC document incomplete', 'Upload both front and back before saving a document type.');
        return;
      }
    }

    setSaving(true);
    let customerSaved = false;
    try {
      const payload: Record<string, string> = {
        ...form,
        full_name: form.full_name.trim(),
        mobile: form.mobile.trim(),
        alternate_mobile: form.alternate_mobile?.trim() || '',
        photo_url: form.photo_url.trim(),
      };
      if (persistedCustomer) delete payload.password;
      const response = persistedCustomer
        ? await api.put(`/loan-customers/${persistedCustomer.id}`, payload)
        : await api.post('/loan-customers', payload);
      const savedCustomer = response.data as LoanCustomer;
      customerSaved = true;
      setPersistedCustomer(savedCustomer);
      for (const document of documents) {
        const documentKey = `${document.document_type}:${document.document_side}`;
        if (uploadedDocumentKeys.includes(documentKey)) continue;
        const body = new FormData();
        body.append('document_type', document.document_type);
        body.append('document_side', document.document_side);
        body.append('documents', {
          uri: document.uri,
          name: document.name,
          type: document.type,
        } as unknown as Blob);
        await api.post(`/loan-customers/${savedCustomer.id}/documents`, body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUploadedDocumentKeys(current => [...current, documentKey]);
      }
      Alert.alert('Customer saved', persistedCustomer ? 'Loan customer updated.' : 'Loan customer created.');
      onSaved();
    } catch (error) {
      console.error('Failed to save loan customer:', error);
      Alert.alert(
        customerSaved ? 'Customer saved; documents need attention' : 'Save failed',
        customerSaved
          ? `Customer profile saved, but a KYC document could not be uploaded: ${getErrorMessage(error, 'Try again.')}`
          : getErrorMessage(error, 'Could not save loan customer.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="h-14 flex-row items-center bg-primary px-4">
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Back to loan customers" className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/40">
          <Text className="text-xl font-bold text-white">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-extrabold text-white">{customer ? 'Edit Loan Customer' : 'Create Loan Customer'}</Text>
          <Text className="text-[10px] text-emerald-100">Borrower profile and KYC details</Text>
        </View>
      </View>
      <SafeAreaView className="flex-1" edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
            <FormSection title="Personal details">
              <Field label="Full name" value={form.full_name} onChangeText={value => update('full_name', value)} required />
              <Field label="Mobile" value={form.mobile} onChangeText={value => update('mobile', value)} keyboardType="phone-pad" required />
              {!customer ? (
                <Field
                  label="Account password"
                  value={form.password}
                  onChangeText={value => update('password', value)}
                  secureTextEntry={!isPasswordVisible}
                  secureTextEntryVisible={isPasswordVisible}
                  onToggleSecureTextEntry={() => setIsPasswordVisible(visible => !visible)}
                  placeholder="Defaults to mobile number"
                />
              ) : null}
              <Field label="Alternate mobile" value={form.alternate_mobile || ''} onChangeText={value => update('alternate_mobile', value)} keyboardType="phone-pad" />
              <Field label="Email" value={form.email || ''} onChangeText={value => update('email', value)} keyboardType="email-address" />
              <DateField
                label="Date of birth"
                value={form.date_of_birth || ''}
                onPress={() => openDatePicker('date_of_birth')}
              />
              <ChoiceField label="Gender" value={form.gender || ''} options={['', 'Male', 'Female', 'Other']} onChange={value => update('gender', value)} />
              <Field label="Occupation" value={form.occupation || ''} onChangeText={value => update('occupation', value)} />
            </FormSection>

            <FormSection title="Address">
              <Field label="Address" value={form.address || ''} onChangeText={value => update('address', value)} multiline />
              <Field label="City / town" value={form.city || ''} onChangeText={value => update('city', value)} />
              <Field label="District" value={form.district || ''} onChangeText={value => update('district', value)} />
              <ChoiceField label="State / UT" value={form.state || ''} options={['', ...STATES]} onChange={value => update('state', value)} />
              <Field label="PIN code" value={form.pincode || ''} onChangeText={value => update('pincode', value)} keyboardType="number-pad" />
            </FormSection>

            <FormSection title="Guarantor / surety">
              <Field label="Guarantor name" value={form.guarantor_name || ''} onChangeText={value => update('guarantor_name', value)} />
              <Field label="Guarantor mobile" value={form.guarantor_mobile || ''} onChangeText={value => update('guarantor_mobile', value)} keyboardType="phone-pad" />
              <Field label="Guarantor email" value={form.guarantor_email || ''} onChangeText={value => update('guarantor_email', value)} keyboardType="email-address" />
              <Field label="Relationship" value={form.guarantor_relationship || ''} onChangeText={value => update('guarantor_relationship', value)} />
              <Field label="Guarantor address" value={form.guarantor_address || ''} onChangeText={value => update('guarantor_address', value)} multiline />
            </FormSection>

            <FormSection title="Customer photo">
              {photoUri ? (
                <Image source={{ uri: photoUri }} className="h-40 w-full rounded-xl bg-slate-100" resizeMode="cover" />
              ) : form.photo_url ? (
                <Text className="text-xs text-emerald-700">A saved customer photo is attached. Choose a replacement if needed.</Text>
              ) : (
                <Text className="text-xs text-slate-500">A customer photo is required. PNG/JPG, up to 5 MB.</Text>
              )}
              <View className="flex-row gap-2">
                <Pressable onPress={takePhoto} disabled={uploadingPhoto} accessibilityRole="button" accessibilityLabel="Take customer photo with camera" className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-primary px-3 py-3">
                  {uploadingPhoto ? <ActivityIndicator color="white" /> : <Text className="text-sm font-bold text-white">Take photo</Text>}
                </Pressable>
                <Pressable onPress={uploadPhoto} disabled={uploadingPhoto} accessibilityRole="button" accessibilityLabel="Choose customer photo from gallery" className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl border border-primary bg-white px-3 py-3">
                  {uploadingPhoto ? <ActivityIndicator color="#004D40" /> : <Text className="text-sm font-bold text-primary">Gallery</Text>}
                </Pressable>
              </View>
            </FormSection>

            <FormSection title="KYC documents">
              <ChoiceField label="Document type" value={documentType} options={DOCUMENT_TYPES.map(item => item.value)} onChange={setDocumentType} />
              {(['front', 'back'] as const).map(side => {
                const staged = stagedBySide.get(`${documentType}:${side}`);
                const existing = existingDocuments.find(item =>
                  item.document_type === documentType && (item.document_side || 'front') === side,
                );
                return (
                  <View key={side} className="flex-row items-center justify-between rounded-xl border border-slate-200 p-3">
                    <View className="mr-2 flex-1">
                      <Text className="text-xs font-bold capitalize text-slate-700">{side}</Text>
                      <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                        {staged?.name || (typeof existing?.original_name === 'string' ? existing.original_name : 'No file selected')}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable onPress={() => captureDocument(side)} accessibilityRole="button" accessibilityLabel={`Take ${side} KYC document photo`} className="rounded-lg bg-emerald-50 px-3 py-2">
                        <Text className="text-xs font-bold text-primary">Camera</Text>
                      </Pressable>
                      <Pressable onPress={() => pickDocument(side)} accessibilityRole="button" accessibilityLabel={`${staged || existing ? 'Replace' : 'Choose'} ${side} KYC document`} className="rounded-lg bg-emerald-50 px-3 py-2">
                        <Text className="text-xs font-bold text-primary">{staged || existing ? 'Replace' : 'Choose'}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              <Text className="text-[11px] leading-4 text-slate-500">Documents are optional. If you add a document type, both front and back must be selected. PDF, PNG, or JPG; up to 10 MB each.</Text>
            </FormSection>

            <FormSection title="KYC status and notes">
              <ChoiceField label="KYC status" value={form.kyc_status || 'Pending'} options={['Pending', 'Verified', 'Rejected']} onChange={value => update('kyc_status', value)} />
              <Field label="Internal notes" value={form.notes || ''} onChangeText={value => update('notes', value)} multiline />
            </FormSection>
          </ScrollView>
          <View className="flex-row gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <ActionButton label="Close" onPress={onCancel} secondary disabled={saving || uploadingPhoto} />
            <ActionButton label={saving ? 'Saving…' : customer ? 'Save changes' : 'Create customer'} onPress={submit} disabled={saving || uploadingPhoto} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Modal
        visible={datePickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerTarget(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white px-5 pb-6 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-slate-900">Date of birth</Text>
              <Pressable
                onPress={() => setDatePickerTarget(null)}
                accessibilityRole="button"
                accessibilityLabel="Close date selection"
                className="px-2 py-1"
              >
                <Text className="text-sm font-bold text-slate-500">Close</Text>
              </Pressable>
            </View>
            <View className="mb-3 flex-row items-center justify-between">
              <Pressable
                onPress={() =>
                  setCalendarMonth(current =>
                    new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <Text className="text-lg font-bold text-slate-700">‹</Text>
              </Pressable>
              <Text className="text-sm font-bold text-slate-800">
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                onPress={() =>
                  setCalendarMonth(current =>
                    new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Next month"
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <Text className="text-lg font-bold text-slate-700">›</Text>
              </Pressable>
            </View>
            <View className="mb-1 flex-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} className="flex-1 py-2 text-center text-xs font-semibold text-slate-400">
                  {day}
                </Text>
              ))}
            </View>
            {getCalendarWeeks(calendarMonth).map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} className="flex-row">
                {week.map((date, dayIndex) => {
                  const dateValue = date ? formatLocalDate(date) : '';
                  const selected = dateValue === formatLocalDate(draftDate);
                  const futureDate = dateValue > formatLocalDate(new Date());
                  return (
                    <Pressable
                      key={dateValue || `empty-${weekIndex}-${dayIndex}`}
                      disabled={!date || futureDate}
                      onPress={() => date && setDraftDate(date)}
                      accessibilityRole="button"
                      accessibilityLabel={date ? dateValue : undefined}
                      accessibilityState={{ selected, disabled: !date || futureDate }}
                      className={`m-0.5 h-10 flex-1 items-center justify-center rounded-full ${
                        selected
                          ? 'bg-primary'
                          : date && !futureDate
                            ? 'active:bg-emerald-50'
                            : ''
                      }`}
                    >
                      {date ? (
                        <Text
                          className={`text-sm ${
                            selected
                              ? 'font-bold text-white'
                              : futureDate
                                ? 'text-slate-300'
                                : 'text-slate-700'
                          }`}
                        >
                          {date.getDate()}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <Pressable
              onPress={applyDateSelection}
              accessibilityRole="button"
              accessibilityLabel="Apply date"
              className="mt-4 items-center rounded-xl bg-primary px-4 py-3"
            >
              <Text className="text-sm font-bold text-white">Apply date</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-sm font-extrabold text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  secureTextEntryVisible = false,
  onToggleSecureTextEntry,
  multiline = false,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
  secureTextEntry?: boolean;
  secureTextEntryVisible?: boolean;
  onToggleSecureTextEntry?: () => void;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-slate-700">{label}{required ? ' *' : ''}</Text>
      <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor="#94A3B8"
          textAlignVertical={multiline ? 'top' : 'center'}
          className={`min-w-0 flex-1 py-3 text-sm text-slate-800 ${multiline ? 'min-h-20' : ''}`}
        />
        {onToggleSecureTextEntry ? (
          <Pressable
            onPress={onToggleSecureTextEntry}
            accessibilityRole="button"
            accessibilityLabel={secureTextEntryVisible ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: secureTextEntryVisible }}
            hitSlop={8}
            className="ml-2 h-10 w-10 items-center justify-center"
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
                stroke="#64748B"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {secureTextEntryVisible ? (
                <Path
                  d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
                  stroke="#64748B"
                  strokeWidth={1.8}
                />
              ) : (
                <Path
                  d="m3 3 18 18"
                  stroke="#64748B"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              )}
            </Svg>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function DateField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-slate-700">{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label.toLowerCase()}`}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3"
      >
        <Text className={`text-sm ${value ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
          {value || 'Select date'}
        </Text>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
            stroke="#64748B"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

function ChoiceField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-slate-700">{label}</Text>
      <Pressable
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label}`}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3"
      >
        <Text className={`text-sm ${value ? 'text-slate-800' : 'text-slate-400'}`}>
          {value || `Select ${label.toLowerCase()}`}
        </Text>
        <Text className="text-slate-400">⌄</Text>
      </Pressable>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[75%] rounded-t-3xl bg-white px-4 pb-8 pt-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-slate-900">{label}</Text>
              <Pressable onPress={() => setVisible(false)} accessibilityRole="button" accessibilityLabel={`Close ${label} options`} className="px-2 py-1">
                <Text className="text-sm font-bold text-slate-500">Close</Text>
              </Pressable>
            </View>
            <ScrollView>
              {options.map(option => (
                <Pressable
                  key={option || 'none'}
                  onPress={() => { onChange(option); setVisible(false); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === option }}
                  className="border-b border-slate-100 py-3.5"
                >
                  <Text className={`text-sm ${value === option ? 'font-bold text-primary' : 'text-slate-700'}`}>
                    {option || `Select ${label.toLowerCase()}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`flex-1 items-center rounded-xl px-4 py-3 ${secondary ? 'border border-slate-300 bg-white' : 'bg-primary'} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-sm font-bold ${secondary ? 'text-slate-700' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}

export default CreateCustomers;