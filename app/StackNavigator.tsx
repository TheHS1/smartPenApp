import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "./screens/Login";
import Profile from "./screens/Profile";
import Settings from "./screens/Settings";
import Main from "./screens/Main";
const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Main" component={Main} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Settings" component={Settings} />
    </Stack.Navigator>
  );
}
