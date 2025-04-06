import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, SafeAreaView, Button, TextInput } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { Panel1, Swatches, Preview, HueSlider, returnedResults } from 'reanimated-color-picker';
import { ReanimatedLogLevel, configureReanimatedLogger, runOnJS, useDerivedValue, useSharedValue } from "react-native-reanimated";
import AnnotationTools from "./AnnotationTools";
import { Box, Canvas, Group, Paragraph, Path, SkPath, SkRect, Skia } from "@shopify/react-native-skia";
import { annotation, pathInfo, textInfo } from "../types";
import React from "react";

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
  const selectedPath = useSharedValue(-1);
  const [pathSelected, setPathSelected] = useState<number>(-1);

  // show path edits
  const selected = useSharedValue<SkRect>({ x: 0, y: 0, width: 0, height: 0 })
  const mutatedCurDrawn = useSharedValue<string>("");

  const updatePath = (x: number, y: number) => {
    'worklet';
    if (!showAnnotation.value)
      return;

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
    if (selTool === tools.edit) {
      if (selectedPath.value < 0 || selectedPath.value >= annotations.length) {
        return;
      }
      const oldAnno = [...annotations];
      oldAnno.splice(selectedPath.value, 1);
      setAnnotations(oldAnno)
      selectedPath.value = -1;
      setPathSelected(-1);
      selected.value = { x: 0, y: 0, width: 0, height: 0 };
    } else {
      setHist((prevHist) => [...prevHist, { action: actions.clear, annotations: annotations }]);
      setAnnotations([]);
      setRedoHist([]);
      curDrawn.value = "";
    }
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
    if (selTool === tools.edit) {
      const oldAnno = [...annotations];
      const annotation = (oldAnno[selectedPath.value] as pathInfo);
      oldAnno[selectedPath.value] = { ...(annotation), color: selectedColor.value };
      setAnnotations(oldAnno);
    } else {
      setColor(selectedColor.value);
    }
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
    if (selTool === tools.edit) {
      const oldAnno = [...annotations];
      const annotation = (oldAnno[selectedPath.value] as pathInfo);
      oldAnno[selectedPath.value] = { ...(annotation), strokeSize: size }
      setAnnotations(oldAnno);
    }
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
    .onEnd(_ => {
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

  const movement = Gesture.Simultaneous(pinchGesture, panGesture)

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

  const selectpath = Gesture.Tap().onEnd((evt) => {
    const annos = [...annotations];
    for (let i = annos.length - 1; i >= 0; i--) {
      const bounds = Skia.Path.MakeFromSVGString((annos[i] as pathInfo).path)?.getBounds();
      if (bounds) {
        // Use bounding rectangle to check if user tapping path
        const xBounds = evt.x >= bounds.x && evt.x <= bounds.x + bounds.width;
        const yBounds = evt.y >= bounds.y && evt.y <= bounds.y + bounds.height;
        if (xBounds && yBounds) {
          runOnJS(setPathSelected)(i);
          selectedPath.value = i;
          selected.value = bounds;
          const anno = (annos[i] as pathInfo);
          mutatedCurDrawn.value = anno.path;
          runOnJS(setStrokeSize)(anno.strokeSize);
          selectedColor.value = anno.color
          break;
        }
      }
    }
  });

  // for editing paths
  const scalePath = Gesture.Pinch()
    .onUpdate((e) => {
      if (selectedPath.value < 0 || selectedPath.value >= annotations.length) {
        return;
      }
      const matrix = Skia.Matrix();
      matrix.scale(e.scale, e.scale);
      const newPath = Skia.Path.MakeFromSVGString((annotations[selectedPath.value] as pathInfo).path)?.transform(matrix);
      if (newPath) {
        selected.value = newPath.getBounds();
        mutatedCurDrawn.value = newPath.toSVGString();
      }
    })
    .onEnd(() => {
      if (selectedPath.value < 0 || selectedPath.value >= annotations.length) {
        return;
      }
      const oldAnno = [...annotations];
      (oldAnno[selectedPath.value] as pathInfo) = { ...(oldAnno[selectedPath.value] as pathInfo), path: mutatedCurDrawn.value }
      runOnJS(setAnnotations)(oldAnno);
    })

  const movePath = Gesture.Pan()
    .onUpdate(e => {
      if (selectedPath.value < 0 || selectedPath.value >= annotations.length) {
        return;
      }
      const matrix = Skia.Matrix();
      matrix.translate(e.translationX, e.translationY);
      const newPath = Skia.Path.MakeFromSVGString((annotations[selectedPath.value] as pathInfo).path)?.transform(matrix);
      if (newPath) {
        selected.value = newPath.getBounds();
        mutatedCurDrawn.value = newPath.toSVGString();
      }
    })
    .onEnd(() => {
      if (selectedPath.value < 0 || selectedPath.value >= annotations.length) {
        return;
      }
      const oldAnno = [...annotations];
      (oldAnno[selectedPath.value] as pathInfo) = { ...(oldAnno[selectedPath.value] as pathInfo), path: mutatedCurDrawn.value }
      runOnJS(setAnnotations)(oldAnno);

    })

  const editTransform = Gesture.Race(scalePath, movePath);
  const editGes = Gesture.Race(editTransform, selectpath);

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

    return (
      <Path
        path={pathAnno.path}
        style="stroke"
        strokeWidth={pathAnno.strokeSize}
        strokeCap="round"
        color={pathAnno.erase ? 'white' : pathAnno.color}
      />
    )
  }

  const RenderPreview = () => {
    if (!showAnnotation.value)
      return;

    if (selTool === tools.text) {
      return (<RenderText color={color} size={strokeSize * 10} txt={text} x={x} y={y} />);
    } else if (selTool === tools.draw || selTool === tools.erase) {
      return (
        <Path
          path={curDrawn}
          style="stroke"
          strokeWidth={strokeSize}
          strokeCap="round"
          color={(selTool === tools.erase) ? 'white' : color}
        />
      )
    }

    return
  }

  interface renTextProps {
    color: string;
    size: number;
    txt: string;
    x: number;
    y: number;
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
          <Canvas
            style={{ flex: 1 }}
            className="absolute"
          >
            <Group transform={transform}>
              {/* Show saved page strokes */}
              {annotations.map((annotation: annotation, index: number) => (
                pathSelected != index && (
                  <RenderAnnotations key={index} annotation={annotation} />
                )))}
              <RenderPreview />
              {pathSelected >= 0 && selTool === tools.edit && (
                <Group>
                  <Path
                    path={mutatedCurDrawn}
                    style="stroke"
                    strokeWidth={strokeSize}
                    strokeCap="round"
                    color={selectedColor}
                  />
                  <Box box={selected} style="stroke" color="blue" strokeWidth={5}></Box>
                </Group>
              )}
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
