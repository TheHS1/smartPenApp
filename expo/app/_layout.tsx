import { Stack, router } from 'expo-router';
import React from 'react';
import "@/globals.css"
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsProvider } from '@/components/SettingsContent';

export default function StackLayout() {
  return (
    <SettingsProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#fff' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            title: "Login"
          }}
        />
        <Stack.Screen
          name="documents/index"
          options={{
            headerShown: true,
            title: "Documents",
            headerTitle: "",
            headerRight: () => (
              <View>
                <TouchableOpacity className='p-1'>
                  <Ionicons name="person" size={28} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity className='p-1'>
                  <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Stack.Screen
          name="documents/Profile"
          options={{
            headerShown: true,
            title: "Profile",
          }}
        />
        <Stack.Screen
          name="documents/PluginSettings"
          options={{
            headerTitle: 'Plugin Settings',
            headerShown: true,
            title: "Profile",
          }}
        />
        <Stack.Screen
          name="documents/[Main]"
          options={{
            headerTitle: '',
            headerBackButtonDisplayMode: 'minimal',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => {
                  router.push({ pathname: '/documents/Profile' })
                }}
              >
                <Ionicons name="person" size={28} color="#007AFF" />
              </TouchableOpacity>
            ),
          }}
        />
      </Stack>
    </SettingsProvider>
  )
}
