export interface annotation {
    color: string;
    strokeSize: number;
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

export interface page {
    annotations: annotation[];
    penStrokes: pathInfo[];
}

export interface fileInfo {
    pages: page[];
}
