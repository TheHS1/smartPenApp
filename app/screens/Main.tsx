import { useState, useEffect } from "react";
import { TouchableOpacity, View, Text, Button } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Device } from "react-native-ble-plx";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Annotations from "../components/Annotations";
import DeviceModal from "./DeviceConnectionModal";
import useBLE from '../useBLE'
import PageSelector from "../components/PageSelector";
import { fileInfo, annotation, } from "../types";
import { getFiles } from "../utils";

export default function Main({ route }) {
  const { fileName } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [fInfo, setFileInfo] = useState<fileInfo>({ pages: [] });
  const [annotations, setAnnotations] = useState<annotation[]>([]);

  const [showPageSelector, setShowPageSelector] = useState<boolean>(false);
  const [bypass, setBypass] = useState<boolean>(false);
  const [pageNum, setPageNum] = useState<number>(0);

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
    getFiles()
      .then((files: Map<string, fileInfo>) => {
        if (files.has(fileName)) {
          setFileInfo(files.get(fileName) ?? { pages: [] })
          setAnnotations(files.get(fileName)?.pages[0] ?? []);
        }
      })
      .catch(console.error);

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

    fetchDevice().catch(console.error);
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
              <PageSelector
                fInfo={fInfo}
                addPage={addPage}
                changePage={changePage}
                deletePage={deletePage}
              />
            )}
            <Annotations annotations={annotations} data={data} setAnnotations={setAnnotations} saveAnnotations={saveAnnotations} />
          </View>
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

