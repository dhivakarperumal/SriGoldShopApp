import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { AuthenticatedUser } from '../../Admin/Auth/Login';
import { EnquiryForm } from './EnquiryForm';

type UserEnquiryProps = {
  user: AuthenticatedUser;
};

function UserEnquiry({ user }: UserEnquiryProps) {
  return (
    <View className="flex-1 bg-slate-50">
      {/* Page header */}
      <View className="border-b border-[#d9b568]/40 bg-white px-4 py-4">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#003B2D]">
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"
                stroke="#fff"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View>
            <Text className="text-base font-extrabold text-[#1a1a1a]">
              Enquiry
            </Text>
            <Text className="text-[11px] text-slate-500">
              We'll get back to you shortly
            </Text>
          </View>
        </View>
      </View>

      {/* Shared form — no product pre-fill */}
      <EnquiryForm user={user} />
    </View>
  );
}

export default UserEnquiry;
