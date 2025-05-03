import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { tools } from "./Annotations";

interface toolProps {
  strokeSize: number;
  selTool: tools;
  color: string;
  changeTool: (set: tools) => void;
  setStroke: () => void;
  toggleShowPicker: () => void;
}

export default function AnnotationTools({ strokeSize, selTool, color, changeTool, setStroke, toggleShowPicker }: toolProps) {
  return (
    <View className="h-14 flex flex-row border-4 border-blue-400 mx-2 mb-3 items-center rounded-3xl">

      {/*paintTool*/}
      <TouchableOpacity onPress={toggleShowPicker} className="flex-1 items-center p-1">
        <Ionicons name="color-palette" size={32} color="black" />
      </TouchableOpacity>

      {/*strokeTool*/}
      <TouchableOpacity onPress={setStroke} className="flex-1 items-center p-1">
        <Svg className="flex-1 items-center" viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={strokeSize * 3} fill={color} />
        </Svg>
      </TouchableOpacity>

      {/*drawTool*/}
      <TouchableOpacity onPress={() => changeTool(tools.draw)} className="flex-1 items-center p-1">
        <Ionicons name="brush" size={32} color={(selTool === tools.draw) ? "blue" : "black"} />
      </TouchableOpacity>

      {/*eraseTool*/}
      <TouchableOpacity onPress={() => changeTool(tools.erase)} className="flex-1 items-center p-1">
        <Ionicons name="beaker-sharp" size={32} color={(selTool === tools.erase) ? "blue" : "black"} />
      </TouchableOpacity>

      {/*Text tool*/}
      <TouchableOpacity onPress={() => changeTool(tools.text)} className="flex-1 items-center p-1">
        <Ionicons name="text-outline" size={32} color={(selTool === tools.text) ? "blue" : "black"} />
      </TouchableOpacity>

      {/*Edit tool*/}
      <TouchableOpacity onPress={() => changeTool(tools.edit)} className="flex-1 items-center p-1">
        <Ionicons name="create-outline" size={32} color={(selTool === tools.edit) ? "blue" : "black"} />
      </TouchableOpacity>
    </View>

  )
}
