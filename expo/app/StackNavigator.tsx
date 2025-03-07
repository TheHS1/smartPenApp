import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Login from "./screens/Login";
import Profile from "./screens/Profile";
import Settings from "./screens/Settings";
import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity } from "react-native";
import Documents from "./screens/Documents";
import Main from "./screens/Main";

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
      initialRouteName="Annotations"
      screenOptions={{
        sceneStyle: { backgroundColor: '#fff' },
        headerShown: false
      }}
    >
      <Tab.Screen
        name="Annotations"
        component={MainNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="pencil" size={size} color={color} />,
          headerRight: () => (
            <TouchableOpacity>
              <Ionicons name="add-outline" size={36} color="blue" />
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

function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: '#fff' },
        headerShown: true
      }}
    >
      <Stack.Screen name="Documents" component={Documents} />
      <Stack.Screen name="Editor" component={Main} />
    </Stack.Navigator>
  )
}
