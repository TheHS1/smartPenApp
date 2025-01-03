import { useState, useRef, useEffect } from "react";
import { TouchableOpacity, View, Text, Button } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useBLE from '../useBLE'
import DeviceModal from "./DeviceConnectionModal";
import Annotations from "../components/annotations";
import { Device } from "react-native-ble-plx";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Main() {
  const insets = useSafeAreaInsets();


  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const deviceId = await AsyncStorage.getItem('deviceId')
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

  const [bypass, setBypass] = useState<Boolean>(false);

  return (
    <View className="h-full w-full">
      {(connectedDevice || bypass) ? (
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
          </TouchableOpacity>
          <Button onPress={() => setBypass(true)} title="Skip" />
          <DeviceModal
            closeModal={hideModal}
            visible={isModalVisible}
            connectToPeripheral={connectToPeripheral}
            devices={allDevices}
          />
        </View>
      )}
    </View>
  )
}

