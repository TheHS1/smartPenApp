import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { pathInfo } from '../types';

interface previewProps {
  paths: pathInfo[];
}

export default function PagePreview({ paths }: previewProps) {

  return (
    <View className="h-full w-full relative">
      <Svg
        className="absolute"
        viewBox="0 0 500 500"
      >
        {paths?.map((path: pathInfo, index: number) => (
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
