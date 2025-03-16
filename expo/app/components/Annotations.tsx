import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, SafeAreaView, Button, TextInput } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { Panel1, Swatches, Preview, HueSlider, returnedResults } from 'reanimated-color-picker';
import { ReanimatedLogLevel, configureReanimatedLogger, runOnJS, useDerivedValue, useSharedValue } from "react-native-reanimated";
import AnnotationTools from "./AnnotationTools";
import { Canvas, Group, Paragraph, Path, SkPath, Skia } from "@shopify/react-native-skia";
import { annotation, pathInfo, textInfo, transformData } from "../types";
import Touchable, { useGestureHandler, } from 'react-native-skia-gesture';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

export enum tools {
  draw,
  edit,
  erase,
  text
}

interface annotationProps {
  data: string;
  annotations: annotation[];
  saveAnnotations: () => void;
  setAnnotations: (prevAnnotation: annotation[]) => void;
}

export default function Annotations({ data, annotations, saveAnnotations, setAnnotations }: annotationProps) {
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
  const selectedPath = useSharedValue(1);

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
    const tForm = { scale: 1, translateX: 0, translateY: 0 }

    if ((selTool === tools.erase || selTool === tools.draw) && annotationSave != "") {
      setAnnotations([...annotations, { color: color, strokeSize: strokeSize, path: annotationSave, erase: (selTool === tools.erase), transform: tForm } as pathInfo]);
    } else if (text != "") {
      setAnnotations([...annotations, { text: text, x: x, y: y, color: color, strokeSize: strokeSize * 10, transform: tForm } as textInfo]);
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

  // Canvas controls
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

  const movement = Gesture.Simultaneous(panGesture)

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

  const canvasGes = Gesture.Race(drawGesture, movement, tap)

  // for editing paths
  const scalePath = Gesture.Pinch()
    .onUpdate((e) => {
      if (selectedPath.value < 0) {
        return;
      }
      const ind = selectedPath.value;
      const oldAnno = annotations
      const tForm = {
        ...oldAnno[ind].transform,
        scale: oldAnno[ind].transform.scale * e.scale,
      }
      oldAnno[ind] = { ...oldAnno[ind], transform: tForm }
      console.log(annotations[ind]);
      runOnJS(setAnnotations)(oldAnno);
    })
    .onEnd(() => {
      // savedScale.value = scale.value;
    });

  const movePath = Gesture.Pan()
    .onUpdate(e => {
      // updatePath(e.x, e.y);
    })
    .onEnd(e => {
      // runOnJS(saveAnnotation)();
    })

  const editTransform = Gesture.Simultaneous(scalePath, movePath);
  const editGes = Gesture.Race(editTransform, Gesture.Tap());
  const emptyGes = Gesture.Simultaneous();

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
    id: number;
  }

  const RenderAnnotations = ({ annotation, id }: renAnnoProps) => {
    if (!showAnnotation.value)
      return;

    if ('text' in annotation) {
      const textAnno = annotation as textInfo;
      return (<RenderText color={textAnno.color} size={textAnno.strokeSize} txt={textAnno.text} x={textAnno.x} y={textAnno.y} transform={annotation.transform} />)
    }
    const pathAnno = annotation as pathInfo;
    return (<RenderPath path={pathAnno.path} size={pathAnno.strokeSize} erase={pathAnno.erase} color={pathAnno.color} transform={annotation.transform} id={id} />)
  }

  const RenderPreview = () => {
    if (!showAnnotation.value)
      return;

    const tForm = { scale: 1, translateX: 1, translateY: 1 }

    if (selTool === tools.text) {
      return (<RenderText color={color} size={strokeSize * 10} txt={text} x={x} y={y} transform={tForm} />);
    } else if (selTool === tools.draw || selTool === tools.erase) {
      return (<RenderPath path={curDrawn.value} size={strokeSize} erase={(selTool === tools.erase)} color={color} transform={tForm} />);
    }

    return
  }

  interface renTextProps {
    color: string;
    size: number;
    txt: string;
    x: number;
    y: number;
    transform: transformData;
  }

  interface renPathProps {
    path: string;
    size: number;
    erase: boolean;
    color: string;
    transform: transformData;
    id?: number;
  }

  const RenderText = ({ color, size, txt, x, y, transform }: renTextProps) => {
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
        transform={[transform]}
      />
    )
  }

  const RenderPath = ({ path, size, erase, color, transform, id }: renPathProps) => {
    const shareID = useSharedValue(id);

    const pathGesture = useGestureHandler({
      onStart: () => {
        'worklet';
        console.log(shareID.value)
        if (shareID.value && shareID.value >= 0) {
          console.log("set value")
          selectedPath.value = shareID.value;
        }
      },
    });

    console.log("RAW: " + path);

    const matrix = Skia.Matrix();
    console.log(translateX.value + " " + translateY.value);
    // matrix.translate(translateX.value, translateY.value);
    // matrix.scale(0.7 * scale.value - 0.3, 0.7 * scale.value - 0.3);
    //matrix.translate(transform.translateX, transform.translateY);
    // matrix.scale(transform.scale, transform.scale);
    console.log(matrix.get());
    const tForm = [{ scale: 1 / scale.value, translateX: -translateX.value, translateY: -translateY.value }]

    return (
      <Group>
        <Path
          path={(Skia.Path.MakeFromSVGString(path)?.transform(matrix) ?? Skia.Path.Make()).toSVGString()}
          style="stroke"
          strokeWidth={size}
          strokeCap="round"
          strokeJoin={"round"}
          color={'blue'}
        />
        <Touchable.Path
          path={path}
          style="stroke"
          strokeWidth={size}
          strokeCap="round"
          strokeJoin={"round"}
          color={erase ? 'white' : color}
          transform={[transform]}
          touchablePath={(Skia.Path.MakeFromSVGString(path)?.transform(matrix) ?? Skia.Path.Make())}
          {...pathGesture}
        />
      </Group>
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
        <GestureDetector gesture={selTool != tools.edit ? canvasGes : editGes}>
          <Touchable.Canvas
            style={{ flex: 1 }}
            className="absolute"
          >
            <Group transform={transform}>
              {/* Show saved page strokes */}
              {annotations.map((annotation: annotation, index: number) => (
                <RenderAnnotations key={index} annotation={annotation} id={index} />
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
          </Touchable.Canvas>
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
