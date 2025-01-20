import AsyncStorage from "@react-native-async-storage/async-storage";
import { fileInfo } from "./types"

export const getFiles = async () => {
    const fileNames = await AsyncStorage.getItem('files')
    let files: Map<string, fileInfo> = new Map();
    if (fileNames) {
        files = new Map(JSON.parse(fileNames));
    }
    return files;
}

