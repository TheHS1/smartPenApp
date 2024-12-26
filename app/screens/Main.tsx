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

    interface pathInfo {
        path: string[];
        erase: boolean;
    }

    const [paths, setPaths] = useState<pathInfo[]>([])
    const [curDrawn, setCurDrawn] = useState<pathInfo>({path: [], erase: false});
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
            const curPath = [...curDrawn.path];

            // Due to SVG format, make sure that points are in MX,Y format
            const point = `${curPath.length === 0 ? 'M' : ""}${x.toFixed(0)},${y.toFixed(0)}`;
            curPath.push(point)
            setCurDrawn({...curDrawn, path: curPath})
        }
    };

    const savePath = () => {
        paths.push(curDrawn)
        setCurDrawn({...curDrawn, path: []});
    };
    
    const setDraw = () => {
        setDrawing(true)
    }

    const unsetDraw = () => {
        paths.push(curDrawn)
        setCurDrawn({path: [], erase: false});
        setDrawing(false)
    }

    return (
      <SafeAreaView className="h-full w-full">
        {connectedDevice ? (
        <View className="flex border-blue-500 border-4 w-full h-1/2">
            <View className="flex-initial flex flex-row p-2">
                <TouchableOpacity onPress={() => setCurDrawn({...curDrawn, erase:false})} className="flex-1">
                    <Text>draw</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setCurDrawn({...curDrawn, erase:true})}className="flex-1">
                    <Text>erase</Text>
                </TouchableOpacity>
            </View>
            <View ref={paintRef} onTouchMove={updatePath} onTouchEnd={savePath} onPointerMove={updatePath} onPointerDown={setDraw} onPointerUp={unsetDraw} className="flex-1">
                <Svg className="h-full">
                    {paths.map((path: pathInfo, index: number) => (
                        <Path
                            key={index}
                            d={path.path.join(' ')}
                            stroke={path.erase ? 'white' : 'red'}
                            fill={'transparent'}
                            strokeWidth={3}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    ))}
                    <Path
                        d={curDrawn.path.join('\n')}
                        stroke={curDrawn.erase ? 'white' : 'red'}
                        fill={'transparent'}
                        strokeWidth={3}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                </Svg>
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

