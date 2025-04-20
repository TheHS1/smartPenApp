import { Ionicons } from "@expo/vector-icons";
import React, { ComponentType } from "react";
import { FC, useCallback, useState } from "react";
import { FlatList, ListRenderItemInfo, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import plugArray from "@/plugins/index";
import { annotation, pathInfo, textInfo } from "@/types";

export interface PlugInfo {
  title: string;
  description: string;
  enabled: boolean;
  Func: ComponentType;
}

interface PlugProps {
  visible: boolean;
  closeModal: () => void;
  annotations: annotation[];
}

type devLIProps = {
  item: ListRenderItemInfo<PlugInfo>;
}

const plugins: PlugInfo[] = plugArray();

const PlugLI: FC<devLIProps> = (props: devLIProps) => {
  const { item } = props;
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const descriptionHeight = useSharedValue<number>(0);
  const [enabled, setEnabled] = useState<boolean>(item.item.enabled);
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
    item.item.enabled = !item.item.enabled;
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
        <Text className="flex-1 text-base font-bold">{item.item.title}</Text>
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
            <item.item.Func />
          ) :
            <Text className="text-base text-gray-500">{item.item.description}</Text>
          }
        </ScrollView>
      </Animated.View>
    </View>
  );
}

export default function DeviceConnectionModal({ visible, closeModal, annotations }: PlugProps) {
  const [ocrData, setOcrData] = useState<String>("");
  const insets = useSafeAreaInsets();

  const getData = async () => {
    const jsonAnnotations = annotations.map(anno => {
      if ('text' in anno) {
        const textAnno = anno as textInfo;
        return {
          type: "text",
          data: textAnno.text,
          x: textAnno.x,
          y: textAnno.y,
          color: textAnno.color,
          strokeSize: textAnno.strokeSize
        }
      } else {
        const pathAnno = anno as pathInfo;
        return {
          type: "path",
          data: pathAnno.path,
          erase: pathAnno.erase,
          color: pathAnno.color,
          strokeSize: pathAnno.strokeSize
        }
      }
    });

    try {
      fetch("http://192.168.1.220:5000/process_svg", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "svgPaths": jsonAnnotations, "plugins": { "enabled": {} } })
      })
        .then(response => {
          return response.json();
        })
        .then(data => {
          setOcrData(data["ocr_results"]);
        })
    } catch (error) {
      console.error(error);
    }
  };

  const renderListItem = useCallback(
    (item: ListRenderItemInfo<PlugInfo>) => {
      return (
        <PlugLI
          item={item}
        />
      );
    },
    []
  );

  return (
    <Modal
      animationType="slide"
      visible={visible}
    >
      <SafeAreaView
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        <View
          className="m-4 h-full flex"
        >
          <Text className="flex-initial text-3xl text-center">Available Plugins</Text>
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
            data={plugins}
            renderItem={renderListItem}
            className="flex-1 pt-2"
          />
        </View>
      </SafeAreaView>
    </Modal>
  )
}
