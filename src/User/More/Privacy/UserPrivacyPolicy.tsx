import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import UserPageHeader from '../../components/UserPageHeader';

type UserPrivacyPolicyProps = {
  onBack: () => void;
  onContact: () => void;
};

const POLICY_SECTIONS = [
  {
    title: 'Information we collect',
    paragraphs: [
      'We collect information you choose to give us when you use Sri Golds services, including:',
    ],
    bullets: [
      'Account and profile details, such as your name, username, email address, phone number, address and profile photo.',
      'Enquiry and contact details, such as your name, phone number, email address, message and the jewellery or gold-loan service you ask about.',
      'Loan and customer-service records, which may include contact details, address, date of birth, customer photo, guarantor details and information needed to manage a loan or provide related service.',
      'Identity documents that you choose to submit for KYC review, such as an enabled identity-document type and the related application status.',
      'Sign-in information when you choose to sign in with Google, such as the account details Google supplies for sign-in.',
    ],
    closing: 'Please provide only information needed for your request. Do not send unrelated sensitive information.',
  },
  {
    title: 'How we use information',
    paragraphs: [
      'We use information to operate the website and shop services, respond to enquiries, manage customer accounts and profiles, provide customer support, and administer jewellery and gold-loan services.',
      'We may also use it to review KYC submissions, keep appropriate business records, protect accounts and services, address misuse, and meet applicable legal obligations.',
      'When you sign in, the site keeps account details and an authentication token in your browser’s local storage so your account can remain signed in. Sign out to remove the active sign-in from that browser.',
    ],
  },
  {
    title: 'Identity documents and loan records',
    paragraphs: [
      'If you submit identity documents through the KYC feature, the documents are stored for manual review by authorized shop staff. Access to KYC documents is restricted and document views are logged. The review is an internal manual decision; it is not a government identity check or a guarantee that a document is authentic.',
      'Loan-service records can include information about you and, where relevant, your guarantor. We use these details to administer the service and maintain related records. Please ask us before submitting a document if you need to know whether a particular document type is required or how long a record will be kept.',
    ],
  },
  {
    title: 'When information is shared',
    paragraphs: [
      'We do not sell your personal information. We share it only when needed to provide or operate a requested service, protect the business and its customers, or comply with law. This may include:',
    ],
    bullets: [
      'Shop staff who need the information to respond to you, manage your account, or handle a customer, loan or KYC record.',
      'Service providers that support website hosting, storage, authentication or other business operations, subject to their role in providing that service.',
      'Google, if you choose Google sign-in. Google processes information under its own privacy terms.',
      'WhatsApp, if you choose to continue the Contact Us form through WhatsApp. The form opens a pre-filled message; information is sent to WhatsApp only if you choose to continue and send it there.',
      'Authorities or other parties when disclosure is required by law or needed to address a valid legal or safety concern.',
    ],
    closing: 'Third-party services have their own privacy practices. Review their policies before using them.',
  },
  {
    title: 'Storage and security',
    paragraphs: [
      'We use access controls and other safeguards intended to protect personal information. KYC documents are kept in private storage and are not intended to be publicly accessible. No website or storage method can be guaranteed completely secure.',
      'Keep your account credentials private and sign out when using a shared device. Contact us promptly if you believe your account or information has been accessed without permission.',
    ],
  },
  {
    title: 'Your choices and requests',
    paragraphs: [
      'You can review or update some account details through your profile. You may also contact us to ask about personal information we hold, request a correction or deletion, or withdraw consent where processing is based on consent.',
      'We may need to verify your identity before acting on a request, and some records may need to be retained to provide a service or meet legal and business obligations.',
    ],
  },
  {
    title: 'Retention and policy updates',
    paragraphs: [
      'We keep information for as long as it is needed for the purposes described above, to provide services, resolve issues and maintain required records. The period depends on the type of information and applicable obligations; please contact us for questions about a specific record.',
      'We may update this policy when our services or practices change. The latest version and its update date will be shown on this page.',
    ],
  },
];

