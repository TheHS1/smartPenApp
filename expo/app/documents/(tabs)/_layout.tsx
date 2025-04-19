import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from "react";
import { TouchableOpacity } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        sceneStyle: {
          backgroundColor: '#fff'
        },
      }}
    >
      <Tabs.Screen
        name="[Main]"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="pencil" size={size} color={color} />,
          title: "Editor",
          headerRight: () => (
            <TouchableOpacity>
              <Ionicons name="add-outline" size={36} color="blue" />
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />
        }}
      />
    </Tabs>
  );
}
