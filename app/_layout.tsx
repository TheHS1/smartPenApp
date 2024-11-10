import { Stack } from "expo-router";

export default function RootLayout() {
  return (
      <Stack
      screenOptions={{
          headerStyle: {
              backgroundColor: '#ed9107',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
              fontWeight: 'bold',
          },
      }}>
      </Stack>
  );
}
