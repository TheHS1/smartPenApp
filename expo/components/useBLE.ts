import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleError, BleManager, Characteristic, Device, Subscription } from "react-native-ble-plx"

import * as ExpoDevice from "expo-device"

import base64 from "react-native-base64"
import Constants from "expo-constants";

const DATA_UUID = "00000001-710e-4a5b-8d75-3e5b444bc3cf"
const DATA_CHARACTERISTIC = "00000002-710e-4a5b-8d75-3e5b444bc3cf"

// BLE does not work with Expo Go
const deviceName = "Pen service"

interface BluetoothLowEnergyApi {
    requestPermissions(): Promise<boolean>;
    scanForPeripherals(): void;
    allDevices: Device[];
    connectToDevice: (deviceId: Device) => Promise<void>;
    connectedDevice: Device | null;
    data: string;
    disconnectFromDevice(): void;
    resetPenPos: () => Promise<void>;
}

const expoGo = Constants.executionEnvironment === 'storeClient'

export default function useBLE(): BluetoothLowEnergyApi {
    let bleManager: BleManager;
    let deviceSubscription: Subscription;
    if (!expoGo) {
        bleManager = useMemo(() => new BleManager(), []);
    }
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [data, setData] = useState<string>("");

    const requestAndroid31Permissions = async () => {
        const bluetoothScanPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
                title: "Scan Permission",
                message: "App requires Bluetooth Scanning",
                buttonPositive: "OK",
            }
        );
        const bluetoothConnectPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
                title: "Connect Permission",
                message: "App requires Bluetooth Connecting",
                buttonPositive: "OK",
            }
        );
        const bluetoothFineLocationPermissions = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: "Fine Location",
                message: "App requires fine location",
                buttonPositive: "OK",
            }
        );

        return (
            bluetoothScanPermission === "granted" &&
            bluetoothConnectPermission === "granted" &&
            bluetoothFineLocationPermissions === "granted"
        );
    };

    const requestPermissions = async () => {
        if (Platform.OS === "android") {
            if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message: "Bluetooth requires Location",
                        buttonPositive: "OK"
                    }
                );

                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                const isAndroidPermissionGranted = await requestAndroid31Permissions();
                return isAndroidPermissionGranted
            }
        } else {
            return true;
        }
    };

    const isDuplicateDevice = (devices: Device[], nextDevice: Device) =>
        devices.findIndex((device) => nextDevice.id === device.id) > -1;


    const scanForPeripherals = () => {
        if (!bleManager)
            return
        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.log(error);
            }
            if (device && device.name?.includes(deviceName)) {
                setAllDevices((prevState: Device[]) => {
                    if (!isDuplicateDevice(prevState, device)) {
                        return [...prevState, device];
                    }
                    return prevState;
                });
            }
        });
    }

    const connectToDevice = async (device: Device) => {
        if (!bleManager) {
            return
        }
        try {
            const deviceConnection = await bleManager.connectToDevice(device.id)
            setConnectedDevice(deviceConnection);
            await deviceConnection.discoverAllServicesAndCharacteristics();
            bleManager.stopDeviceScan();
            deviceSubscription = bleManager.onDeviceDisconnected(device.id, disconnectFromDevice);
            startStreamingData(deviceConnection);
        } catch (e) {
            console.log("ERROR IN CONNECTION", e);
        }

    }

    const onDataUpdate = (
        error: BleError | null,
        characeristic: Characteristic | null
    ) => {
        if (error) {
            console.log(error);
            disconnectFromDevice();
            return
        } else if (!characeristic?.value) {
            console.log("No Data Received")
            return
        }

        const rawData = base64.decode(characeristic.value)
        console.log(rawData)
        setData((oldData) => {
            if (rawData.charAt(0) == "M") {
                return (oldData.substr(0, oldData.lastIndexOf(" ")) + rawData)
            } else if (oldData.length == 0) {
                const crop = rawData.substr(rawData.indexOf(" ") + 1);
                if (crop.charAt(0) == "M") {
                    return crop;
                } else {
                    return "M" + rawData.substr(rawData.indexOf(" ") + 1);
                }
            }
            return oldData + rawData;
        })
    }

    async function sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    const startStreamingData = async (device: Device) => {
        if (device) {
            device.monitorCharacteristicForService(
                DATA_UUID, DATA_CHARACTERISTIC, onDataUpdate);
        } else {
            console.log("No Device Connected")
        }
    }

    const resetPenPos = async () => {
        if (connectedDevice) {
            setData(data.substr(data.lastIndexOf(" ")));
            const response = await connectedDevice.writeCharacteristicWithResponseForService(DATA_UUID, DATA_CHARACTERISTIC, "");
        } else {
            console.log("No Device Connected")
        }
    }

    const disconnectFromDevice = () => {
        setConnectedDevice(null);
        if (!bleManager) {
            return
        }
        if (connectedDevice) {
            bleManager.cancelDeviceConnection(connectedDevice.id)
            setData("");
            deviceSubscription.remove();
        }
    }

    return {
        scanForPeripherals,
        requestPermissions,
        allDevices,
        connectToDevice,
        connectedDevice,
        data,
        disconnectFromDevice,
        resetPenPos
    }
}

