import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, SafeAreaView, Button, TextInput } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { Panel1, Swatches, Preview, HueSlider, returnedResults } from 'reanimated-color-picker';
import { ReanimatedLogLevel, configureReanimatedLogger, runOnJS, useDerivedValue, useSharedValue } from "react-native-reanimated";
import AnnotationTools from "./AnnotationTools";
import { Canvas, Group, Path, SkPath, Skia, Paragraph } from "@shopify/react-native-skia";
import { annotation, pathInfo, textInfo } from "../types";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

interface annotationProps {
  data: string;
  annotations: annotation[];
  saveAnnotations: () => void;
  setAnnotations: (prevAnnotation: annotation[]) => void;
}

export default function Annotations({ data, annotations, saveAnnotations, setAnnotations }: annotationProps) {
  enum actions {
    addAnnotation,
    deleteAnnotation,
    clear
  }

  interface history {
    action: actions;
    annotations?: annotation[];
  }

  const [hist, setHist] = useState<history[]>([]);
  const [redoHist, setRedoHist] = useState<history[]>([]);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [showAnnotationState, setShowAnnotationState] = useState(true);
  const [color, setColor] = useState<string>('red');
  const [strokeSize, setStrokeSize] = useState<number>(1);

  const [isText, setIsText] = useState<boolean>(false);
  const [x, setX] = useState<number>(0);
  const [y, setY] = useState<number>(0);

  const [erase, setErase] = useState<boolean>(false);
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

  // Save annotations to file when they're changed
  useEffect(() => {
    saveAnnotations();
  }, [annotations])

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

  const saveAnnotation = () => {
    const annotationSave = curDrawn.value;
    if (!isText && annotationSave != "") {
      setAnnotations([...annotations, { color: color, strokeSize: strokeSize, path: annotationSave, erase: erase } as pathInfo]);
    } else if (text != "") {
      setAnnotations([...annotations, { text: text, x: x, y: y, color: color, strokeSize: strokeSize * 10 } as textInfo]);
    }
    setHist((prevHist) => [...prevHist, { action: actions.addAnnotation }]);
    curDrawn.value = "";
    setText("");
  }

  const clearAnnotation = () => {
    setHist((prevHist) => [...prevHist, { action: actions.clear, annotations: annotations }]);
    setAnnotations([]);
    setErase(false);
    setRedoHist([]);
    curDrawn.value = "";
  }

  const undoAnnotation = () => {
    const curHist = [...hist];
    const last = curHist.pop();
    if (last === undefined)
      return;

    switch (last.action) {
      case actions.addAnnotation:
        const curAnnotations = [...annotations];
        const annotation = curAnnotations.pop();
        if (annotation === undefined)
          return;

        setAnnotations(curAnnotations);
        setRedoHist((prevRedoHist) => [...prevRedoHist, { action: actions.deleteAnnotation, annotations: [annotation] }]);

        break;
      case actions.clear:
        if (!last.annotations)
          return;
        setRedoHist((prevRedoHist) => [...prevRedoHist, { action: actions.clear }]);
        setAnnotations(last.annotations.slice());
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
      case actions.deleteAnnotation:
        if (first.annotations === undefined)
          return;

        const addAnnotation = first.annotations[0];
        setAnnotations([...annotations, addAnnotation]);
        setHist((prevHist) => [...prevHist, { action: actions.addAnnotation }]);
        break;
      case actions.clear:
        setHist((prevHist) => [...prevHist, { action: actions.clear, annotations: annotations.slice() }]);
        setAnnotations([]);
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
      runOnJS(saveAnnotation)();
    })

  const movement = Gesture.Simultaneous(panGesture, pinchGesture)

  const inputRef = useRef(null);

  const focusInput = (xVal: number, yVal: number) => {
    if (isText && inputRef.current) {
      inputRef.current.focus();
      setX((xVal - translateX.value) / scale.value);
      setY((yVal - translateY.value) / scale.value);
    }
  }

  const tap = Gesture.Tap().onEnd((evt) => {
    runOnJS(focusInput)(evt.x, evt.y);
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

  const [text, setText] = useState<string>("");
  const makeParagraph = (para: string, color: string, size: number) => {
    const textStyle = {
      color: Skia.Color(color),
      fontSize: size,
    };
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
        undoDraw={undoAnnotation}
        redoDraw={redoDraw}
        clearPath={clearAnnotation}
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
                annotations.map((annotation: annotation, index: number) => (
                  !('text' in annotation) ? (
                    <Path
                      key={index}
                      path={(annotation as pathInfo).path}
                      style="stroke"
                      strokeWidth={annotation.strokeSize}
                      strokeCap={"round"}
                      strokeJoin={"round"}
                      color={(annotation as pathInfo).erase ? 'white' : annotation.color}
                    />
                  ) : (
                    <Paragraph
                      paragraph={makeParagraph((annotation as textInfo).text, (annotation as textInfo).color, annotation.strokeSize)}
                      x={(annotation as textInfo).x}
                      y={(annotation as textInfo).y}
                      width={300}
                    />
                  )
                ))
              )}
              {showAnnotation.value && (
                isText ? (
                  <Paragraph
                    paragraph={makeParagraph(text, color, strokeSize * 10)}
                    x={x}
                    y={y}
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
        onBlur={saveAnnotation}
        value={text}
        className="h-0 w-0"
      />
    </View >
  )
}
