import { Text } from "react-native"
import { PlugInfo } from "@/plugins/PluginManager"

export default function LatexPlugin(): PlugInfo {
  const title = "Sentiment Analysis"
  const description = "This plugin provides a report of the sentiment of the user's writing back to the user"

  // TODO: This value needs to be loaded from state instead
  const enabled = true

  const Func = () => {
    return (
      <Text>Sentiment Output</Text>
    )
  }

  return {
    title,
    description,
    enabled,
    Func
  }
}
