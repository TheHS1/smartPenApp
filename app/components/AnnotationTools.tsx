import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { tools } from "./Annotations";

interface toolProps {
  showAnnotation: boolean;
  strokeSize: number;
  selTool: tools;
  color: string;
  clearPath: () => void;
  redoDraw: () => void;
  setSelTool: (set: tools) => void;
  setStroke: () => void;
  toggleShowAnnotation: () => void;
  toggleShowPicker: () => void;
  undoDraw: () => void;
}

export default function AnnotationTools({ showAnnotation, strokeSize, selTool, color, clearPath, redoDraw, setSelTool, setStroke, toggleShowAnnotation, toggleShowPicker, undoDraw }: toolProps) {
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
      <TouchableOpacity onPress={() => setSelTool(tools.draw)} className="flex-1 items-center">
        <Ionicons name="brush" size={32} color={(selTool === tools.draw) ? "blue" : "black"} />
      </TouchableOpacity>

      {/*eraseTool*/}
      <TouchableOpacity onPress={() => setSelTool(tools.erase)} className="flex-1 items-center">
        <Ionicons name="beaker-sharp" size={32} color={(selTool === tools.erase) ? "blue" : "black"} />
      </TouchableOpacity>

      {/*Text tool*/}
      <TouchableOpacity onPress={() => setSelTool(tools.text)} className="flex-1 items-center">
        <Ionicons name="text-outline" size={32} color={(selTool === tools.text) ? "blue" : "black"} />
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
