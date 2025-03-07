import { useEffect, useState } from "react";
import * as path from 'path'

export interface joe {
    title: string;
    description: string;
    iconPath: string;
    enabled: boolean;
}

export default function PluginManager() {
    const [plugins, setPlugins] = useState<joe[]>([]);

    useEffect(() => {
        plugVals
    }, [])


    return (
        Ok
    )

}

