import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, SafeAreaView, Button, TextInput } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { Panel1, Swatches, Preview, HueSlider, returnedResults } from 'reanimated-color-picker';
import { ReanimatedLogLevel, configureReanimatedLogger, runOnJS, useDerivedValue, useSharedValue } from "react-native-reanimated";
import AnnotationTools from "./AnnotationTools";
import { Box, Canvas, Group, Paragraph, Path, SkPath, SkRect, Skia, SkiaDomView } from "@shopify/react-native-skia";
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
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.length) {
        return;
      }
      const oldAnno = [...annotations];
      oldAnno.splice(selectedAnno.value, 1);
      setAnnotations(oldAnno)
      selectedAnno.value = -1;
      setAnnoSelected(-1);
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
      case actions.editAnnotation:
        if (!last.annotations || last.index === undefined)
          return;

        if (last.index === pathSelected) {
          if ('text' in annotations[last.index]) {
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
        setRedoHist((prevRedoHist) => [...prevRedoHist, { action: actions.editAnnotation, annotations: [annotations[ind]], index: ind }]);
        const oldAnno = [...annotations];
        oldAnno[ind] = last.annotations[0];
        setAnnotations(oldAnno);
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
      case actions.editAnnotation:
        if (!first.annotations || !first.index)
          return;
        const ind = first.index;
        setHist((prevRedoHist) => [...prevRedoHist, { action: actions.editAnnotation, annotations: [annotations[ind]], index: ind }]);
        const oldAnno = [...annotations];
        oldAnno[ind] = first.annotations[0];
        setAnnotations(oldAnno);
    }

    setRedoHist(curHist);
  }

  const confirmColor = () => {
    if (selTool === tools.edit) {
      const oldAnno = [...annotations];
      const annotation = (oldAnno[selectedAnno.value] as pathInfo);
      oldAnno[selectedAnno.value] = { ...(annotation), color: selectedColor.value };
      setHist((prevHist) => [...prevHist, { action: actions.editAnnotation, annotations: [annotations[selectedAnno.value]], index: selectedAnno.value }]);
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
    const annos = [...annotations];
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
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.length) {
        return;
      }
      let origBounds: SkRect;
      if ('text' in annotations[selectedAnno.value]) {
        const textAnno = (annotations[selectedAnno.value] as textInfo);
        const paragraph = makeSkiaParagraph(textAnno.text, textAnno.color, textAnno.strokeSize);
        paragraph.layout(300);
        origBounds = { x: textAnno.x, y: textAnno.y, width: paragraph.getLongestLine(), height: paragraph.getHeight() }
      } else {
        origBounds = Skia.Path.MakeFromSVGString((annotations[selectedAnno.value] as pathInfo).path)?.getBounds() ?? { x: 0, y: 0, width: 0, height: 0 };
      }
      if ('text' in annotations[selectedAnno.value]) {
        // Calculate the center of the original bounds
        const centerX = origBounds.x + origBounds.width / 2;
        const centerY = origBounds.y + origBounds.height / 2;

        const scaleFactor = Math.pow(e.scale, 0.1);

        // Scale the text while keeping the center fixed
        mutatedx.value = centerX + ((origBounds.x - centerX) * scaleFactor);
        mutatedy.value = centerY + ((origBounds.y - centerY) * scaleFactor);

        // Adjust stroke size for scaling
        const textAnno = (annotations[selectedAnno.value] as textInfo);
        const paragraph = makeSkiaParagraph(textAnno.text, textAnno.color, mutatedStrokeSize.value * scaleFactor);
        mutatedStrokeSize.value = mutatedStrokeSize.value * scaleFactor;
        paragraph.layout(300);
        selected.value = { x: mutatedx.value, y: mutatedy.value, width: paragraph.getLongestLine(), height: paragraph.getHeight() };
      } else {
        const matrix = Skia.Matrix();
        matrix.translate(origBounds.x + origBounds.width / 2, origBounds.y + origBounds.height / 2);
        matrix.scale(e.scale, e.scale);
        matrix.translate(-(origBounds.x + origBounds.width / 2), -(origBounds.y + origBounds.height / 2));
        const newPath = Skia.Path.MakeFromSVGString((annotations[selectedAnno.value] as pathInfo).path)?.transform(matrix);
        if (newPath) {
          selected.value = newPath.getBounds();
          mutatedCurDrawn.value = newPath.toSVGString();
          mutatedStrokeSize.value = annotations[selectedAnno.value].strokeSize * e.scale;
        }
      }
    })
    .onEnd(() => {
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.length) {
        return;
      }
      runOnJS(setHist)([...hist, { action: actions.editAnnotation, annotations: [annotations[selectedAnno.value]], index: selectedAnno.value }]);
      const oldAnno = [...annotations];
      if ('text' in annotations[selectedAnno.value]) {
        (oldAnno[selectedAnno.value] as textInfo) = { ...(oldAnno[selectedAnno.value] as textInfo), x: mutatedx.value, y: mutatedy.value, strokeSize: mutatedStrokeSize.value }
      } else {
        (oldAnno[selectedAnno.value] as pathInfo) = { ...(oldAnno[selectedAnno.value] as pathInfo), path: mutatedCurDrawn.value, strokeSize: mutatedStrokeSize.value }
      }
      runOnJS(setAnnotations)(oldAnno);
    })

  const movePath = Gesture.Pan()
    .onUpdate(e => {
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.length) {
        return;
      }
      if ('text' in annotations[selectedAnno.value]) {
        const textAnno = (annotations[selectedAnno.value] as textInfo);
        const newX = textAnno.x + (e.translationX / scale.value);
        const newY = textAnno.y + (e.translationY / scale.value);
        mutatedx.value = newX;
        mutatedy.value = newY;
        selected.value = { ...selected.value, x: newX, y: newY };
      } else {
        const matrix = Skia.Matrix();
        matrix.translate(e.translationX / scale.value, e.translationY / scale.value);
        const newPath = Skia.Path.MakeFromSVGString((annotations[selectedAnno.value] as pathInfo).path)?.transform(matrix);
        if (newPath) {
          selected.value = newPath.getBounds();
          mutatedCurDrawn.value = newPath.toSVGString();
        }
      }
    })
    .onEnd(() => {
      if (selectedAnno.value < 0 || selectedAnno.value >= annotations.length) {
        return;
      }
      runOnJS(setHist)([...hist, { action: actions.editAnnotation, annotations: [annotations[selectedAnno.value]], index: selectedAnno.value }]);
      const oldAnno = [...annotations];
      if ('text' in oldAnno[selectedAnno.value]) {
        (oldAnno[selectedAnno.value] as textInfo) = { ...(oldAnno[selectedAnno.value] as textInfo), x: mutatedx.value, y: mutatedy.value }
      } else {
        (oldAnno[selectedAnno.value] as pathInfo) = { ...(oldAnno[selectedAnno.value] as pathInfo), path: mutatedCurDrawn.value }
      }
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

  return (
    <View className="flex-1 flex border-blue-500 border-4 w-full h-full">
      <AnnotationTools
        strokeSize={strokeSize}
        selTool={selTool}
        showAnnotation={showAnnotationState}
        color={color}
        toggleShowPicker={toggleShowPicker}
        setStroke={setStroke}
        changeTool={changeTool}
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
            ref={canvRef}
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
                  {annotations[pathSelected] && 'text' in annotations[pathSelected] ? (
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
