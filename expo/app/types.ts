export interface transformData {
    scale: number;
    translateX: number;
    translateY: number;
}

export interface annotation {
    color: string;
    strokeSize: number;
    transform: transformData;
}

export interface textInfo extends annotation {
    text: string;
    x: number;
    y: number;
}

export interface pathInfo extends annotation {
    path: string;
    erase: boolean;
}

export interface fileInfo {
    pages: annotation[][];
}
