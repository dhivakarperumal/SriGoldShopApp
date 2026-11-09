import {
  useState,
} from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert } from '../../../Components/AppAlert';
import Svg, { Path } from 'react-native-svg';
import UserPageHeader from '../../components/UserPageHeader';

type UserContactProps = {
  onBack: () => void;
};

type ContactSubject =
  | 'Product enquiry'
  | 'Order assistance'
  | 'Store visit'
  | 'Other';

const SHOP_PHONE = '9659133504';
const SHOP_PHONE_LABEL = '+91 96591 33504';
const SHOP_ADDRESS = 'No.58 Vaitheeshwaran Nagar, Tirupattur - 635653';
const SUBJECTS: ContactSubject[] = [
  'Product enquiry',
  'Order assistance',
  'Store visit',
  'Other',
];

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  subject: ContactSubject | '';
  message: string;
};

const EMPTY_FORM: ContactForm = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

async function openExternalUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('Unable to open contact link:', error);
    Alert.alert(
      'Unable to open link',
      'Please check that a compatible app is installed and try again.',
    );
  }
}

function UserContact({ onBack }: UserContactProps) {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);

  const updateForm = <K extends keyof ContactForm>(
    key: K,
    value: ContactForm[K],
  ) => setForm(current => ({ ...current, [key]: value }));

  const sendMessage = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const message = form.message.trim();

    if (!name || !email || !phone || !form.subject || !message) {
      Alert.alert(
        'Missing details',
        'Please complete all fields before continuing.',
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    const content = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Subject: ${form.subject}`,
      '',
      message,
    ].join('\n');
    await openExternalUrl(
      `https://wa.me/${SHOP_PHONE}?text=${encodeURIComponent(content)}`,
    );
  };

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    SHOP_ADDRESS,
  )}`;

  return (
    <View className="flex-1 bg-white">
      <UserPageHeader
        title="Contact Us"
        onBack={onBack}
        backAccessibilityLabel="Back to More"
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-[#eadfc8] bg-white">
          <ContactAction
            title="Call Us"
            detail={SHOP_PHONE_LABEL}
            icon="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"
            onPress={() => openExternalUrl(`tel:+91${SHOP_PHONE}`)}
          />
          <View className="h-px bg-[#eadfc8]" />
          <ContactAction
            title="WhatsApp"
            detail="Chat with our team"
            icon="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.5 8.5 0 0 1 8.5 8.5Z"
            onPress={() => openExternalUrl(`https://wa.me/${SHOP_PHONE}`)}
          />
          <View className="h-px bg-[#eadfc8]" />
          <ContactAction
            title="Visit Us"
            detail="Tirupattur Showroom"
            icon="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z M12 10a2.5 2.5 0 1 0 0 .01Z"
            onPress={() => openExternalUrl(mapUrl)}
          />
        </View>

        <View className="mx-4 mt-5 rounded-2xl border border-[#eee3d0] bg-white p-4">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#ae7617]">
            We’d love to hear from you
          </Text>
          <Text className="mt-1 text-xl font-bold text-primary-dark">
            Send Us a Message
          </Text>
          <Text className="mt-1 text-xs leading-5 text-slate-600">
            Fill in the details and continue to WhatsApp to send your message.
          </Text>

          <View className="mt-4 gap-3">
            <ContactInput
              label="Full Name"
              value={form.name}
              onChangeText={value => updateForm('name', value)}
              autoComplete="name"
            />
            <ContactInput
              label="Email Address"
              value={form.email}
              onChangeText={value => updateForm('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <ContactInput
              label="Phone Number"
              value={form.phone}
              onChangeText={value => updateForm('phone', value)}
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            <View>
              <Text className="mb-2 text-xs font-semibold text-slate-600">
                Select Subject
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SUBJECTS.map(subject => {
                  const isSelected = form.subject === subject;
                  return (
                    <Pressable
                      key={subject}
                      className={`rounded-full border px-3 py-2 ${
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-[#eadcc0] bg-white'
                      }`}
                      onPress={() => updateForm('subject', subject)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {subject}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <ContactInput
              label="Your Message"
              value={form.message}
              onChangeText={value => updateForm('message', value)}
              multiline
            />
            <Pressable
              className="min-h-12 flex-row items-center justify-center rounded-full bg-[#08796a] px-4 py-3 active:opacity-80"
              onPress={sendMessage}
              accessibilityRole="button"
            >
              <Text className="text-sm font-bold text-white">
                Continue to WhatsApp
              </Text>
              <Text className="ml-2 text-base font-bold text-white">›</Text>
            </Pressable>
          </View>
        </View>

        <View className="mx-4 mt-4 rounded-2xl border border-[#eee3d0] bg-white p-4">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#ae7617]">
            Come see us
          </Text>
          <Text className="mt-1 text-xl font-bold text-primary-dark">
            Our Showroom Location
          </Text>
          <Text className="mt-2 text-sm font-semibold text-slate-700">
            Sri Golds · Tirupattur
          </Text>
          <Text className="mt-1 text-sm leading-5 text-slate-600">
            {SHOP_ADDRESS}
          </Text>
          <Pressable
            className="mt-4 min-h-11 items-center justify-center rounded-full border border-[#d6a63c] px-4 py-2 active:bg-amber-50"
            onPress={() => openExternalUrl(mapUrl)}
            accessibilityRole="button"
          >
            <Text className="text-sm font-bold text-[#9a6817]">
              Open directions
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

type ContactActionProps = {
  title: string;
  detail: string;
  icon: string;
  onPress: () => void;
};

function ContactAction({ title, detail, icon, onPress }: ContactActionProps) {
  return (
    <Pressable
      className="min-h-20 flex-row items-center px-4 py-3 active:bg-[#f2f7f4]"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${detail}`}
    >
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-[#fff4d9]">
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d={icon}
            stroke="#bd821e"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View>
        <Text className="text-sm font-bold text-primary-dark">{title}</Text>
        <Text className="mt-1 text-xs text-slate-600">{detail}</Text>
      </View>
    </Pressable>
  );
}

type ContactInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'name' | 'tel';
  multiline?: boolean;
};

function ContactInput({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  multiline = false,
}: ContactInputProps) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-slate-600">
        {label} *
      </Text>
      <TextInput
        className={`rounded-xl border border-[#e7e0d5] bg-white px-3.5 py-3 text-sm text-[#30271b] ${
          multiline ? 'min-h-28' : 'min-h-12'
        }`}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#a59b8d"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={label}
      />
    </View>
  );
}

export default UserContact;
