import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, SafeAreaView, Button, TextInput } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { Panel1, Swatches, Preview, HueSlider, returnedResults } from 'reanimated-color-picker';
import { ReanimatedLogLevel, configureReanimatedLogger, runOnJS, useDerivedValue, useSharedValue } from "react-native-reanimated";
import AnnotationTools from "./AnnotationTools";
import { Canvas, Group, Path, SkPath, Skia, Paragraph } from "@shopify/react-native-skia";
import { pathInfo } from "../types";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

interface annotationProps {
  data: string;
  paths: pathInfo[];
  savePathFile: () => void;
  setPaths: (prevPath: pathInfo[]) => void;
}

export default function Annotations({ data, paths, savePathFile, setPaths }: annotationProps) {
  enum actions {
    addPath,
    deletePath,
    clear
  }

  interface history {
    action: actions;
    paths?: pathInfo[];
  }

  const [hist, setHist] = useState<history[]>([]);
  const [redoHist, setRedoHist] = useState<history[]>([]);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [showAnnotationState, setShowAnnotationState] = useState(true);
  const [erase, setErase] = useState<boolean>(false);
  const [color, setColor] = useState<string>('red');
  const [isText, setIsText] = useState<boolean>(false);
  const [strokeSize, setStrokeSize] = useState<number>(1);

  const curDrawn = useSharedValue<string>("");
  const selectedColor = useSharedValue('red');
  const showAnnotation = useSharedValue<boolean>(true);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const maxStroke = 11;

  // Save paths to file when they're changed
  useEffect(() => {
    savePathFile();
  }, [paths])

  const updatePath = (x: number, y: number) => {
    'worklet';
    if (!showAnnotation.value)
      return;

    runOnJS(setRedoHist)([]);

    let curPath: string = curDrawn.value;

    // Due to SVG format, make sure that points are in MX,Y format
    const point = `${curPath.length === 0 ? 'M' : "L"}${((x - translateX.value) / scale.value).toFixed(0)},${((y - translateY.value) / scale.value).toFixed(0)}`;
    curPath += point;
    curDrawn.value = curPath;
  };

  const savePath = () => {
    const pathSave = curDrawn.value;
    if (isText) {
      setPaths([...paths, { path: text, erase: erase, color: color, strokeSize: strokeSize, isText: isText }]);
    } else {
      setPaths([...paths, { path: pathSave, erase: erase, color: color, strokeSize: strokeSize, isText: isText }]);
    }
    setHist((prevHist) => [...prevHist, { action: actions.addPath }]);
    curDrawn.value = "";
  }

  const clearPath = () => {
    setHist((prevHist) => [...prevHist, { action: actions.clear, paths: paths }]);
    setPaths([]);
    setErase(false);
    setRedoHist([]);
    curDrawn.value = "";
  }

  const undoDraw = () => {
    const curHist = [...hist];
    const last = curHist.pop();
    if (last === undefined)
      return;

    switch (last.action) {
      case actions.addPath:
        const curPaths = [...paths];
        const path = curPaths.pop();
        if (path === undefined)
          return;

        setPaths(curPaths);
        setRedoHist((prevRedoHist) => [...prevRedoHist, { action: actions.deletePath, paths: [path] }]);

        break;
      case actions.clear:
        if (!last.paths)
          return;
        setRedoHist((prevRedoHist) => [...prevRedoHist, { action: actions.clear }]);
        setPaths(last.paths.slice());
        break;
    }

    setHist(curHist);
  }

  const redoDraw = () => {
    const curHist = [...redoHist];
    const first = curHist.pop();
    if (first === undefined)
      return;

    switch (first.action) {
      case actions.deletePath:
        if (first.paths === undefined)
          return;

        const addPath = first.paths[0];
        setPaths([...paths, addPath]);
        setHist((prevHist) => [...prevHist, { action: actions.addPath }]);
        break;
      case actions.clear:
        setHist((prevHist) => [...prevHist, { action: actions.clear, paths: paths.slice() }]);
        setPaths([]);
        break;
    }

    setRedoHist(curHist);
  }

  const confirmColor = () => {
    setColor(selectedColor.value);
    setShowPicker(false);
  }

  const onSelectColor = (color: returnedResults) => selectedColor.value = color.rgb;
  const toggleShowPicker = () => setShowPicker(!showPicker);
  const toggleShowAnnotation = () => {
    const value = showAnnotation.value;
    showAnnotation.value = !showAnnotation.value;
    setShowAnnotationState(!value);
  }

  const setStroke = () => {
    const size = Math.max((strokeSize + 2) % maxStroke, 1);
    setStrokeSize(size);
  }

  const clamp = (num: number, min: number, max: number) => {
    'worklet';
    return Math.max(min, Math.min(num, max));
  }

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, 0.2, 5);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .enableTrackpadTwoFingerGesture(true)
    .minPointers(2)
    .onUpdate(e => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(e => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })

  const drawGesture = Gesture.Pan()
    .onUpdate(e => {
      updatePath(e.x, e.y);
    })
    .onEnd(e => {
      runOnJS(savePath)();
    })

  const movement = Gesture.Simultaneous(panGesture, pinchGesture)

  const inputRef = useRef(null);

  const focusInput = () => {
    if (isText && inputRef.current) {
      inputRef.current.focus();
    }
  }

  const tap = Gesture.Tap().onEnd((evt) => {
    runOnJS(focusInput)();
  });

  const composed = Gesture.Race(drawGesture, movement, tap)

  const resetTransform = () => {
    'worklet'
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
  }

  const transform = useDerivedValue(() => {
    return [
      { scale: scale.value },
      { translateX: translateX.value / scale.value },
      { translateY: translateY.value / scale.value },
    ]

  })

  const [text, setText] = useState<string>("joe");
  const textStyle = {
    color: Skia.Color("black"),
    fontSize: 50,
  };
  const makeParagraph = (para: string) => {
    return Skia.ParagraphBuilder.Make()
      .pushStyle(textStyle)
      .addText(para)
      .build();
  }

  return (
    <View className="flex-1 flex border-blue-500 border-4 w-full h-full">
      <AnnotationTools
        strokeSize={strokeSize}
        erase={erase}
        text={isText}
        showAnnotation={showAnnotationState}
        color={color}
        toggleShowPicker={toggleShowPicker}
        setErase={setErase}
        setStroke={setStroke}
        setText={setIsText}
        undoDraw={undoDraw}
        redoDraw={redoDraw}
        clearPath={clearPath}
        toggleShowAnnotation={toggleShowAnnotation}
      />
      <GestureHandlerRootView>
        <GestureDetector gesture={composed}>
          <Canvas
            style={{ flex: 1 }}
            className="absolute"
          >
            <Group transform={transform}>
              {showAnnotation.value && (
                paths.map((path: pathInfo, index: number) => (
                  !path.isText ? (
                    <Path
                      key={index}
                      path={Skia.Path.MakeFromSVGString(path.path) as SkPath}
                      style="stroke"
                      strokeWidth={path.strokeSize}
                      strokeCap={"round"}
                      color={path.erase ? 'white' : path.color}
                    />
                  ) : (
                    <Paragraph
                      key={index}
                      paragraph={makeParagraph(path.path)}
                      x={0}
                      y={0}
                      width={300}
                    />
                  )
                ))
              )}
              {showAnnotation.value && (
                isText ? (
                  <Paragraph
                    paragraph={makeParagraph(text)}
                    x={0}
                    y={0}
                    width={300}
                  />
                ) : (
                  <Path
                    path={Skia.Path.MakeFromSVGString(curDrawn.value) as SkPath}
                    style="stroke"
                    strokeWidth={strokeSize}
                    strokeCap="round"
                    color={erase ? 'white' : color}
                  />
                )
              )}
              <Path
                path={Skia.Path.MakeFromSVGString(data.substr(0, data.lastIndexOf(" "))) as SkPath}
                style="stroke"
                strokeWidth={1}
                strokeCap="round"
                color="black"
              />
            </Group>
          </Canvas>
        </GestureDetector>
      </GestureHandlerRootView>
      <Button title="Reset" onPress={resetTransform} />
      <Modal className="flex items-center w-full" visible={showPicker} animationType='slide' transparent={true}>
        <SafeAreaView>
          <View className="flex items-center">
            <View className="bg-gray-50 w-2/3 p-3">
              <ColorPicker value='red' onComplete={onSelectColor}>
                <Preview />
                <Panel1 />
                <HueSlider />
                <Swatches />
              </ColorPicker>
              <TouchableOpacity className="bg-black opacity-40 items-center p-2" onPress={confirmColor}>
                <Text className="text-white">Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal >
      <TextInput
        ref={inputRef}
        onChangeText={setText}
        onBlur={savePath}
        value={text}
        className="h-0 w-0"
      />
    </View >
  )
}
