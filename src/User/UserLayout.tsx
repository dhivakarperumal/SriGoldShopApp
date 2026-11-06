import { useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthenticatedUser } from '../Admin/Auth/Login';
import UserBottomNavigation, {
  type UserTab,
} from './components/UserBottomNavigation';
import UserHeader from './components/UserHeader';
import UserExplore from './Explore/UserExplore';
import UserHome from './Home/UserHome';
import UserAbout from './More/About/UserAbout';
import UserContact from './More/Contact/UserContact';
import MoreMenu, { type MorePage } from './More/MoreMenu';
import UserProfile from './Profile/UserProfile';
import UserProductDetails from './ProductDetails/UserProductDetails';

type UserLayoutProps = {
  user: AuthenticatedUser;
  onUserUpdated: (user: AuthenticatedUser) => void;
  onLogout: () => void;
};

function UserLayout({ user, onUserUpdated, onLogout }: UserLayoutProps) {
  const [activeTab, setActiveTab] = useState<UserTab>('home');
  const [morePage, setMorePage] = useState<MorePage>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectTab = (tab: UserTab) => {
    setActiveTab(tab);
    setSelectedProductId(null);
    if (tab !== 'more' || activeTab === 'more') setMorePage(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar barStyle="light-content" />
      <UserHeader
        user={user}
        onLogout={onLogout}
        onOpenProfile={() => {
          setActiveTab('more');
          setSelectedProductId(null);
          setMorePage('profile');
        }}
      />
      <SafeAreaView className="flex-1 bg-[#fffaf0]" edges={['left', 'right']}>
        <View className="flex-1">
          {selectedProductId ? (
            <UserProductDetails
              productId={selectedProductId}
              onBack={() => setSelectedProductId(null)}
            />
          ) : activeTab === 'home' ? (
            <UserHome
              user={user}
              onSelectProduct={setSelectedProductId}
            />
          ) : activeTab === 'explore' ? (
            <UserExplore onSelectProduct={setSelectedProductId} />
          ) : activeTab === 'more' ? (
            morePage === 'about' ? (
              <UserAbout onBack={() => setMorePage(null)} />
            ) : morePage === 'contact' ? (
              <UserContact onBack={() => setMorePage(null)} />
            ) : morePage === 'profile' ? (
              <UserProfile
                user={user}
                onUserUpdated={onUserUpdated}
                onBack={() => setMorePage(null)}
                onLogout={onLogout}
              />
            ) : (
              <MoreMenu onSelect={setMorePage} />
            )
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-xl font-bold text-primary-dark">
                Enquiry
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-600">
                This section is coming in the next step.
              </Text>
            </View>
          )}
          <UserBottomNavigation
            activeTab={activeTab}
            onSelect={selectTab}
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

export default UserLayout;
