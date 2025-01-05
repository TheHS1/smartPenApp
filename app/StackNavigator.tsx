import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Login from "./screens/Login";
import Profile from "./screens/Profile";
import Settings from "./screens/Settings";
import Main from "./screens/Main";
import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity } from "react-native";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function StackNavigator() {

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: '#fff' },
        headerShown: false
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen
        name="Main"
        component={TabNavigator}
      />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Settings" component={Settings} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Annotation"
      screenOptions={{
        sceneStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tab.Screen
        name="Annotation"
        component={Main}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="pencil" size={size} color={color} />,
          headerLeft: () => (
            <TouchableOpacity>
              <Ionicons name="menu" size={36} color="blue" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />
        }}
      />
    </Tab.Navigator>
  )
}
