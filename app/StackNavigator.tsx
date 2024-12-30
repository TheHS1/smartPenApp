import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Login from "./screens/Login";
import Profile from "./screens/Profile";
import Settings from "./screens/Settings";
import Main from "./screens/Main";
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Main" component={TabNavigator} />
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
        headerShown: false,
      }}
    >
      <Tab.Screen name="Annotation" component={Main} />
      <Tab.Screen name="Profile" component={Settings} />
    </Tab.Navigator>
  )
}