function UserPrivacyPolicy({ onBack, onContact }: UserPrivacyPolicyProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  return (
    <View className="flex-1 bg-[#fffaf0]">
      <UserPageHeader
        title="Privacy Policy"
        subtitle="Your information, handled with care"
        onBack={onBack}
        backAccessibilityLabel="Back to More"
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-4 mt-4 overflow-hidden rounded-3xl bg-[#073b2f] p-5">
          <View className="absolute -right-8 -top-10 h-40 w-40 rounded-full border border-white/10" />
          <View className="absolute -right-1 -top-2 h-24 w-24 rounded-full border border-[#f2d58a]/20" />
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center rounded-full border border-white/15 bg-white/10 px-3 py-2">
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color="#f2d58a"
              />
              <Text className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#f2d58a]">
                Privacy at Sri Golds
              </Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="lock-closed-outline" size={21} color="#f2d58a" />
            </View>
          </View>
          <Text className="mt-5 text-2xl font-bold leading-8 text-white">
            Your privacy matters.
          </Text>
          <Text className="mt-2 text-justify text-sm leading-6 text-white/75">
            Learn what information Sri Golds collects, why we use it, and the
            choices available to you when using our website, jewellery and
            gold-loan services.
          </Text>
          <View className="mt-5 flex-row items-center border-t border-white/15 pt-4">
            <Ionicons name="time-outline" size={16} color="#f2d58a" />
            <Text className="ml-2 text-xs font-medium text-white/75">
              Last updated  ·  10 November 2026
            </Text>
          </View>
        </View>

        <View className="mx-4 mt-4 flex-row rounded-2xl border border-[#ead8b6] bg-[#fff9eb] p-4">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#fff0cf]">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#a66b00"
            />
          </View>
          <Text className="ml-3 flex-1 self-center text-justify text-xs leading-5 text-[#665842]">
            This policy applies to information handled through the Sri Golds
            website and related shop services. It explains our current
            practices in plain language; the information requested depends on
            the service you use.
          </Text>
        </View>

        <View className="mb-3 mt-6 px-4">
          <Text className="text-xl font-bold text-[#153b2e]">
            Your information, explained
          </Text>
          <Text className="mt-1 text-justify text-sm leading-5 text-[#887c69]">
            Browse the ways we handle and protect your information.
          </Text>
        </View>

        <View className="gap-3 px-4">
          {POLICY_SECTIONS.map((section, index) => (
            <View
              key={section.title}
              className={`overflow-hidden rounded-2xl border bg-white ${
                expandedSection === index
                  ? 'border-[#c6d9cd] shadow-sm'
                  : 'border-[#eee5d7]'
              }`}
            >
              <Pressable
                className={`min-h-16 flex-row items-center px-4 py-4 ${
                  expandedSection === index
                    ? 'bg-[#f5f8f3]'
                    : 'bg-white'
                }`}
                onPress={() =>
                  setExpandedSection(current =>
                    current === index ? null : index,
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Toggle ${section.title}`}
                accessibilityState={{
                  expanded: expandedSection === index,
                }}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#e8f1eb]">
                  <Text className="text-xs font-extrabold text-[#08796a]">
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#a87418]">
                    Privacy section
                  </Text>
                  <Text className="mt-1 text-base font-bold text-[#153b2e]">
                    {section.title}
                  </Text>
                </View>
                <View
                  className={`ml-3 h-8 w-8 items-center justify-center rounded-full ${
                    expandedSection === index
                      ? 'bg-[#e2eee7]'
                      : 'bg-[#f7f4ed]'
                  }`}
                >
                  <Ionicons
                    name={
                      expandedSection === index
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={17}
                    color="#08796a"
                  />
                </View>
              </Pressable>
              {expandedSection === index ? (
                <View className="gap-3 border-t border-[#edf0e9] p-4">
                  {section.paragraphs.map(paragraph => (
                    <Text
                      key={paragraph}
                      className="text-justify text-[13px] leading-[22px] text-[#625b50]"
                    >
                      {paragraph}
                    </Text>
                  ))}
                  {section.bullets?.map(bullet => (
                    <View
                      key={bullet}
                      className="flex-row rounded-xl bg-[#faf9f5] px-3 py-2.5"
                    >
                      <View className="mr-3 mt-1.5 h-1.5 w-1.5 rounded-full bg-[#c39543]" />
                      <Text className="flex-1 text-justify text-xs leading-5 text-[#625b50]">
                        {bullet}
                      </Text>
                    </View>
                  ))}
                  {section.closing ? (
                    <Text className="border-l-2 border-[#d6b66d] pl-3 text-justify text-xs leading-5 text-[#776747]">
                      {section.closing}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <Pressable
          className="mx-4 mt-4 flex-row items-center rounded-2xl bg-[#073b2f] p-4 active:opacity-90"
          onPress={onContact}
          accessibilityRole="button"
          accessibilityLabel="Contact us about your privacy"
        >
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#f2d58a" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-white">
              Questions about your data?
            </Text>
            <Text className="mt-1 text-justify text-xs leading-5 text-white/70">
              Contact our team about your privacy or information.
            </Text>
          </View>
          <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-[#f2d58a]">
            <Ionicons name="arrow-forward" size={16} color="#073b2f" />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default UserPrivacyPolicy;
