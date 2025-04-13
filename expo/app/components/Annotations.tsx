import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, SafeAreaView, Button, TextInput } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { Panel1, Swatches, Preview, HueSlider, returnedResults } from 'reanimated-color-picker';
import { ReanimatedLogLevel, configureReanimatedLogger, runOnJS, useDerivedValue, useSharedValue } from "react-native-reanimated";
import AnnotationTools from "./AnnotationTools";
import { Canvas, Group, Path, SkPath, Skia, Paragraph, useCanvasRef, SkiaDomView } from "@shopify/react-native-skia";
import { annotation, pathInfo, textInfo } from "../types";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

export enum tools {
  draw,
  erase,
  text
}

interface annotationProps {
  data: string;
  annotations: annotation[];
  saveAnnotations: () => void;
  setAnnotations: (prevAnnotation: annotation[]) => void;
  canvRef: React.RefObject<SkiaDomView>;
}

export default function Annotations({ data, annotations, saveAnnotations, setAnnotations, canvRef }: annotationProps) {
  // Save annotations to file when they're changed
  useEffect(() => {
    saveAnnotations();
  }, [annotations])

  // History
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

  // Controls
  const maxStroke = 11;
  const [strokeSize, setStrokeSize] = useState<number>(1);
  const [showAnnotationState, setShowAnnotationState] = useState(true);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const selectedColor = useSharedValue('red');
  const [color, setColor] = useState<string>('red');

  // Text Data
  const [x, setX] = useState<number>(0);
  const [y, setY] = useState<number>(0);
  const [text, setText] = useState<string>("");

  // Path Data
  const [selTool, setSelTool] = useState<tools>(tools.draw);
  const curDrawn = useSharedValue<string>("");
  const showAnnotation = useSharedValue<boolean>(true);

  // Canvas Gesture Data
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

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
    if ((selTool === tools.erase || selTool === tools.draw) && annotationSave != "") {
      setAnnotations([...annotations, { color: color, strokeSize: strokeSize, path: annotationSave, erase: (selTool === tools.erase) } as pathInfo]);
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

  const inputRef = useRef<TextInput>(null);

  const focusInput = (xVal: number, yVal: number) => {
    if (selTool === tools.text && inputRef.current) {
      inputRef.current.focus();
      setX(Math.round(xVal - translateX.value) / scale.value);
      setY(Math.round(yVal - translateY.value) / scale.value);
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

  interface renAnnoProps {
    annotation: annotation;
  }

  const RenderAnnotations = ({ annotation }: renAnnoProps) => {
    if (!showAnnotation.value)
      return;

    if ('text' in annotation) {
      const textAnno = annotation as textInfo;
      return (<RenderText color={textAnno.color} size={textAnno.strokeSize} txt={textAnno.text} x={textAnno.x} y={textAnno.y} />)
    }
    const pathAnno = annotation as pathInfo;
    return (<RenderPath path={pathAnno.path} size={pathAnno.strokeSize} erase={pathAnno.erase} color={pathAnno.color} />)
  }

  const RenderPreview = () => {
    if (!showAnnotation.value)
      return;

    if (selTool === tools.text) {
      return (<RenderText color={color} size={strokeSize * 10} txt={text} x={x} y={y} />);
    }

    return (<RenderPath path={curDrawn.value} size={strokeSize} erase={(selTool === tools.erase)} color={color} />);
  }

  interface renTextProps {
    color: string;
    size: number;
    txt: string;
    x: number;
    y: number
  }

  interface renPathProps {
    path: string;
    size: number;
    erase: boolean;
    color: string;
  }

  const RenderText = ({ color, size, txt, x, y }: renTextProps) => {

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
      <Paragraph
        paragraph={makeParagraph(txt, color, size)}
        x={x}
        y={y}
        width={300}
      />
    )
  }

  const RenderPath = ({ path, size, erase, color }: renPathProps) => {
    return (
      <Path
        path={path}
        style="stroke"
        strokeWidth={size}
        strokeCap="round"
        strokeJoin={"round"}
        color={erase ? 'white' : color}
      />
    )
  }

  return (
    <View className="flex-1 flex border-blue-500 border-4 w-full h-full">
      <AnnotationTools
        strokeSize={strokeSize}
        selTool={selTool}
        showAnnotation={showAnnotationState}
        color={color}
        toggleShowPicker={toggleShowPicker}
        setStroke={setStroke}
        setSelTool={setSelTool}
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
            ref={canvRef}
          >
            <Group transform={transform}>
              {/* Show saved page strokes */}
              {annotations.map((annotation: annotation, index: number) => (
                <RenderAnnotations key={index} annotation={annotation} />
              ))}
              <RenderPreview />
              <Path /* Display Annotation Data streamed from pen */
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

      {/* Invisible text box to take text input */}
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
