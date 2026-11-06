import { useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthenticatedUser } from '../Admin/Auth/Login';
import UserBottomNavigation, {
  type UserTab,
} from './components/UserBottomNavigation';
import UserHeader from './components/UserHeader';
import UserHome from './Home/UserHome';

type UserLayoutProps = {
  user: AuthenticatedUser;
  onLogout: () => void;
};

function UserLayout({ user, onLogout }: UserLayoutProps) {
  const [activeTab, setActiveTab] = useState<UserTab>('home');

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <UserHeader user={user} onLogout={onLogout} />
      <SafeAreaView className="flex-1 bg-[#fffaf0]" edges={['left', 'right']}>
        <View className="flex-1">
          {activeTab === 'home' ? (
            <UserHome user={user} />
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-xl font-bold text-primary-dark">
                {activeTab === 'enquiry' ? 'Enquiry' : 'More'}
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-600">
                This section is coming in the next step.
              </Text>
            </View>
          )}
          <UserBottomNavigation
            activeTab={activeTab}
            onSelect={setActiveTab}
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

export default UserLayout;
