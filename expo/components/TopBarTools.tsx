import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

interface toolProps {
  showAnnotation: boolean;
  clearPath: () => void;
  redoDraw: () => void;
  toggleShowAnnotation: () => void;
  undoDraw: () => void;
  redoAvailable: boolean;
  undoAvailable: boolean;
  resetPenPos: () => void;
}

export default function TopBarTools({ showAnnotation, redoAvailable, clearPath, redoDraw, toggleShowAnnotation, undoAvailable, undoDraw, resetPenPos }: toolProps) {
  const router = useRouter();
  return (
    <View className="flex flex-row ml-10">

      {/*undoRedo*/}
      <TouchableOpacity onPress={undoDraw} className="flex-1 items-center p-1">
        <Ionicons name="arrow-undo" size={28} color={undoAvailable ? "black" : "gray"} />
      </TouchableOpacity>

      <TouchableOpacity onPress={redoDraw} className="flex-1 items-center p-1">
        <Ionicons name="arrow-redo" size={28} color={redoAvailable ? "black" : "gray"} />
      </TouchableOpacity>

      {/*resetPen*/}
      <TouchableOpacity className="flex-1 items-center p-1" onPress={resetPenPos}>
        <Ionicons name="reload" size={16} color="black" className="absolute right-1 bottom-1" />
        <Ionicons name="pencil" size={32} color="black" />
      </TouchableOpacity>

      {/*clear*/}
      <TouchableOpacity onPress={clearPath} className="flex-1 items-center p-1">
        <Ionicons name="trash" size={32} color="black" />
      </TouchableOpacity>

      {/*showHide*/}
      <TouchableOpacity onPress={toggleShowAnnotation} className="flex-1 items-center p-1">
        <Ionicons name={showAnnotation ? "eye" : "eye-off"} size={28} color="black" />
      </TouchableOpacity>

      {/*ProfileButton*/}
      <TouchableOpacity className="flex-1 items-center p-1"
        onPress={() => {
          router.push({ pathname: '/documents/Profile' })
        }}
      >
        <Ionicons name="person" size={28} color="#007AFF" />
      </TouchableOpacity>
    </View>

  )
}
