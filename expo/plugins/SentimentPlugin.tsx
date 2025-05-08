import { Dimensions, Text, View } from "react-native"
import { PlugInfo } from "@/plugins/PluginManager"
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

export default function SentimentPlugin(): PlugInfo {
  const title = "Sentiment Analysis Plugin"
  const description = "This plugin provides a report of the sentiment of the user's writing back to the user"
  const dependencies = ["ocr"];

  // TODO: This value needs to be loaded from state instead
  const enabled = true;

  interface FuncProps {
    data: {};
  }

  const Func = ({ data }: FuncProps) => {
    const [isLoading, setLoading] = useState(true);
    const [positivePercent, setPositivePercent] = useState<number>(0);
    const [neutralPercent, setNeutralPercent] = useState<number>(0);
    const [negativePercent, setNegativePercent] = useState<number>(0);

    useEffect(() => {
      let sentimentData = ""
      for (const dependency of dependencies) {
        if (dependency in data) {
          sentimentData += data[dependency];
        }
      }
      if (sentimentData == "") {
        return;
      }

      setLoading(true);
      fetch("http://192.168.1.220:5000/sentiment_plugin", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'sentimentData': sentimentData, 'options': [] })
      })
        .then(response => {
          return response.json();
        })
        .then(respData => {
          const positive = Math.round(parseFloat(respData['sentiment_results'][0][0]['score']) * 100);
          const neutral = Math.round(parseFloat(respData['sentiment_results'][0][1]['score']) * 100);
          const negative = Math.round(parseFloat(respData['sentiment_results'][0][2]['score']) * 100);
          setPositivePercent(positive);
          setNeutralPercent(neutral);
          setNegativePercent(negative);
          setLoading(false);
        })

    }, [data])

    return (
      <View>
        {positivePercent > 0 || neutralPercent > 0 || negativePercent > 0 ? (
          isLoading ? (
            <Text font-sm font-gray-300>Fetching your data...</Text>
          ) : (
            <View className="w-full flex" style={{ height: 100 }}>
              <View className="flex-1 flex-row mt-2">
                <Ionicons name="happy-outline" size={28} color="#facc15" />
                <View className="ml-2" style={{ width: `${positivePercent}%`, backgroundColor: '#fecaca' }}>
                </View>
              </View>
              <View className="flex-1 flex-row mt-2">
                <Ionicons name="invert-mode-outline" size={28} color="gray" />
                <View className="ml-2" style={{ backgroundColor: "#e5e7eb", width: `${neutralPercent}%` }}>
                </View>
              </View>
              <View className="flex-1 flex-row mt-2">
                <Ionicons name="sad-outline" size={28} color="blue" />
                <View className="ml-2" style={{ backgroundColor: "#bfdbfe", width: `${negativePercent}%` }} >
                </View>
              </View>
            </View>
          )
        ) : (
          <Text className="font-sm font-gray-300">Execute to see the output!</Text>
        )}
      </View>
    )
  }

  return {
    title,
    description,
    enabled,
    Func,
    dependencies
  }
}
