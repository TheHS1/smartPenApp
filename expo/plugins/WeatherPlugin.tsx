import { Text, View } from "react-native"
import { PlugInfo } from "@/plugins/PluginManager"
import { useEffect, useState } from "react"

export default function LatexPlugin(): PlugInfo {
  const title = "Weather Plugin"
  const description = "Fetches the current weather conditions from wttr.in based on location"

  interface FuncProps {
    data: {};
  }

  const Func = ({ data }: FuncProps) => {
    const [isLoading, setLoading] = useState(true);
    const [response, setResponse] = useState<string>("");

    const getData = async () => {
      try {
        const response = await fetch('https://wttr.in?format=3');
        setResponse(await response.text());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      getData();
    }, [data]);

    return (
      <View className="flex-1">
        {isLoading ? (
          <Text>Fetching your data...</Text>
        ) : (
          <Text>{response}</Text>
        )}
      </View>
    );
  }

  return {
    title,
    description,
    Func
  }
}
