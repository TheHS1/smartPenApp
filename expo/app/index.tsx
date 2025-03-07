import { NativeWindStyleSheet } from "nativewind";
import { NavigationContainer, NavigationIndependentTree } from "@react-navigation/native";
import StackNavigator from "./StackNavigator"
import { SafeAreaProvider } from "react-native-safe-area-context";

NativeWindStyleSheet.setOutput({
  default: "native",
});

export default function Index() {
  return (
    <SafeAreaProvider>
      <NavigationIndependentTree>
        <NavigationContainer>
          <StackNavigator />
        </NavigationContainer>
      </NavigationIndependentTree>
    </SafeAreaProvider>
  );
}
