import { Text, View } from "react-native"
import { PlugInfo } from "@/plugins/PluginManager"
import { useEffect, useState } from "react"

export default function LatexPlugin(): PlugInfo {
  const title = "Weather Plugin"
  const description = "Fetches the current weather conditions from wttr.in based on location"

  // TODO: This value needs to be loaded from state instead
  const enabled = true

  const Func = () => {
    const [isLoading, setLoading] = useState(true);
    const [data, setData] = useState<string>("");

    const getData = async () => {
      try {
        const response = await fetch('https://wttr.in?format=3');
        setData(await response.text());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      getData();
    }, []);

    return (
      <View className="flex-1">
        {isLoading ? (
          <Text>Fetching your data...</Text>
        ) : (
          <Text>{data}</Text>
        )}
      </View>
    );
  }

  return {
    title,
    description,
    enabled,
    Func
  }
}
