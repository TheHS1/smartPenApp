export interface pathInfo {
    path: string;
    erase: boolean;
    color: string;
    strokeSize: number;
    isText: boolean;
}

export interface fileInfo {
    pages: pathInfo[][];
}


