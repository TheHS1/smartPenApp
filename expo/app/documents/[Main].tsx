import { useState, useEffect } from "react";
import { TouchableOpacity, View, Text, Button } from "react-native";
import { Device } from "react-native-ble-plx";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Annotations from "@/components/Annotations";
import DeviceModal from "@/components/DeviceConnectionModal";
import useBLE from '@/components/useBLE'
import PageSelector from "@/components/PageSelector";
import { fileInfo, annotation, pathInfo, page, } from "@/types";
import { getFiles } from "@/utils";
import Constants from "expo-constants";
import PluginManager from "@/plugins/PluginManager";
import { useCanvasRef } from "@shopify/react-native-skia";
import { Ionicons } from "@expo/vector-icons";

export default function Main() {
  const { fileName } = useLocalSearchParams<{ fileName: string; }>();

  const [fInfo, setFileInfo] = useState<fileInfo>({ pages: [] });
  const [annotations, setAnnotations] = useState<page>({ annotations: [], penStrokes: [] });
  const [penPaths, setPenPaths] = useState<pathInfo[]>([]);
  const [prevPenPaths, setPrevPenPaths] = useState<pathInfo[]>([]);
  const ref = useCanvasRef();

  const [showPageSelector, setShowPageSelector] = useState<boolean>(false);
  const [bypass, setBypass] = useState<boolean>(false);
  const [pageNum, setPageNum] = useState<number>(0);

  const [showPlugin, setShowPlugin] = useState<boolean>(false);

  // BLE does not work in expo go
  const expoGo = Constants.executionEnvironment === 'storeClient'

  const {
    requestPermissions,
    scanForPeripherals,
    allDevices,
    connectToDevice,
    connectedDevice,
    data,
    disconnectFromDevice,
    resetPenPos,
  } = useBLE();

  useEffect(() => {
    //Only process data if connected
    if (connectedDevice) {
      if (data) {
        // Split the raw data string by "M"
        const strokes = data
          .substring(data.indexOf("M"))
          .substring(0, data.lastIndexOf(" "))
          .split('M') // Split by Move command
          .filter(strokeData => strokeData.trim() !== '') // Filter out any empty strings resulting from the split
          .map(strokeData => ({ path: 'M' + strokeData.trim(), erase: false, color: 'black', strokeSize: 3 })); // Add 'M' back and create annotation object
        setPenPaths(strokes);
        setAnnotations({ ...annotations, penStrokes: [...strokes, ...prevPenPaths] });
        saveAnnotations();
      }
    } else {
      setPenPaths([]);
    }
  }, [data])


  useEffect(() => {
    getFiles()
      .then((files: Map<string, fileInfo>) => {
        if (files.has(fileName)) {
          setFileInfo(files.get(fileName) ?? { pages: [] })
          setAnnotations(files.get(fileName)?.pages[0] ?? { annotations: [], penStrokes: [] });
          setPrevPenPaths(files.get(fileName)?.pages[0]?.penStrokes ?? []);
        }
      })
      .catch(console.error);

    const fetchDevice = async () => {
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (deviceId) {
        connectToDevice(JSON.parse(deviceId));
      }
    }

    fetchDevice();
  }, [])

  const [isDevModalVisible, setIsDevModalVisible] = useState<boolean>(false);

  const clearPenData = async () => {
    await resetPenPos();
    setPenPaths([]);
    setPrevPenPaths([]);
    setAnnotations({ ...annotations, penStrokes: [] });
  }

  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    }
  }

  const connectToPeripheral = async (deviceId: Device) => {
    try {
      connectToDevice(deviceId);
      if (deviceId.name)
        await AsyncStorage.setItem('deviceId', JSON.stringify(deviceId))
    } catch (err) {
      console.warn(err);
    }
  }

  const hideDevModal = () => {
    setIsDevModalVisible(false);
  }

  const openDevModal = async () => {
    scanForDevices();
    setIsDevModalVisible(true);
  }

  const addPage = async () => {
    const newDoc = { pages: [...fInfo.pages, { annotations: [], penStrokes: [] }] };
    setFileInfo(newDoc);
    saveDocument();
  }

  const changePage = (index: number) => {
    setPageNum(index);
    setAnnotations(fInfo.pages[index]);
  }

  const deletePage = async (ind: number) => {
    const pages: page[] = fInfo.pages;
    pages.splice(ind, 1);

    setFileInfo({ pages: pages });
    saveDocument();
  }

  const saveAnnotations = async () => {
    const newDoc = fInfo;
    newDoc.pages[pageNum] = annotations;
    setFileInfo(newDoc);
    saveDocument();
  }

  const saveDocument = async () => {
    getFiles()
      .then(async (files: Map<string, fileInfo>) => {
        files.set(fileName, fInfo);
        await AsyncStorage.setItem('files', JSON.stringify(Array.from(files.entries())));
      })
      .catch(console.error);
  }

  return (
    <View
      className="h-full w-full">
      <PluginManager
        closeModal={() => setShowPlugin(false)}
        visible={showPlugin}
        annotations={annotations}
      />
      {(expoGo || connectedDevice || bypass) ? (
        <View
          className="flex w-full h-full">
          <View className="flex-1 flex flex-row">
            {showPageSelector && (
              <PageSelector
                fInfo={fInfo}
                addPage={addPage}
                changePage={changePage}
                deletePage={deletePage}
                deviceConnected={connectedDevice != null}
              />
            )}
            <Annotations annotations={annotations} penData={penPaths} setAnnotations={setAnnotations} saveAnnotations={saveAnnotations} canvRef={ref} resetPenPos={clearPenData} setShowPageSelector={setShowPageSelector} showPageSelector={showPageSelector} setShowPlugin={setShowPlugin} />
          </View>
        </View>
      ) : (
        <View className="flex-1 justify-center items-center p-5">
          <Ionicons name="bluetooth-outline" size={64} color="#cccccc" />
          <Text className="text-2xl font-semibold text-gray-600 mt-2">No Intellisync Pen Connected</Text>
          <Text className="text-gray-400 mt-8 text-center">
            Tap the connect button to search for smart pens or <Button title="Skip for now" onPress={() => setBypass(true)} />
          </Text>
          <TouchableOpacity onPress={openDevModal}>
            <Text className="text-center bg-blue-500 text-lg p-4 m-10 text-white">
              Connect
            </Text>
          </TouchableOpacity>
          <DeviceModal
            closeModal={hideDevModal}
            visible={isDevModalVisible}
            connectToPeripheral={connectToPeripheral}
            devices={allDevices}
          />
        </View>
      )
      }
    </View >
  )
}

