import { useLocalSearchParams } from 'expo-router';
import { AccountHome } from '@/components/account-home';

export default function AdminScreen() {
  const { name, email } = useLocalSearchParams<{ name?: string; email?: string }>();
  return <AccountHome name={name} email={email} admin />;
}
