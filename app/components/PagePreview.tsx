import { useIsFocused } from "@react-navigation/native";
import { File, Paths } from 'expo-file-system/next';
import { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface previewProps {
  fileName: string;
  pageNum: number;
}

export default function PagePreview({ fileName, pageNum }: previewProps) {
  const [paths, setPaths] = useState<pathInfo[]>([]);
  const focused = useIsFocused();

  interface pathInfo {
    path: string;
    erase: boolean;
    color: string;
    strokeSize: number;
  }

  useEffect(() => {
    const fetchAnnotation = async () => {
      try {
        const file = new File(Paths.document, `${pageNum}-${fileName}`);
        if (!file.exists)
          return

        const fileContent = file.text();
        setPaths(JSON.parse(fileContent));
      } catch (err) {
        console.warn(err)
      }
    }

    if (focused) {
      fetchAnnotation().catch(console.error);
    }
  }, [focused])

  return (
    <View className="h-full w-full relative">
      <Svg
        className="absolute"
        viewBox="0 0 500 500"
      >
        {paths.map((path: pathInfo, index: number) => (
          <Path
            key={index}
            d={path.path}
            stroke={path.erase ? 'white' : path.color}
            fill={'transparent'}
            strokeWidth={path.strokeSize}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

      </Svg>
    </View>
  )

}
