import { FC, useCallback } from "react";
import { FlatList, ListRenderItemInfo, Modal, Text, TouchableOpacity, View, Button } from "react-native";
import { Device } from "react-native-ble-plx";
import { SafeAreaView } from "react-native-safe-area-context";

type devProps = {
  closeModal: () => void;
  visible: boolean;
  connectToPeripheral: (device: Device) => void;
  devices: Device[];
}

type devLIProps = {
  item: ListRenderItemInfo<Device>;
  connectToPeripheral: (device: Device) => void;
  closeModal: () => void;
}

const DevLI: FC<devLIProps> = (props: devLIProps) => {
  const { item, connectToPeripheral, closeModal } = props;
  const connectAndCloseModal = useCallback(() => {
    connectToPeripheral(item.item);
    closeModal();
  }, [closeModal, connectToPeripheral, item.item]);

  return (
    <TouchableOpacity
      onPress={connectAndCloseModal}
    >
      <Text className="text-base font-bold">{item.item.name}</Text>
    </TouchableOpacity>
  );
}

export default function DeviceConnectionModal(props: devProps) {
  const { closeModal, visible, connectToPeripheral, devices } = props;

  const renderListItem = useCallback(
    (item: ListRenderItemInfo<Device>) => {
      return (
        <DevLI
          item={item}
          connectToPeripheral={connectToPeripheral}
          closeModal={closeModal}
        />
      );
    },
    [closeModal, connectToPeripheral]
  );

  return (
    <Modal
      animationType="slide"
      visible={visible}
    >
      <SafeAreaView>
        <View className="m-10">
          <Text className="text-3xl">Scanning for Intellisync Pens...</Text>
          <Text className="mt-10 text-xl">Select your device</Text>
          <FlatList
            data={devices}
            renderItem={renderListItem}
            className="bg-blue-50 border mt-2 p-3 border-black rounded-lg"
          />
        </View>
        <Button title="close" onPress={closeModal} />
      </SafeAreaView>
    </Modal>
  )
}
