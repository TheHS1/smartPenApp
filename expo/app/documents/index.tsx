import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import PagePreview from "@/components/PagePreview";
import { useIsFocused } from "@react-navigation/native";
import { getFiles } from "@/utils";
import { fileInfo } from "@/types";
import React from "react";

export default function Index() {
  const router = useRouter();
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
    router.push({ pathname: '/documents/[Main]', params: { fileName: file } })
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
        <View className="flex flex-row w-32 justify-end items-center">
          <TouchableOpacity onPress={updateAndRedirect} className="p-1">
            <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            router.push({ pathname: '/documents/Profile' })
          }} className="ml-4 p-1">
            <Ionicons name="person" size={28} color="#007AFF" />
          </TouchableOpacity>
        </View>
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
      className="w-full h-60 flex rounded-xl border border-[40]"
      activeOpacity={0.4}
    >
      <View className="h-32 relative flex-1 w-full overflow-hidden justify-center items-center">
        {fInfo.pages[0] && (fInfo.pages[0].annotations.length > 0 || fInfo.pages[0].penStrokes.length > 0) ? (
          <PagePreview paths={fInfo.pages[0]} />
        ) : (
          <Ionicons name="document-text-outline" size={64} color="#cccccc" />
        )
        }
      </View >
      <View className="flex flex-row items-center justify-between mt-2 bg-gray-100 rounded-xl px-4 py-4">
        <View className="flex-initial">
          <Text className="text-lg font-bold ">{title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => deleteFile(title)}
        >
          <Ionicons name="trash-outline" size={28} color="red" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity >
  );

  return (
    <View className="flex-1">
      {documents.size === 0 ? (
        <View className="flex-1 justify-center items-center p-5">
          <Ionicons name="folder-open-outline" size={64} color="#cccccc" />
          <Text className="text-2xl font-semibold text-gray-600 mt-2">No Documents Yet</Text>
          <Text className="text-gray-400 mt-8 text-center">Tap the '+' button in the top right corner to create your first document.</Text>
        </View>
      ) : (
        <View className="h-full w-full">
          <FlatList
            data={Array.from(documents)}
            renderItem={({ item }) => <Item title={item[0]} fInfo={item[1]} />}
            keyExtractor={item => item[0]}
            className="w-full flex-1"
            contentContainerStyle={{
              padding: 16, // Padding around the grid
              gap: 24, // gaps between rows
              width: '100%'
            }}
            numColumns={1}
          />
        </View>
      )
      }
    </View>
  )
}
