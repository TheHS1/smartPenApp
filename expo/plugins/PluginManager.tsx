import { Ionicons } from "@expo/vector-icons";
import React, { ComponentType, useEffect, useMemo } from "react";
import { FC, useCallback, useState } from "react";
import { FlatList, ListRenderItemInfo, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import plugArray from "@/plugins/index";
import { annotation, page, pathInfo, textInfo } from "@/types";
import { SkRect, Skia } from "@shopify/react-native-skia";

export interface PlugInfo {
  title: string;
  description: string;
  enabled: boolean;
  Func: ComponentType<{ data: {} }>;
  dependencies?: string[];
}

interface PlugProps {
  visible: boolean;
  closeModal: () => void;
  annotations: page;
}

type devLIProps = {
  item: ListRenderItemInfo<PlugInfo>;
  data: {};
}

const plugins: PlugInfo[] = plugArray();

const PlugLI: FC<devLIProps> = ({ item, data }: devLIProps) => {

  return (
    <View
      className="border rounded-lg my-3 p-3 flex"
      style={{ borderColor: "#dddddd" }}
    >
      <ScrollView>
        <View>
          <View className="flex flex-row">
            <Text className="font-semibold text-xl flex-1 mb-2"
              style={{
                color: "#f97316"
              }}
            >
              {item.item.title}
            </Text>
          </View>
          <item.item.Func data={data} />
        </View>
      </ScrollView>
    </View>
  );
}

export default function PluginManager({ visible, closeModal, annotations }: PlugProps) {
  const [plugData, setPlugData] = useState<{}>({});
  const [ocrData, setOcrData] = useState<{ labels: string[], quadBoxes: number[] }>({ labels: [], quadBoxes: [] });
  const [ocrEdited, setOcrEdited] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const padding = 500;

  const jsonAnnotations = useMemo(() => {
    let maxBounds = { minx: 0, miny: 0, width: 0, height: 0 };

    const allAnnotations = [
      ...annotations.annotations,
      ...annotations.penStrokes
    ]

    const jsonAnno = allAnnotations.map(anno => {
      let bounds: SkRect;

      // calculuate bounds across all elements to send to region to ocr
      if ('text' in anno) {
        const textAnno = anno as textInfo;
        const paragraph = makeParagraph(textAnno.text, textAnno.color, textAnno.strokeSize);
        paragraph.layout(300);
        bounds = { x: textAnno.x, y: textAnno.y, width: paragraph.getLongestLine(), height: paragraph.getHeight() }
        if (bounds.x < maxBounds.minx) {
          maxBounds.minx = bounds.x;
        }
        if (bounds.x + bounds.width > maxBounds.minx + maxBounds.width) {
          maxBounds.width = bounds.x + bounds.width - maxBounds.minx;
        }
        if (bounds.y < maxBounds.miny) {
          maxBounds.miny = bounds.y;
        }
        if (bounds.y + bounds.height > maxBounds.miny + maxBounds.height) {
          maxBounds.height = bounds.y + bounds.height - maxBounds.minx;
        }
        return {
          type: "text",
          data: textAnno.text,
          x: textAnno.x,
          y: textAnno.y,
          color: textAnno.color,
          strokeSize: textAnno.strokeSize,
          bounds: bounds
        }
      } else {
        const pathAnno = anno as pathInfo;
        bounds = Skia.Path.MakeFromSVGString(pathAnno.path)?.getBounds() ?? { x: 0, y: 0, height: 0, width: 0 };
        if (bounds.x < maxBounds.minx) {
          maxBounds.minx = bounds.x;
        }
        if (bounds.x + bounds.width > maxBounds.minx + maxBounds.width) {
          maxBounds.width = bounds.x + bounds.width - maxBounds.minx;
        }
        if (bounds.y < maxBounds.miny) {
          maxBounds.miny = bounds.y;
        }
        if (bounds.y + bounds.height > maxBounds.miny + maxBounds.height) {
          maxBounds.height = bounds.y + bounds.height - maxBounds.minx;
        }
        return {
          type: "path",
          data: pathAnno.path,
          erase: pathAnno.erase,
          color: pathAnno.color,
          strokeSize: pathAnno.strokeSize,
          bounds: bounds
        }
      }
    });

    // Create a padding around the image (results in better ocr)
    maxBounds.minx -= padding;
    maxBounds.miny -= padding;
    maxBounds.width += 2 * padding;
    maxBounds.height += 2 * padding;
    console.log(maxBounds)
    return { "viewbox": maxBounds, "svgPaths": jsonAnno }
  }, [annotations]);

  const makeParagraph = (para: string, color: string, size: number) => {
    const textStyle = {
      color: Skia.Color(color),
      fontSize: size,
    };
    return Skia.ParagraphBuilder.Make()
      .pushStyle(textStyle)
      .addText(para)
      .build();
  }

  const refreshPlugins = async () => {
    if (!ocrEdited) {
      await getData();
    }
    setPlugData({ ocr: ocrData, svgData: jsonAnnotations })
  }

  const getData = async () => {
    // Make server request
    try {
      fetch("http://192.168.1.220:5000/process_svg", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonAnnotations)
      })
        .then(response => {
          return response.json();
        })
        .then(data => {
          console.log(data["ocr_results"]);
          return data["ocr_results"];
        })
        .then(ocrResult => {
          setOcrData(ocrResult);
        })
    } catch (error) {
      console.error(error);
    }
    setOcrEdited(false);
  };

  const renderListItem = useCallback(
    (item: ListRenderItemInfo<PlugInfo>) => {
      return (
        <PlugLI
          item={item}
          data={plugData}
        />
      );
    },
    [plugData]
  );

  return (
    <Modal
      animationType="slide"
      visible={visible}
    >
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
        className="m-4 h-full flex"
      >
        <View className="flex flex-row" style={{
          borderBottomWidth: 0.5,
          borderBottomColor: 'grey'
        }}>
          <Text className="flex-1 text-3xl font-bold mb-2">Plugins</Text>
          <TouchableOpacity
            className="flex-initial mr-2"
            onPress={refreshPlugins}>
            <Ionicons name="play-forward-outline" size={24} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-initial"
            onPress={closeModal}>
            <Ionicons name="close-outline" size={26} color="red" />
          </TouchableOpacity>
        </View>
        <View className="flex flex-row mt-10">
          <Text className="text-2xl flex-1 font-bold">OCR Data</Text>
          <TouchableOpacity
            className="flex-initial"
            onPress={getData}
          >
            <Ionicons name="reload" size={26} color={ocrEdited ? 'orange' : 'blue'} />
          </TouchableOpacity>
        </View>
        <TextInput
          className="border bg-gray-50"
          style={{
            minHeight: 100,
            maxHeight: 240,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8
          }}
          onChangeText={(newData) => {
            setOcrData({ ...ocrData, "labels": newData.split('\n') });
            setOcrEdited(true);
          }}
          value={'labels' in ocrData ? ocrData["labels"].join('\n') : "Error retrieving OCR Data please try again"}
          placeholder="Press >> to run all or Sync to process"
          multiline={true}
          autoCorrect={false}
        />
        <Text className="text-2xl font-bold mt-10">Available Plugins</Text>
        <FlatList
          data={plugins}
          renderItem={renderListItem}
          className="flex-1"
        />
      </View>
    </Modal>
  )
}
