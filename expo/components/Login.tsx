import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Image,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import {
  GoogleSignin,
  statusCodes,
  User,
  isSuccessResponse,
  isErrorWithCode
} from '@react-native-google-signin/google-signin';

GoogleSignin.configure();

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState<{ userInfo: User } | null>();

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        setUserInfo({ userInfo: response.data });
        router.navigate("/documents");
      } else {
        // sign in was cancelled by user
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            // operation (eg. sign in) already in progress
            break;
          default:
          // some other error happened
        }
      } else {
        // an error that's not related to google sign in occurred
      }
    }
  }

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setError("");

    try {
      // Placeholder for authentication logic (replace with actual API call)
      const isAuthenticated = username === "intellisync" && password === "Universe123"; // Replace with real authentication logic
      if (isAuthenticated || userInfo != null) {
        router.navigate("/documents");
      } else {
        Alert.alert("Login Failed", "Invalid username or password.");
      }
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1" edges={['left', 'right']}>
      <ImageBackground
        source={require("@/assets/images/background.png")}
        resizeMode="cover"
        className="flex-1"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 items-center justify-center px-6"
        >
          <View className="w-full bg-white p-6 rounded-2xl shadow-lg">
            <View className="flex items-center justify-center mb-10">
              <Image
                source={require("@/assets/images/logo.png")}
                resizeMode="contain"
                className="w-full h-24"
              />
            </View>

            {error ? (
              <Text className="text-red-500 text-center mb-2">{error}</Text>
            ) : null}

            <TextInput
              className="bg-gray-100 p-3 rounded-lg border border-gray-300 mb-3 text-base"
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              className="bg-gray-100 p-3 rounded-lg border border-gray-300 mb-3 text-base"
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View className="flex flex-row">
              <TouchableOpacity
                onPress={handleLogin}
                className="bg-blue-500 py-3 rounded-lg mt-2 flex-1"
              >
                <Text className="text-white text-center text-base font-semibold">
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => signIn()}
                className="p-1 pl-2 rounded-lg mt-2 flex items-center justify-center flex-initial"
              >
                <Image
                  source={require("@/assets/images/google.png")}
                  resizeMode="contain"
                  className="w-12 h-12"
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}
