import { useState, useEffect } from "react";
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";

export default function Main({ route }) {
  const { fileName } = route.params;


  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [showPageSelector, setShowPageSelector] = useState<boolean>(false);
  const [fInfo, setFileInfo] = useState<fileInfo>({ pages: [] });
  const [paths, setPaths] = useState<pathInfo[]>([]);

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
        setFileInfo(files.get(fileName) ?? { pages: [] })
        setPaths(files.get(fileName)?.pages[0] ?? []);
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
    let i: number = fInfo.pages.length;
    const fileNames = await AsyncStorage.getItem('files');
    let files: Map<string, fileInfo> = new Map();
    if (fileNames) {
      files = new Map(JSON.parse(fileNames));
    }
    const newDoc = { pages: [...fInfo.pages, []] };
    setFileInfo(newDoc);
    files.set(fileName, newDoc);
    await AsyncStorage.setItem('files', JSON.stringify(Array.from(files.entries())));
  }

  const deletePage = async (ind: number) => {
    const pages: pathInfo[][] = fInfo.pages;
    pages.splice(ind, 1);

    setFileInfo({ pages: pages });
    const fileNames = await AsyncStorage.getItem('files');
    let files: Map<string, fileInfo> = new Map();
    if (fileNames) {
      files = new Map(JSON.parse(fileNames));
    }
    files.set(fileName, { pages: pages });
    await AsyncStorage.setItem('files', JSON.stringify(Array.from(files.entries())));
  }

  const saveDocument = async () => {
    const fileNames = await AsyncStorage.getItem('files');
    let files: Map<string, fileInfo> = new Map();
    if (fileNames) {
      files = new Map(JSON.parse(fileNames));
    }
    const newDoc = fInfo;
    newDoc.pages[pageNum] = paths;
    setFileInfo(newDoc);
    files.set(fileName, newDoc);
    await AsyncStorage.setItem('files', JSON.stringify(Array.from(files.entries())));
  }

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

  const [bypass, setBypass] = useState<boolean>(false);
  const [pageNum, setPageNum] = useState<number>(0);

  const changePage = (index: number) => {
    setPageNum(index);
    setPaths(fInfo.pages[index]);
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
              <View className="w-2/6 h-full flex-initial flex bg-gray-100">

                <GestureHandlerRootView>
                  {fInfo.pages.map((page: pathInfo[], index) => (
                    <View className="flex-1 m-1 flex flex-row" key={index}>
                      <ReanimatedSwipeable
                        onSwipeableOpen={() => closeRow(index)}
                        ref={ref => (row[index] = ref)}
                        friction={2}
                        leftThreshold={0}
                        enableTrackpadTwoFingerGesture
                        renderRightActions={(progress, drag) => RightAction(progress, drag, index)}
                        containerStyle={{ flexDirection: "row", flex: 1 }}
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
                    </View>
                  ))}
                </GestureHandlerRootView>

                <TouchableOpacity className="flex-initial" onPress={addPage}>
                  <Text className="text-center bg-gray-300 p-2 m-2 text-white">
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <Annotations paths={paths} setPaths={setPaths} saveDocument={saveDocument} />
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

