import { Text, View } from 'react-native';
import type { AuthenticatedUser } from '../Auth/Login';

function Profile({ user }: { user: AuthenticatedUser }) {
  return (
    <View className="flex-1 bg-background px-5 py-6">
      <Text className="text-xl font-semibold text-primary-dark">Profile</Text>
      <View className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <Text className="text-sm text-muted">Name</Text>
        <Text className="mt-1 text-base font-medium text-slate-800">
          {user.name || 'Not provided'}
        </Text>
        <Text className="mt-4 text-sm text-muted">Email</Text>
        <Text className="mt-1 text-base font-medium text-slate-800">
          {user.email || 'Not provided'}
        </Text>
        <Text className="mt-4 text-sm text-muted">Role</Text>
        <Text className="mt-1 text-base font-medium capitalize text-slate-800">
          {user.role}
        </Text>
      </View>
    </View>
  );
}

export default Profile;
