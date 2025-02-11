import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface toolProps {
  showAnnotation: boolean;
  strokeSize: number;
  erase: boolean;
  text: boolean;
  color: string;
  clearPath: () => void;
  redoDraw: () => void;
  setErase: (set: boolean) => void;
  setStroke: () => void;
  setText: (set: boolean) => void;
  toggleShowAnnotation: () => void;
  toggleShowPicker: () => void;
  undoDraw: () => void;
}

export default function AnnotationTools({ showAnnotation, strokeSize, erase, text, color, clearPath, redoDraw, setErase, setStroke, setText, toggleShowAnnotation, toggleShowPicker, undoDraw }: toolProps) {
  return (
    <View className="flex-initial flex flex-row p-2 items-end">

      {/*paintTool*/}
      <TouchableOpacity onPress={toggleShowPicker} className="flex-1 items-center">
        <Ionicons name="color-palette" size={32} color="black" />
      </TouchableOpacity>

      {/*strokeTool*/}
      <TouchableOpacity onPress={setStroke} className="flex-1 items-center">
        <Svg className="flex-1 items-center" viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={strokeSize * 3} fill={color} />
        </Svg>
      </TouchableOpacity>

      {/*drawTool*/}
      <TouchableOpacity onPress={() => setErase(false)} className="flex-1 items-center">
        <Ionicons name="brush" size={32} color={erase ? "black" : "blue"} />
      </TouchableOpacity>

      {/*eraseTool*/}
      <TouchableOpacity onPress={() => setErase(true)} className="flex-1 items-center">
        <Ionicons name="beaker-sharp" size={32} color={erase ? "blue" : "black"} />
      </TouchableOpacity>

      {/*Text tool*/}
      <TouchableOpacity onPress={() => setText(true)} className="flex-1 items-center">
        <Ionicons name="text-outline" size={32} color={text ? "blue" : "black"} />
      </TouchableOpacity>

      {/*undoRedo*/}
      <TouchableOpacity onPress={undoDraw} className="flex-1 items-center">
        <Ionicons name="arrow-undo" size={32} color="black" />
      </TouchableOpacity>

      <TouchableOpacity onPress={redoDraw} className="flex-1 items-center">
        <Ionicons name="arrow-redo" size={32} color="black" />
      </TouchableOpacity>

      {/*clear*/}
      <TouchableOpacity onPress={clearPath} className="flex-1 items-center">
        <Ionicons name="trash" size={32} color="black" />
      </TouchableOpacity>

      {/*showHide*/}
      <TouchableOpacity onPress={toggleShowAnnotation} className="flex-1 items-center">
        <Ionicons name={showAnnotation ? "eye" : "eye-off"} size={32} color="black" />
      </TouchableOpacity>
    </View>

  )
}
