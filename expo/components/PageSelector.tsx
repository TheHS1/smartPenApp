import { Text, TouchableOpacity, View } from "react-native";
import { FlatList, GestureHandlerRootView } from "react-native-gesture-handler";
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import PagePreview from "./PagePreview";
import Reanimated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { annotation, fileInfo } from "../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface pageSelectorProps {
  deviceConnected: boolean;
  fInfo: fileInfo;
  addPage: () => void;
  changePage: (page: number) => void;
  deletePage: (page: number) => void;
}

export default function PageSelector({ deviceConnected, fInfo, addPage, changePage, deletePage }: pageSelectorProps) {
  const insets = useSafeAreaInsets();

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
    page: annotation[];
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
    <View
      className="w-2/6 h-full flex-initial flex bg-gray-100"
      style={{ paddingBottom: insets.bottom }}
    >
      {deviceConnected ? (
        <View className="m-2 flex">
          <View className="text-center flex flex-row w-full items-center ml-0.5">
            <View
              className="flex-initial"
              style={{ width: 12, height: 12, borderRadius: 12, backgroundColor: 'green' }}
            />
            <Text className="w-full text-sm font-semibold flex-1 ml-2">Pen Connected</Text>
          </View>
          <View className="text-center flex flex-row w-full items-center">
            <Ionicons name="checkmark-circle" size={16} color="red" />
            <Text className="w-full text-sm font-semibold flex-1 ml-2">Synced</Text>
          </View>
        </View>
      ) : (
        <View className="m-2 flex">
          <View className="text-center flex flex-row w-full items-center ml-0.5">
            <View
              className="flex-initial"
              style={{ width: 12, height: 12, borderRadius: 12, backgroundColor: 'red' }}
            />
            <Text className="w-full text-sm font-semibold flex-1 ml-2">Not Connected</Text>
          </View>
          <View className="text-center flex flex-row w-full items-center">
            <Ionicons name="checkmark-circle" size={16} color="blue" />
            <Text className="w-full text-sm font-semibold flex-1 ml-2">Synced</Text>
          </View>
        </View>
      )
      }
      <GestureHandlerRootView>
        <FlatList
          data={fInfo.pages}
          renderItem={({ item, index }) => <Item index={index} page={item} />}
          className="flex flex-1"
          keyExtractor={(_, index) => String(index)}
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

