import { View } from 'react-native';

function HomeSkeleton({ className = '' }: { className?: string }) {
  return (
    <View
      className={`rounded-md ${className || 'bg-[#e8dfd0]'}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export default HomeSkeleton;