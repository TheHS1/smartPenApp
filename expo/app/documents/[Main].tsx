import { useState, useEffect } from "react";
import { TouchableOpacity, View, Text, Button } from "react-native";
import { Device } from "react-native-ble-plx";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Annotations from "@/components/Annotations";
import DeviceModal from "@/components/DeviceConnectionModal";
import useBLE from '@/components/useBLE'
import PageSelector from "@/components/PageSelector";
import { fileInfo, annotation, } from "@/types";
import { getFiles } from "@/utils";
import Constants from "expo-constants";
import PluginManager from "@/plugins/PluginManager";
import { useCanvasRef } from "@shopify/react-native-skia";

export default function Main() {
  const { fileName } = useLocalSearchParams<{ fileName: string; }>();

  const [fInfo, setFileInfo] = useState<fileInfo>({ pages: [] });
  const [annotations, setAnnotations] = useState<annotation[]>([]);
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
    resetPenPos
  } = useBLE();


  useEffect(() => {
    getFiles()
      .then((files: Map<string, fileInfo>) => {
        if (files.has(fileName)) {
          setFileInfo(files.get(fileName) ?? { pages: [] })
          setAnnotations(files.get(fileName)?.pages[0] ?? []);
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

  useEffect(() => {
    console.log(connectedDevice?.name)
  }, [connectedDevice])
  const [isDevModalVisible, setIsDevModalVisible] = useState<boolean>(false);

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
    const newDoc = { ...fInfo, pages: [...fInfo.pages, []] };
    setFileInfo(newDoc);
    saveDocument();
  }

  const changePage = (index: number) => {
    setPageNum(index);
    setAnnotations(fInfo.pages[index]);
  }

  const deletePage = async (ind: number) => {
    const pages: annotation[][] = fInfo.pages;
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
              />
            )}
            <Annotations annotations={annotations} data={data} setAnnotations={setAnnotations} saveAnnotations={saveAnnotations} canvRef={ref} resetPenPos={resetPenPos} setShowPageSelector={setShowPageSelector} showPageSelector={showPageSelector} setShowPlugin={setShowPlugin} />
          </View>
        </View>
      ) : (
        <View>
          <Text className="text-center text-lg">Please connect your smart pen device</Text>
          <TouchableOpacity
            onPress={openDevModal}
          >
            <Text className="text-center bg-blue-500 p-5 m-10 text-white">
              Connect
            </Text>
          </TouchableOpacity>
          <Button onPress={() => setBypass(true)} title="Skip" />
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

