import { Text } from "react-native"
import { PlugInfo } from "@/plugins/PluginManager"

export default function LatexPlugin(): PlugInfo {
  const title = "Latex Plugin"
  const description = "This plugin converts the text that was written by hand into latex code by expanding snippets and then providing a PDF file to to the user. Please check the documentation for more information"

  // TODO: This value needs to be loaded from state instead
  const enabled = true

  const Func = () => {
    return (
      <Text>Latex Output</Text>
    )
  }

  return {
    title,
    description,
    enabled,
    Func
  }
}
