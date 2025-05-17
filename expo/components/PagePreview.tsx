import { View } from "react-native";
import Svg, { Path, Text } from "react-native-svg";
import { annotation, page, pathInfo, textInfo } from '../types';

interface previewProps {
  paths: page;
}

export default function PagePreview({ paths }: previewProps) {
  return (
    <View className="h-full w-full relative">
      <Svg
        className="absolute"
        viewBox="0 0 500 500"
      >
        {
          paths.annotations.map((annotation: annotation, index: number) => (
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
            )))}
        {paths.penStrokes.map((annotation: annotation, index: number) => (
          <Path
            key={index}
            d={(annotation as pathInfo).path}
            stroke={(annotation as pathInfo).erase ? 'white' : annotation.color}
            fill={'transparent'}
            strokeWidth={annotation.strokeSize}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </View>
  )

}
