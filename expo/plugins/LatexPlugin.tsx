import { Dimensions, Text, View } from "react-native"
import { PlugInfo } from "@/plugins/PluginManager"
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Pdf, { Source } from "react-native-pdf";
import { Base64 } from "react-native-ble-plx";
import * as FileSystem from 'expo-file-system';

export default function LatexPlugin(): PlugInfo {
  const title = "Latex Plugin";
  const description = "This plugin converts the text that was written by hand into latex code by expanding snippets and then providing a PDF file to to the user. Please check the documentation for more information";
  const dependencies = ["ocr", "svgData"];

  // TODO: This value needs to be loaded from state instead
  const enabled = true;

  interface FuncProps {
    data: {};
  }

  const Func = ({ data }: FuncProps) => {
    const [shownPDF, setShownPDF] = useState<Source>({});
    const [isLoading, setLoading] = useState(true);
    const [pdfVersion, setPdfVersion] = useState<number>(0);

    useEffect(() => {
      let ocrData: {} = {}
      let svg_paths: {} = {}
      if ("svgData" in data) {
        svg_paths = data["svgData"];
      }
      if ("ocr" in data) {
        ocrData = data["ocr"];
      }
      if (ocrData == "") {
        return;
      }

      setLoading(true);
      fetch("http://192.168.1.220:5000/latex_plugin", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'ocrData': ocrData, 'options': [], 'svg_paths': svg_paths })
      })
        .then(response => {
          return response.blob();
        })
        .then(blob => {
          return blobToBase64(blob);
        })
        .then(base64Data => {
          return savePDF(base64Data, 'output.pdf');
        })
        .then(uri => {
          const path = `${FileSystem.documentDirectory}${uri}`;
          setShownPDF({ uri: path });
          setPdfVersion((old) => old + 1);
          setLoading(false);
        })

    }, [data])

    const savePDF = async (pdfData: Base64, fileUri: string) => {
      try {
        const directory = FileSystem.documentDirectory + fileUri;
        await FileSystem.writeAsStringAsync(directory, pdfData, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return fileUri;
      } catch (error) {
        console.log(error)
      }
    }
    const blobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };

        reader.onerror = (error) => {
          reject(error);
        };

        reader.readAsDataURL(blob);
      });
    };

    return (
      <View>
        {pdfVersion > 0 ? (
          isLoading ? (
            <Text className="font-sm font-gray-300">Fetching your data...</Text>
          ) : (
            <Pdf
              key={pdfVersion}
              source={shownPDF}
              style={styles.pdf}
            />
          )
        ) : (
          <Text className="font-sm font-gray-300">Execute to see the output!</Text>
        )}
      </View>
    )
  }

  const styles = StyleSheet.create({
    pdf: {
      flex: 1,
      width: Dimensions.get('window').width - 10,
      height: Dimensions.get('window').height - 10,
    }
  });

  return {
    title,
    description,
    enabled,
    Func,
    dependencies
  }
}
