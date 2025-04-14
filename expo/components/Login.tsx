import { useState } from "react";
import { useRouter } from "expo-router";
import { Button, Image, Text, TextInput, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setError(""); // Clear previous errors

    try {
      // Placeholder for authentication logic (replace with actual API call)
      const isAuthenticated = username === "intellisync" && password === "Universe123"; // Replace with real authentication logic
      if (isAuthenticated) {
        router.navigate("/documents");
      } else {
        Alert.alert("Login Failed", "Invalid username or password.");
      }
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex h-full w-full">
      <Image
        className="m-auto w-4/5 h-auto"
        resizeMode={"contain"}
        source={require("@/assets/images/logo.png")}
      />
      <View className="flex-1 items-center">
        <Text className="my-5 text-3xl">Login</Text>

        {error ? <Text className="text-red-500">{error}</Text> : null}

        <TextInput
          placeholder="Enter your username"
          className="mb-3 bg-gray-100 p-2 border-2 w-4/5"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Enter your password"
          className="bg-gray-100 p-2 border-2 w-4/5"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>
      <Button onPress={handleLogin} title="Login" />
    </SafeAreaView>
  );
}
