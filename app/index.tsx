import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NativeWindStyleSheet } from "nativewind";

NativeWindStyleSheet.setOutput({
  default: "native",
});

export default function Index() {
  return (
      <SafeAreaView className="flex h-full w-full bg-blue-100 py-0 m-0">
          <View className="bg-red-200 h-full w-full py-0 m-0">
          </View>
      </SafeAreaView>
  );
}
