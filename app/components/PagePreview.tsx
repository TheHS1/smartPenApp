import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from 'expo-file-system/next';
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface previewProps {
  fileName: string;
  pageNum: number;
}

export default function PagePreview({ fileName, pageNum }: previewProps) {
  const [paths, setPaths] = useState<pathInfo[]>([]);

  interface pathInfo {
    path: string;
    erase: boolean;
    color: string;
    strokeSize: number;
  }

  useEffect(() => {
    const fetchAnnotation = async () => {
      try {
        const savedFile = await AsyncStorage.getItem('curFile');
        if (!savedFile)
          return

        const file = new File(Paths.document, `${fileName}-${pageNum}.ispen`);
        if (!file.exists)
          return

        const fileContent = file.text();
        setPaths(JSON.parse(fileContent));
      } catch (err) {
        console.warn(err)
      }
    }

    fetchAnnotation().catch(console.error);
  }, [])

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
