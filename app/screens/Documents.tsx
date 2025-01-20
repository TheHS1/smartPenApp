import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PagePreview from "../components/PagePreview";
import { useIsFocused } from "@react-navigation/native";
import { getFiles } from "../utils";
import { fileInfo } from "../types";

export default function Documents() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [documents, setDocuments] = useState<Map<string, fileInfo>>(new Map());
  const focused = useIsFocused();

  useEffect(() => {
    getFiles()
      .then(setDocuments)
      .catch(console.error);
  }, [focused])

  const updateAndRedirect = async () => {
    const files = documents;

    let i: number = 0;
    while (files.has(`untitled${i}.ispen`)) {
      i++;
    }
    const fileName: string = `untitled${i}.ispen`;
    const newFile: fileInfo = { pages: [] };

    files.set(fileName, newFile);

    try {
      await AsyncStorage.setItem('files', JSON.stringify(Array.from(files.entries())));
    } catch (err) {
      console.warn(err);
    }
    setDocuments(files)

    navigation.navigate('Editor', { fileName: fileName });
  }

  const openFile = async (file: string) => {
    // pass file name to annotation component
    navigation.navigate('Editor', { fileName: file });
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
      {Array.from(documents).map(([name, data], index) => (
        <TouchableOpacity onPress={() => openFile(name)} key={index} className="h-1/4 w-2/5 m-2 flex bg-gray-100 p-1">
          <View className="flex-1 w-full border bg-white">
            <PagePreview paths={data.pages[0]} />
          </View>
          <Text className="text-xs flex-initial font-bold">{name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
