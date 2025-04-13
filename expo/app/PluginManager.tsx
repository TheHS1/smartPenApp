import { Ionicons } from "@expo/vector-icons";
import React, { ComponentType, useEffect } from "react";
import { FC, useCallback, useState } from "react";
import { FlatList, Image, ListRenderItemInfo, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import plugArray from "./plugins/index";
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as FileSystem from 'expo-file-system';

export interface PlugInfo {
  title: string;
  description: string;
  enabled: boolean;
  Func: ComponentType;
}

export interface PlugAndAnno {
  plug: PlugInfo;
  canvasSnap: () => Promise<boolean>;
}

interface PlugProps {
  visible: boolean;
  closeModal: () => void;
  canvasSnap: () => Promise<boolean>;
}

type devLIProps = {
  item: ListRenderItemInfo<PlugAndAnno>;
}

const plugins: PlugInfo[] = plugArray();

const PlugLI: FC<devLIProps> = (props: devLIProps) => {
  const { item } = props;
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const descriptionHeight = useSharedValue<number>(0);
  const [enabled, setEnabled] = useState<boolean>(item.item.plug.enabled);
  const [showSettings, setShowSettings] = useState<boolean>();

  // Update height based on whether the description is shown or not
  if (showDescription) {
    descriptionHeight.value = withTiming(125, { duration: 300 }); // Set height gradually to 120 when shown
  } else {
    descriptionHeight.value = withTiming(0, { duration: 300 }); // Set height gradually back to 0 when collapsed
  }

  // Use animated style to apply the height change to the description Text
  const animatedDescriptionStyle = useAnimatedStyle(() => {
    return {
      height: descriptionHeight.value,
      overflow: 'hidden',
    };
  });

  const toggleEnabled = () => {
    setEnabled(!enabled);
    item.item.plug.enabled = !item.item.plug.enabled;
    setShowSettings(false);
  }

  return (
    <View
      className="border border-blue-500 rounded-lg my-3 p-3 flex"
    >
      <View
        className="flex flex-row items-center justify-center"
      >
        <TouchableOpacity className="flex-initial p-2" onPress={() => setShowDescription(!showDescription)}>
          <Ionicons name={showDescription ? "chevron-down-outline" : "chevron-forward-outline"} size={18} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-base font-bold">{item.item.plug.title}</Text>
        {(enabled && showDescription) && (
          <TouchableOpacity
            className="flex-initial"
            onPress={() => setShowSettings(!showSettings)}
          >
            <Ionicons name="create-outline" size={36} color="gray" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="flex-initial"
          onPress={toggleEnabled}
        >
          <Ionicons name={enabled ? "checkmark-outline" : "close-outline"} size={36} color={enabled ? "green" : "red"} />
        </TouchableOpacity>
      </View>
      <Animated.View style={animatedDescriptionStyle}>
        <ScrollView>
          {showSettings ? (
            <item.item.plug.Func />
          ) :
            <Text className="text-base text-gray-500">{item.item.plug.description}</Text>
          }
        </ScrollView>
      </Animated.View>
    </View>
  );
}

export default function DeviceConnectionModal({ visible, closeModal, canvasSnap }: PlugProps) {
  const [ocrData, setOcrData] = useState<String>("");


  const getData = async () => {
    const saved = await canvasSnap();
    if (saved) {
      try {
        const path = FileSystem.documentDirectory + 'canvas.png';
        const result = await TextRecognition.recognize(path);
        setOcrData(result.text);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const renderListItem = useCallback(
    (item: ListRenderItemInfo<PlugAndAnno>) => {
      return (
        <PlugLI
          item={item}
        />
      );
    },
    []
  );

  const listData = () => {
    let data: PlugAndAnno[] = [];
    for (let plugin of plugins) {
      data.push({ plug: plugin, canvasSnap: canvasSnap })
    }
    return data;
  }

  return (
    <Modal
      animationType="slide"
      visible={visible}
    >
      <SafeAreaView>
        <View
          className="m-4 h-full flex"
        >
          <Text className="flex-initial text-3xl">Available Plugins</Text>
          <TouchableOpacity
            className="flex-initial pt-2"
            onPress={closeModal}>
            <Text>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-initial pt-2"
            onPress={getData}>
            <Text>getData</Text>
          </TouchableOpacity>
          <Text>{ocrData}</Text>
          <FlatList
            data={listData()}
            renderItem={renderListItem}
            className="flex-1 pt-2"
          />
        </View>
      </SafeAreaView>
    </Modal>
  )
}
