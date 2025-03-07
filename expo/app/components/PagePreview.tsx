import { View } from "react-native";
import Svg, { Path, Text } from "react-native-svg";
import { annotation, pathInfo, textInfo } from '../types';

interface previewProps {
  paths: annotation[];
}

export default function PagePreview({ paths }: previewProps) {
  return (
    <View className="h-full w-full relative">
      <Svg
        className="absolute"
        viewBox="0 0 500 500"
      >
        {paths?.map((annotation: annotation, index: number) => (
          !('text' in annotation) ? (
            <Path
              key={index}
              d={(annotation as pathInfo).path}
              stroke={(annotation as pathInfo).erase ? 'white' : annotation.color}
              fill={'transparent'}
              strokeWidth={annotation.strokeSize}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            <Text
              key={index}
              fill={annotation.color}
              stroke="none"
              fontSize={annotation.strokeSize}
              x={(annotation as textInfo).x}
              y={(annotation as textInfo).y}
              dy={(annotation as textInfo).strokeSize * 0.75} // React Native Skia assumes anchor in top left vs bottom left for react-native-svg
              textAnchor="start"
            >
              {(annotation as textInfo).text}
            </Text>
          )
        ))}
      </Svg>
    </View>
  )

}
