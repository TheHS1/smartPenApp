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
  changeTool: (set: tools) => void;
  setStroke: () => void;
  toggleShowAnnotation: () => void;
  toggleShowPicker: () => void;
  undoDraw: () => void;
  redoAvailable: boolean;
  undoAvailable: boolean;
}

export default function AnnotationTools({ showAnnotation, strokeSize, selTool, color, clearPath, redoAvailable, redoDraw, changeTool, setStroke, toggleShowAnnotation, toggleShowPicker, undoAvailable, undoDraw }: toolProps) {
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
      <TouchableOpacity onPress={() => changeTool(tools.draw)} className="flex-1 items-center">
        <Ionicons name="brush" size={32} color={(selTool === tools.draw) ? "blue" : "black"} />
      </TouchableOpacity>

      {/*eraseTool*/}
      <TouchableOpacity onPress={() => changeTool(tools.erase)} className="flex-1 items-center">
        <Ionicons name="beaker-sharp" size={32} color={(selTool === tools.erase) ? "blue" : "black"} />
      </TouchableOpacity>

      {/*Text tool*/}
      <TouchableOpacity onPress={() => changeTool(tools.text)} className="flex-1 items-center">
        <Ionicons name="text-outline" size={32} color={(selTool === tools.text) ? "blue" : "black"} />
      </TouchableOpacity>

      {/*Edit tool*/}
      <TouchableOpacity onPress={() => changeTool(tools.edit)} className="flex-1 items-center">
        <Ionicons name="create-outline" size={32} color={(selTool === tools.edit) ? "blue" : "black"} />
      </TouchableOpacity>

      {/*undoRedo*/}
      <TouchableOpacity onPress={undoDraw} className="flex-1 items-center">
        <Ionicons name="arrow-undo" size={32} color={undoAvailable ? "black" : "gray"} />
      </TouchableOpacity>

      <TouchableOpacity onPress={redoDraw} className="flex-1 items-center">
        <Ionicons name="arrow-redo" size={32} color={redoAvailable ? "black" : "gray"} />
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
