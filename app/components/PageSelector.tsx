import { Text, TouchableOpacity, View } from "react-native";
import { FlatList, GestureHandlerRootView } from "react-native-gesture-handler";
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import PagePreview from "./PagePreview";
import Reanimated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { fileInfo, pathInfo } from "../types";

interface pageSelectorProps {
  fInfo: fileInfo;
  addPage: () => void;
  changePage: (page: number) => void;
  deletePage: (page: number) => void;
}

export default function PageSelector({ fInfo, addPage, changePage, deletePage }: pageSelectorProps) {

  let row: Array<any> = [];
  const closeRow = (index: number) => {
    setTimeout(() => {
      if (row[index]) {
        row[index].close();
      }
    }, 2000)
  };

  function RightAction(prog: SharedValue<number>, drag: SharedValue<number>, pageNum: number) {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 25 }],
      };
    });

    return (
      <Reanimated.View className="flex items-center justify-center" style={styleAnimation}>
        <TouchableOpacity onPress={() => deletePage(pageNum)}>
          <Ionicons name="close-outline" size={24} color="red" />
        </TouchableOpacity>
      </Reanimated.View>
    );
  }

  interface itemProps {
    index: number;
    page: pathInfo[];
  }

  const Item = ({ index, page }: itemProps) => (
    <ReanimatedSwipeable
      onSwipeableOpen={() => closeRow(index)}
      ref={ref => (row[index] = ref)}
      friction={2}
      leftThreshold={0}
      enableTrackpadTwoFingerGesture
      renderRightActions={(progress, drag) => RightAction(progress, drag, index)}
      containerStyle={{ flexDirection: "row", flex: 1, height: 150, padding: 4 }}
      childrenContainerStyle={{ flex: 1 }}
    >
      <View className="flex flex-row">
        <Text className="p-1">{index + 1}</Text>
        <TouchableOpacity
          className="flex-1 border bg-white"
          onPress={() => changePage(index)}
        >
          <PagePreview paths={page} />
        </TouchableOpacity>
      </View>
    </ReanimatedSwipeable>
  );

  return (
    <View className="w-2/6 h-full flex-initial flex bg-gray-100">

      <GestureHandlerRootView>
        <FlatList
          data={fInfo.pages}
          renderItem={({ item, index }) => <Item index={index} page={item} />}
          className="flex flex-1"
        />
      </GestureHandlerRootView>

      <TouchableOpacity className="flex-initial" onPress={addPage}>
        <Text className="text-center bg-gray-300 p-2 m-2 text-white">
          +
        </Text>
      </TouchableOpacity>
    </View>
  )
}

