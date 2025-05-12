import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, SafeAreaView, Button, TextInput } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { Panel1, Swatches, Preview, HueSlider, returnedResults } from 'reanimated-color-picker';
import { ReanimatedLogLevel, configureReanimatedLogger, runOnJS, useDerivedValue, useSharedValue } from "react-native-reanimated";
import AnnotationTools from "./AnnotationTools";
import { Box, Canvas, Group, Paragraph, Path, SkPath, SkRect, Skia, SkiaDomView } from "@shopify/react-native-skia";
import { annotation, page, pathInfo, textInfo } from "../types";
import React from "react";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopBarTools from "./TopBarTools";

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
  annotations: page;
  canvRef: React.RefObject<SkiaDomView>;
  penData: pathInfo[];
  showPageSelector: boolean;
  saveAnnotations: () => void;
  setAnnotations: (prevAnnotation: page) => void;
  setShowPlugin: (state: boolean) => void;
  resetPenPos: () => Promise<void>;
  setShowPageSelector: (state: boolean) => void;
}

export default function Annotations({ penData, annotations, saveAnnotations, setAnnotations, setShowPlugin, canvRef, resetPenPos, showPageSelector, setShowPageSelector }: annotationProps) {
  // Save annotations to file when they're changed
  useEffect(() => {
    saveAnnotations();
  }, [annotations])

  // History
  enum actions {
    addAnnotation,
    deleteAnnotation,
    clear,
    editAnnotation,
  }

  interface history {
    action: actions;
    annotations?: annotation[];
    index?: number;
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
  const selectedAnno = useSharedValue(-1);
  const [pathSelected, setAnnoSelected] = useState<number>(-1);

  // show path edits
  const selected = useSharedValue<SkRect>({ x: 0, y: 0, width: 0, height: 0 })
  const mutatedCurDrawn = useSharedValue<string>("");
  const mutatedText = useSharedValue<string>("");
  const mutatedx = useSharedValue<number>(0);
  const mutatedy = useSharedValue<number>(0);
  const mutatedStrokeSize = useSharedValue<number>(0);

  const changeTool = (tool: tools) => {
    setAnnoSelected(-1);
    selectedAnno.value = -1;
    selected.value = { x: 0, y: 0, width: 0, height: 0 };
    mutatedCurDrawn.value = "";
    setSelTool(tool);
  }

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
      setAnnotations({ ...annotations, annotations: [...annotations.annotations, ({ color: color, strokeSize: strokeSize, path: annotationSave, erase: (selTool === tools.erase), transform: tForm } as pathInfo)] });
    } else if (text != "") {
      setAnnotations({ ...annotations, annotations: [...annotations.annotations, ({ text: text, x: x, y: y, color: color, strokeSize: strokeSize * 10, transform: tForm } as textInfo)] });
    }
    setHist((prevHist) => [...prevHist, { action: actions.addAnnotation }]);
    curDrawn.value = "";
    setText("");
  }

  const clearAnnotation = () => {
    if (selTool === tools.edit) {
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.annotations.length) {
        return;
      }
      const oldAnno = [...annotations.annotations];
      oldAnno.splice(selectedAnno.value, 1);
      setAnnotations({ ...annotations, annotations: oldAnno })
      selectedAnno.value = -1;
      setAnnoSelected(-1);
      selected.value = { x: 0, y: 0, width: 0, height: 0 };
    } else {
      setHist((prevHist) => [...prevHist, { action: actions.clear, annotations: annotations.annotations }]);
      setAnnotations({ ...annotations, annotations: [] });
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
        const curAnnotations = [...annotations.annotations];
        const annotation = curAnnotations.pop();
        if (annotation === undefined)
          return;

        setAnnotations({ ...annotations, annotations: curAnnotations });
        setRedoHist((prevRedoHist) => [...prevRedoHist, { action: actions.deleteAnnotation, annotations: [annotation] }]);

        break;
      case actions.clear:
        if (!last.annotations)
          return;
        setRedoHist((prevRedoHist) => [...prevRedoHist, { action: actions.clear }]);
        setAnnotations({ ...annotations, annotations: last.annotations.slice() });
        break;
      case actions.editAnnotation:
        if (!last.annotations || last.index === undefined)
          return;

        if (last.index === pathSelected) {
          if ('text' in annotations.annotations[last.index]) {
            const textAnno = last.annotations[0] as textInfo;
            const paragraph = makeSkiaParagraph(textAnno.text, textAnno.color, textAnno.strokeSize);
            paragraph.layout(300);
            mutatedx.value = textAnno.x;
            mutatedy.value = textAnno.y;
            selected.value = { x: textAnno.x, y: textAnno.y, width: paragraph.getLongestLine(), height: paragraph.getHeight() }
          } else {
            const pathAnno = last.annotations[0] as pathInfo;
            mutatedCurDrawn.value = pathAnno.path;
            selected.value = Skia.Path.MakeFromSVGString(pathAnno.path)?.getBounds() ?? { x: 0, y: 0, width: 0, height: 0 };
          }
          selectedColor.value = last.annotations[0].color;
          mutatedStrokeSize.value = last.annotations[0].strokeSize;
        }

        const ind = last.index;
        setRedoHist((prevRedoHist) => [...prevRedoHist, { action: actions.editAnnotation, annotations: [annotations.annotations[ind]], index: ind }]);
        const oldAnno = [...annotations.annotations];
        oldAnno[ind] = last.annotations[0];
        setAnnotations({ ...annotations, annotations: oldAnno });
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
        setAnnotations({ ...annotations, annotations: [...annotations.annotations, addAnnotation] });
        setHist((prevHist) => [...prevHist, { action: actions.addAnnotation }]);
        break;
      case actions.clear:
        setHist((prevHist) => [...prevHist, { action: actions.clear, annotations: annotations.annotations.slice() }]);
        setAnnotations({ ...annotations, annotations: [] });
        break;
      case actions.editAnnotation:
        if (!first.annotations || !first.index)
          return;
        const ind = first.index;
        setHist((prevRedoHist) => [...prevRedoHist, { action: actions.editAnnotation, annotations: [annotations.annotations[ind]], index: ind }]);
        const oldAnno = [...annotations.annotations];
        oldAnno[ind] = first.annotations[0];
        setAnnotations({ ...annotations, annotations: oldAnno });
    }

    setRedoHist(curHist);
  }

  const confirmColor = () => {
    if (selTool === tools.edit) {
      const oldAnno = [...annotations.annotations];
      const annotation = (oldAnno[selectedAnno.value] as pathInfo);
      oldAnno[selectedAnno.value] = { ...(annotation), color: selectedColor.value };
      setHist((prevHist) => [...prevHist, { action: actions.editAnnotation, annotations: [annotations.annotations[selectedAnno.value]], index: selectedAnno.value }]);
      setAnnotations({ ...annotations, annotations: oldAnno });
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
    setStrokeSize(size);
  }

  // Canvas controls
  const clamp = (num: number, min: number, max: number) => {
    'worklet';
    return Math.max(min, Math.min(num, max));
  }

  // helper method for making skia paragraphs
  const makeSkiaParagraph = (para: string, color: string, size: number) => {
    'worklet'
    const textStyle = {
      color: Skia.Color(color),
      fontSize: size,
    };
    return Skia.ParagraphBuilder.Make()
      .pushStyle(textStyle)
      .addText(para)
      .build();
  }
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
    const annos = [...annotations.annotations];
    for (let i = annos.length - 1; i >= 0; i--) {
      let bounds: SkRect;
      if ('text' in annos[i]) {
        const textAnno = (annos[i] as textInfo);
        const paragraph = makeSkiaParagraph(textAnno.text, textAnno.color, textAnno.strokeSize);
        paragraph.layout(300);
        bounds = { x: textAnno.x, y: textAnno.y, width: paragraph.getLongestLine(), height: paragraph.getHeight() }
      } else {
        bounds = Skia.Path.MakeFromSVGString((annos[i] as pathInfo).path)?.getBounds() ?? { x: 0, y: 0, height: 0, width: 0 };
      }
      if (bounds) {
        // Use bounding rectangle to check if user tapping path
        const tapX = (evt.x - translateX.value) / scale.value;
        const tapY = (evt.y - translateY.value) / scale.value;
        const xBounds = tapX >= bounds.x && tapX <= bounds.x + bounds.width;
        const yBounds = tapY >= bounds.y && tapY <= bounds.y + bounds.height;
        if (xBounds && yBounds) {
          runOnJS(setAnnoSelected)(i);
          selectedAnno.value = i;
          selected.value = bounds;
          const anno = annos[i];
          if ('text' in annos[i]) {
            mutatedText.value = (anno as textInfo).text;
            mutatedx.value = (anno as textInfo).x;
            mutatedy.value = (anno as textInfo).y;
          } else {
            mutatedCurDrawn.value = (anno as pathInfo).path;
          }
          selectedColor.value = anno.color
          mutatedStrokeSize.value = anno.strokeSize;
          break;
        }
      }
    }
  });

  // for editing paths
  const scalePath = Gesture.Pinch()
    .onUpdate((e) => {
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.annotations.length) {
        return;
      }
      let origBounds: SkRect;
      if ('text' in annotations.annotations[selectedAnno.value]) {
        const textAnno = (annotations.annotations[selectedAnno.value] as textInfo);
        const paragraph = makeSkiaParagraph(textAnno.text, textAnno.color, textAnno.strokeSize);
        paragraph.layout(300);
        origBounds = { x: textAnno.x, y: textAnno.y, width: paragraph.getLongestLine(), height: paragraph.getHeight() }
      } else {
        origBounds = Skia.Path.MakeFromSVGString((annotations.annotations[selectedAnno.value] as pathInfo).path)?.getBounds() ?? { x: 0, y: 0, width: 0, height: 0 };
      }
      if ('text' in annotations.annotations[selectedAnno.value]) {
        // Calculate the center of the original bounds
        const centerX = origBounds.x + origBounds.width / 2;
        const centerY = origBounds.y + origBounds.height / 2;

        const scaleFactor = Math.pow(e.scale, 0.1);

        // Scale the text while keeping the center fixed
        mutatedx.value = centerX + ((origBounds.x - centerX) * scaleFactor);
        mutatedy.value = centerY + ((origBounds.y - centerY) * scaleFactor);

        // Adjust stroke size for scaling
        const textAnno = (annotations.annotations[selectedAnno.value] as textInfo);
        const paragraph = makeSkiaParagraph(textAnno.text, textAnno.color, mutatedStrokeSize.value * scaleFactor);
        mutatedStrokeSize.value = mutatedStrokeSize.value * scaleFactor;
        paragraph.layout(300);
        selected.value = { x: mutatedx.value, y: mutatedy.value, width: paragraph.getLongestLine(), height: paragraph.getHeight() };
      } else {
        const matrix = Skia.Matrix();
        matrix.translate(origBounds.x + origBounds.width / 2, origBounds.y + origBounds.height / 2);
        matrix.scale(e.scale, e.scale);
        matrix.translate(-(origBounds.x + origBounds.width / 2), -(origBounds.y + origBounds.height / 2));
        const newPath = Skia.Path.MakeFromSVGString((annotations.annotations[selectedAnno.value] as pathInfo).path)?.transform(matrix);
        if (newPath) {
          selected.value = newPath.getBounds();
          mutatedCurDrawn.value = newPath.toSVGString();
          mutatedStrokeSize.value = annotations.annotations[selectedAnno.value].strokeSize * e.scale;
        }
      }
    })
    .onEnd(() => {
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.annotations.length) {
        return;
      }
      runOnJS(setHist)([...hist, { action: actions.editAnnotation, annotations: [annotations.annotations[selectedAnno.value]], index: selectedAnno.value }]);
      const oldAnno = [...annotations.annotations];
      if ('text' in annotations.annotations[selectedAnno.value]) {
        (oldAnno[selectedAnno.value] as textInfo) = { ...(oldAnno[selectedAnno.value] as textInfo), x: mutatedx.value, y: mutatedy.value, strokeSize: mutatedStrokeSize.value }
      } else {
        (oldAnno[selectedAnno.value] as pathInfo) = { ...(oldAnno[selectedAnno.value] as pathInfo), path: mutatedCurDrawn.value, strokeSize: mutatedStrokeSize.value }
      }
      runOnJS(setAnnotations)({ ...annotations, annotations: oldAnno });
    })

  const movePath = Gesture.Pan()
    .onUpdate(e => {
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.annotations.length) {
        return;
      }
      if ('text' in annotations.annotations[selectedAnno.value]) {
        const textAnno = (annotations.annotations[selectedAnno.value] as textInfo);
        const newX = textAnno.x + (e.translationX / scale.value);
        const newY = textAnno.y + (e.translationY / scale.value);
        mutatedx.value = newX;
        mutatedy.value = newY;
        selected.value = { ...selected.value, x: newX, y: newY };
      } else {
        const matrix = Skia.Matrix();
        matrix.translate(e.translationX / scale.value, e.translationY / scale.value);
        const newPath = Skia.Path.MakeFromSVGString((annotations.annotations[selectedAnno.value] as pathInfo).path)?.transform(matrix);
        if (newPath) {
          selected.value = newPath.getBounds();
          mutatedCurDrawn.value = newPath.toSVGString();
        }
      }
    })
    .onEnd(() => {
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.annotations.length) {
        return;
      }
      runOnJS(setHist)([...hist, { action: actions.editAnnotation, annotations: [annotations.annotations[selectedAnno.value]], index: selectedAnno.value }]);
      const oldAnno = [...annotations.annotations];
      if ('text' in oldAnno[selectedAnno.value]) {
        (oldAnno[selectedAnno.value] as textInfo) = { ...(oldAnno[selectedAnno.value] as textInfo), x: mutatedx.value, y: mutatedy.value }
      } else {
        (oldAnno[selectedAnno.value] as pathInfo) = { ...(oldAnno[selectedAnno.value] as pathInfo), path: mutatedCurDrawn.value }
      }
      runOnJS(setAnnotations)({ ...annotations, annotations: oldAnno });

    })

  const editTransform = Gesture.Race(scalePath, movePath);
  const editGes = Gesture.Race(editTransform, selectpath);

  const resetTransform = () => {
    'worklet'
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
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
    const paragraph = makeParagraph(txt, color, size);
    return (
      <Group>
        <Paragraph
          paragraph={paragraph}
          x={x}
          y={y}
          width={300}
        />
      </Group>
    )
  }

  const navigation = useNavigation();

  // set button action for menu button in header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TopBarTools
          showAnnotation={showAnnotationState}
          clearPath={clearAnnotation}
          undoDraw={undoAnnotation}
          redoDraw={redoDraw}
          toggleShowAnnotation={toggleShowAnnotation}
          redoAvailable={redoHist.length > 0}
          undoAvailable={hist.length > 0}
          resetPenPos={resetPenPos}
        />
      ),
    });
  }, [navigation, showAnnotationState, redoHist.length, hist.length]);
  return (
    <SafeAreaView className="flex-1 w-full h-full">
      <View className="flex-1 flex w-full h-full">
        <GestureHandlerRootView>
          <GestureDetector gesture={selTool != tools.edit ? canvasGes : editGes}>
            <Canvas
              style={{ flex: 1 }}
              className="absolute"
              ref={canvRef}
            >
              <Group transform={transform}>
                {/* Show saved page strokes */}
                {annotations.annotations.map((annotation: annotation, index: number) => (
                  pathSelected != index && (
                    <RenderAnnotations key={index} annotation={annotation} />
                  )))}
                {annotations.penStrokes.map((annotation: annotation, index: number) => (
                  <RenderAnnotations key={index} annotation={annotation} />
                ))}
                <RenderPreview />
                {pathSelected >= 0 && selTool === tools.edit && (
                  <Group>
                    {annotations.annotations[pathSelected] && 'text' in annotations.annotations[pathSelected] ? (
                      <Paragraph
                        paragraph={makeParagraph(mutatedText.value, selectedColor.value, mutatedStrokeSize.value)}
                        x={mutatedx}
                        y={mutatedy}
                        width={300}
                      />
                    ) : (
                      <Path
                        path={mutatedCurDrawn}
                        style="stroke"
                        strokeWidth={mutatedStrokeSize}
                        strokeCap="round"
                        color={selectedColor}
                      />
                    )}

                    <Box box={selected} style="stroke" color="blue" strokeWidth={5}></Box>
                  </Group>
                )}
                {penData.map((stroke: pathInfo, index: number) => (
                  <RenderAnnotations key={index} annotation={stroke} />
                ))}
              </Group>
            </Canvas>
          </GestureDetector>
        </GestureHandlerRootView>
        <AnnotationTools
          strokeSize={strokeSize}
          selTool={selTool}
          color={color}
          toggleShowPicker={toggleShowPicker}
          setStroke={setStroke}
          changeTool={changeTool}
        />
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
        <View className="absolute m-2 border rounded-lg bg-white">
          <TouchableOpacity className="p-2" onPress={() => setShowPageSelector(!showPageSelector)}>
            <Ionicons name="menu" size={32} color="blue" />
          </TouchableOpacity>
          {<TouchableOpacity className="p-2" onPress={resetTransform}>
            <Ionicons name="contract-outline" size={32} color="blue" />
          </TouchableOpacity>
          }
          <TouchableOpacity className="p-2 rounded-lg" onPress={() => { setShowPlugin(true) }}>
            <Ionicons name="extension-puzzle-outline" size={32} color="orange" />
          </TouchableOpacity>
        </View>
      </View >
    </SafeAreaView>
  )
}
