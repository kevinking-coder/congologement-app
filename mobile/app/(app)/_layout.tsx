import { Stack } from 'expo-router';
import { CurrencyProvider } from '@/src/lib/currency-context';

export default function AppLayout() {
  return (
    <CurrencyProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="listing/[id]" />
        <Stack.Screen name="legal" />
      </Stack>
    </CurrencyProvider>
  );
}
