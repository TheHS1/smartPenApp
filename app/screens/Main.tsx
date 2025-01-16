import { useState, useRef, useEffect } from "react";
import { TouchableOpacity, View, Text, Button } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useBLE from '../useBLE'
import DeviceModal from "./DeviceConnectionModal";
import Annotations from "../components/annotations";
import { Device } from "react-native-ble-plx";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import PagePreview from "../components/PagePreview";

export default function Main({ route }) {
  const { fileName } = route.params;


  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [showPageSelector, setShowPageSelector] = useState<boolean>(false);
  const [fileInfo, setFileInfo] = useState<fileInfo>({ numPages: 0 });

  // set button action for menu button in header
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => setShowPageSelector(!showPageSelector)}>
          <Ionicons name="menu" size={36} color="blue" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, showPageSelector]);

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const deviceId = await AsyncStorage.getItem('deviceId');
        if (deviceId) {
          connectToDevice(JSON.parse(deviceId));
        }
      } catch (err) {
        console.warn(err)
      }
    }

    const getFileInfo = async () => {
      const fileNames = await AsyncStorage.getItem('files')
      let files: Map<string, fileInfo> = new Map();
      if (fileNames) {
        files = new Map(JSON.parse(fileNames));
      }
      if (files.has(fileName)) {
        setFileInfo(files.get(fileName) ?? { numPages: 0 })
      }
    }

    fetchDevice().catch(console.error);
    getFileInfo().catch(console.error);
  }, [])

  const {
    requestPermissions,
    scanForPeripherals,
    allDevices,
    connectToDevice,
    connectedDevice,
    data,
    disconnectFromDevice
  } = useBLE();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

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

  const hideModal = () => {
    setIsModalVisible(false);
  }

  const openModal = async () => {
    scanForDevices();
    setIsModalVisible(true);
  }

  const addPage = async () => {
    const updateFile = { numPages: fileInfo.numPages + 1 }
    setFileInfo(updateFile)
    const fileNames = await AsyncStorage.getItem('files')
    let files: Map<string, fileInfo> = new Map();
    if (fileNames) {
      files = new Map(JSON.parse(fileNames));
    }
    files.set(fileName, updateFile);
    await AsyncStorage.setItem('files', JSON.stringify(Array.from(files.entries())));
  }

  const [bypass, setBypass] = useState<boolean>(false);
  const [pageNum, setPageNum] = useState<number>(0);

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right
      }}
      className="h-full w-full">
      {(connectedDevice || bypass) ? (
        <View
          className="flex w-full h-full">
          <View className="flex-1 flex flex-row">
            {showPageSelector && (
              <View className="w-2/6 h-full flex-initial flex bg-gray-100">

                {Array.from({ length: fileInfo.numPages }).map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    className="flex-1 border m-2 p-1 bg-white"
                    onPress={() => setPageNum(index)}
                  >
                    <Text className="absolute">{index}</Text>
                    <PagePreview fileName={fileName} pageNum={index} />
                  </TouchableOpacity>
                ))}

                <TouchableOpacity className="flex-initial" onPress={addPage}>
                  <Text className="text-center bg-gray-300 p-2 m-2 text-white">
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <Annotations pageNum={pageNum} fileName={fileName} />
          </View>
          <Text className="flex-initial">{data}</Text>
        </View>
      ) : (
        <View>
          <Text className="text-center text-lg">Please connect your smart pen device</Text>
          <TouchableOpacity
            onPress={openModal}
          >
            <Text className="text-center bg-blue-500 p-5 m-10 text-white">
              Connect
            </Text>
          </TouchableOpacity>
          <Button onPress={() => setBypass(true)} title="Skip" />
          <DeviceModal
            closeModal={hideModal}
            visible={isModalVisible}
            connectToPeripheral={connectToPeripheral}
            devices={allDevices}
          />
        </View>
      )
      }
    </View >
  )
}

