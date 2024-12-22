import { useNavigation } from "expo-router";
import { Button, Image, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
    const navigation = useNavigation();
    return (
      <SafeAreaView className="flex h-full w-full">
              <Image className="m-auto w-4/5 h-auto" resizeMode={"contain"} source={require('@/assets/images/logo.png')}/>
          <View className="flex-1 items-center">
              <Text className="my-5 text-3xl">Login</Text>
                  <TextInput placeholder="Enter your username" className="mb-3 bg-gray-100 p-2 border-2 w-4/5"></TextInput>
                  <TextInput placeholder="Enter your password" className="bg-gray-100 p-2 border-2 w-4/5"></TextInput>
          </View>
          <Button onPress={() => navigation.navigate("Main")} title="Login"/>
      </SafeAreaView>
    )
}

