import { NativeWindStyleSheet } from "nativewind";
import { NavigationContainer, NavigationIndependentTree } from "@react-navigation/native";
import StackNavigator from "./StackNavigator"

NativeWindStyleSheet.setOutput({
  default: "native",
});

export default function Index() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <StackNavigator />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
