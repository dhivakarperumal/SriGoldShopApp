import { Text, View } from 'react-native';
import type { AuthenticatedUser } from '../Auth/Login';

type HomeProps = {
  user: AuthenticatedUser;
};

function Home({ user }: HomeProps) {
  return (
    <View className="flex-1 bg-background px-5 py-6">
      <View className="rounded-2xl border border-border bg-surface p-5">
        <Text className="text-xl font-semibold text-primary-dark">
          Admin Dashboard
        </Text>
        <Text className="mt-2 text-sm text-muted">
          {user.name ? `Welcome, ${user.name}.` : 'Welcome back.'}
        </Text>
      </View>
    </View>
  );
}

export default Home;