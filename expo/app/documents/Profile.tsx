import { View, Text, TouchableOpacity } from "react-native"
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from "expo-router";

export default function Profile() {

  const router = useRouter();

  return (
    <View
      className="flex">
      <View className="border border-gray-300 flex-initial flex flex-row items-center p-4">
        <Ionicons className="flex-initial" name="person-circle" size={72} color={"blue"} />
        <View className="flex-initial justify-center">
          <Text className="text-lg text-blue-500 mb-1">First Last</Text>
          <Text>email@email.com</Text>
        </View>
      </View>
      <TouchableOpacity className="border border-gray-300 flex-initial px-4 py-8">
        <Text className="text-lg text-blue-500">Manage Connected Devices</Text>
      </TouchableOpacity>
      <TouchableOpacity className="border border-gray-300 flex-initial px-4 py-8"
        onPress={() => {
          router.push({ pathname: '/documents/PluginSettings' })
        }}
      >
        <Text className="text-lg text-blue-500">Plugin Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity className="border border-gray-300 flex-initial px-4 py-8">
        <Text className="text-lg text-blue-500">About</Text>
      </TouchableOpacity>
    </View>
  )

}
