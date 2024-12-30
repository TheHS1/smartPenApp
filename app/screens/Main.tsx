import { useState, useRef } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useBLE from '../useBLE'
import DeviceModal from "./DeviceConnectionModal";
import Annotations from "../components/annotations";

export default function Main() {
  const insets = useSafeAreaInsets();

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

  const hideModal = () => {
    setIsModalVisible(false);
  }

  const openModal = async () => {
    scanForDevices();
    setIsModalVisible(true);
  }


  return (
    <View className="h-full w-full">
      {connectedDevice ? (
        <View
          style={{
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right
          }}
          className="flex w-full h-full">
          <Annotations />
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
            <DeviceModal
              closeModal={hideModal}
              visible={isModalVisible}
              connectToPeripheral={connectToDevice}
              devices={allDevices}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

