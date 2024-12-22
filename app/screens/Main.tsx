import { useState, useRef } from "react";
import { GestureResponderEvent, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Path } from 'react-native-svg'

export default function Main() {

    const [paths, setPaths] = useState<string[][]>([])
    const [curDrawn, setCurDrawn] = useState<string[]>([]);
    const [drawing, setDrawing] = useState<boolean>(false);
    const paintRef = useRef(null);

    const updatePath = (event: GestureResponderEvent | PointerEvent) => {
        const rect = paintRef.current.getBoundingClientRect();
        // get location of finger press or mouse move
        if((event as GestureResponderEvent).nativeEvent.locationX) {
            var x = (event as GestureResponderEvent).nativeEvent.locationX;
            var draw = true
        } else {
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
            console.log(y)

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
        <View ref={paintRef} onTouchMove={updatePath} onTouchEnd={savePath} onPointerMove={updatePath} onPointerDown={setDraw} onPointerUp={unsetDraw} className="border-blue-500 border-4 w-full h-full">
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
        
        </View>
      </SafeAreaView>
    )
}

