import { Pressable, ScrollView, Text, View } from 'react-native';
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
        <View className="m-4 rounded-2xl bg-[#003b2d] p-5">
          <View className="flex-row items-center">
            <Ionicons name="shield-checkmark-outline" size={21} color="#f2d58a" />
            <Text className="ml-2 text-xs font-bold uppercase tracking-wider text-[#f2d58a]">
              Privacy at Sri Golds
            </Text>
          </View>
          <Text className="mt-3 text-sm leading-6 text-white/85">
            Learn what information Sri Golds collects, why we use it, and the
            choices available to you when using our website, jewellery and
            gold-loan services.
          </Text>
          <Text className="mt-4 text-xs leading-5 text-white/65">
            Last updated: 10 November 2026
          </Text>
        </View>

        <View className="mx-4 mb-4 flex-row rounded-xl border border-[#ead8b6] bg-white p-4">
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#a66b00"
          />
          <Text className="ml-3 flex-1 text-xs leading-5 text-[#665842]">
            This policy applies to information handled through the Sri Golds
            website and related shop services. It explains our current
            practices in plain language; the information requested depends on
            the service you use.
          </Text>
        </View>

        <View className="gap-3 px-4">
          {POLICY_SECTIONS.map((section, index) => (
            <View
              key={section.title}
              className="rounded-2xl border border-[#eee3d0] bg-white p-4"
            >
              <View className="mb-3 flex-row items-center">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-[#fff4d9]">
                  <Text className="text-xs font-bold text-[#a66b00]">
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
                <Text className="ml-3 flex-1 text-lg font-bold text-[#153b2e]">
                  {section.title}
                </Text>
              </View>
              <View className="gap-3">
                {section.paragraphs.map(paragraph => (
                  <Text
                    key={paragraph}
                    className="text-sm leading-6 text-[#625b50]"
                  >
                    {paragraph}
                  </Text>
                ))}
                {section.bullets?.map(bullet => (
                  <View key={bullet} className="flex-row pl-1">
                    <Text className="mr-2 text-sm leading-6 text-[#c39543]">
                      {'\u2022'}
                    </Text>
                    <Text className="flex-1 text-sm leading-6 text-[#625b50]">
                      {bullet}
                    </Text>
                  </View>
                ))}
                {section.closing ? (
                  <Text className="text-sm leading-6 text-[#625b50]">
                    {section.closing}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <Pressable
          className="mx-4 mt-4 flex-row items-center rounded-2xl border border-[#dce7dc] bg-[#f2f7f1] p-4"
          onPress={onContact}
          accessibilityRole="button"
          accessibilityLabel="Contact us about your privacy"
        >
          <Text className="flex-1 text-sm leading-6 text-[#45594b]">
            To ask a privacy question or make a request about your information,
            contact our team.
          </Text>
          <Ionicons name="arrow-forward" size={19} color="#174a38" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default UserPrivacyPolicy;
