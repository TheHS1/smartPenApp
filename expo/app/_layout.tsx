import { Stack } from 'expo-router';
import React from 'react';
import "@/globals.css"

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Documents"
        }}
      />
      <Stack.Screen
        name="documents/index"
        options={{
          headerShown: true,
          title: "Documents"
        }}
      />
      <Stack.Screen
        name="documents/(tabs)"
        options={{
          headerShown: false,
          title: "Documents"
        }}
      />
    </Stack>
  )
}
