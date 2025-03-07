import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
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

  useEffect(() => {
    const saveFile = async () => {
      try {
        await AsyncStorage.setItem('files', JSON.stringify(Array.from(documents.entries())));
      } catch (err) {
        console.warn(err);
      }
    }
    saveFile();
  }, [documents])

  const updateAndRedirect = () => {
    setDocuments(map => {
      let i: number = 0;
      while (map.has(`untitled${i}.ispen`)) {
        i++;
      }
      const fileName = `untitled${i}.ispen`;
      const newFile: fileInfo = { pages: [] };
      return new Map(map.set(fileName, newFile))
    });
  }

  const openFile = async (file: string) => {
    // pass file name to annotation component
    navigation.navigate('Editor', { fileName: file });
  }

  const deleteFile = async (file: string) => {
    const newMap = new Map(documents);
    newMap.delete(file);
    setDocuments(newMap);
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

  interface itemProps {
    title: string;
    fInfo: fileInfo;
  }

  const Item = ({ title, fInfo }: itemProps) => (
    <TouchableOpacity
      onPress={() => openFile(title)}
      className="h-40 w-full m-2 p-1 flex bg-gray-100"
      style={{ flexBasis: '30%' }} // Ensures 3 items per row
    >
      <View className="relative flex-1 w-full border bg-white">
        <PagePreview paths={fInfo.pages[0]} />
      </View >
      <View className="flex flex-row">
        <Text className="text-xs flex-initial font-bold">{title}</Text>
        <TouchableOpacity
          onPress={() => deleteFile(title)}
        >
          <Ionicons name="trash-outline" size={28} color="red" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity >
  );

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right
      }}
      className="h-full w-full">
      <FlatList
        data={Array.from(documents)}
        renderItem={({ item }) => <Item title={item[0]} fInfo={item[1]} />}
        keyExtractor={item => item[0]}
        className="w-full h-full"
        contentContainerStyle={{ alignItems: "center" }}
        numColumns={3}
      />
    </View>
  )
}
