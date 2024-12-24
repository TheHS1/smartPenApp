import { useState, useRef } from "react";
import { GestureResponderEvent, TouchableOpacity, View, Text} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Path } from 'react-native-svg'
import useBLE from '../useBLE'
import DeviceModal from "./DeviceConnectionModal";

export default function Main() {

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

    const [paths, setPaths] = useState<string[][]>([])
    const [curDrawn, setCurDrawn] = useState<string[]>([]);
    const [drawing, setDrawing] = useState<boolean>(false);
    const paintRef = useRef(null);

    const updatePath = (event: GestureResponderEvent | PointerEvent) => {
        // get location of finger press or mouse move
        if((event as GestureResponderEvent).nativeEvent.locationX) {
            var x = (event as GestureResponderEvent).nativeEvent.locationX;
            var draw = true
        } else {
            var rect = paintRef.current.getBoundingClientRect();
            var x = (event as PointerEvent).clientX - rect.left;
            var draw = drawing
        }

        if((event as GestureResponderEvent).nativeEvent.locationY) {
            var y = (event as GestureResponderEvent).nativeEvent.locationY;
        } else {
            var y = (event as PointerEvent).clientY - rect.top;
        }

        if (draw) {
            const curPath = [...curDrawn];

            // Due to SVG format, make sure that points are in MX,Y format
            const point = `${curPath.length === 0 ? 'M' : ""}${x.toFixed(0)},${y.toFixed(0)}`;
            curPath.push(point)
            setCurDrawn(curPath)
        }
    };

    const savePath = () => {
        paths.push(curDrawn)
        setCurDrawn([]);
    };
    
    const setDraw = () => {
        setDrawing(true)
    }

    const unsetDraw = () => {
        paths.push(curDrawn)
        setCurDrawn([]);
        setDrawing(false)
    }

    return (
      <SafeAreaView className="flex h-full w-full">
        {connectedDevice ? (
        <View ref={paintRef} onTouchMove={updatePath} onTouchEnd={savePath} onPointerMove={updatePath} onPointerDown={setDraw} onPointerUp={unsetDraw} className="border-blue-500 border-4 w-full h-1/2">
            <Svg className="h-full">
            <Path
                d={curDrawn.join('\n')}
                stroke='red'
                fill={'transparent'}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <Path
                d={paths.join(' ')}
                stroke='red'
                fill={'transparent'}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            </Svg>
            <Text>{data}</Text>
        
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
      </SafeAreaView>
    )
}

