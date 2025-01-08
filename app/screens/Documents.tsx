import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system/next";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PagePreview from "../components/PagePreview";


export default function Documents() {
  interface fileInfo {
    name: string;
    numPages: number;
  }

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [documents, setDocuments] = useState<fileInfo[]>([]);

  useEffect(() => {
    const getFiles = async () => {
      const fileNames = await AsyncStorage.getItem('files')
      let files: fileInfo[] = [];
      if (fileNames) {
        files = JSON.parse(fileNames);
      }
      setDocuments(files)
    }

    getFiles().catch(console.error);
  }, [])

  const updateAndRedirect = async () => {
    // update CurFile
    const file: fileInfo = { name: 'untitled.ispen', numPages: 1 };
    try {
      await AsyncStorage.setItem('curFile', JSON.stringify(file))
    } catch (err) {
      console.warn(err);
    }

    const fileNames = await AsyncStorage.getItem('files')
    let files: fileInfo[] = [];
    if (fileNames) {
      files = JSON.parse(fileNames);
    }

    files.push(file)

    try {
      await AsyncStorage.setItem('files', JSON.stringify(files))
    } catch (err) {
      console.warn(err);
    }
    setDocuments(files)

    navigation.navigate('Editor' as never);
  }

  // set button action for menu button in header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={updateAndRedirect}>
          <Ionicons name="add-outline" size={36} color="blue" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right
      }}
      className="h-full w-full flex flex-row flex-wrap justify-center">
      {documents.map((document: fileInfo, index: number) => (
        <TouchableOpacity key={index} className="h-1/4 w-2/5 m-2 flex bg-gray-100 p-1">
          <View className="flex-1 w-full border bg-white">
            <PagePreview fileName={document.name} pageNum={0} />
          </View>
          <Text className="text-xs flex-initial font-bold">{document.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
