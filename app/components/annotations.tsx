import { useState } from "react";
import { View, Text, TouchableOpacity, GestureResponderEvent, Modal, SafeAreaView } from "react-native";
import { Svg, Path, Circle } from 'react-native-svg'
import Ionicons from '@expo/vector-icons/Ionicons';
import ColorPicker, { Panel1, Swatches, Preview, OpacitySlider, HueSlider, returnedResults } from 'reanimated-color-picker';
import { ReanimatedLogLevel, configureReanimatedLogger, useSharedValue } from "react-native-reanimated";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

export default function Annotations() {
  interface pathInfo {
    path: string[];
    erase: boolean;
    color: string;
    strokeSize: number;
  }

  enum actions {
    addPath,
    deletePath,
    clear
  }

  interface history {
    action: actions;
    paths?: pathInfo[];
  }

  const [paths, setPaths] = useState<pathInfo[]>([]);
  const selectedColor = useSharedValue('red');

  const [curDrawn, setCurDrawn] = useState<pathInfo>({ path: [], erase: false, color: 'red', strokeSize: 1 });
  const [showAnnotation, setShowAnnotation] = useState<boolean>(true);
  const [hist, setHist] = useState<history[]>([]);
  const [redoHist, setRedoHist] = useState<history[]>([]);

  const [showPicker, setShowPicker] = useState<boolean>(false);
  const maxStroke = 7;

  const updatePath = (event: GestureResponderEvent) => {
    if (!showAnnotation)
      return

    // Redo is reset if a change is made
    if (redoHist.length > 0) {
      setRedoHist([])
    }

    // get location of finger press
    const x = event.nativeEvent.locationX;
    const y = event.nativeEvent.locationY;

    const curPath = [...curDrawn.path];

    // Due to SVG format, make sure that points are in MX,Y format
    const point = `${curPath.length === 0 ? 'M' : ""}${x.toFixed(0)},${y.toFixed(0)}`;
    curPath.push(point)
    setCurDrawn({ ...curDrawn, path: curPath })
  };

  const savePath = () => {
    paths.push(curDrawn)
    hist.push({ action: actions.addPath })
    setCurDrawn({ ...curDrawn, path: [] });
  };

  const clearPath = () => {
    hist.push({ action: actions.clear, paths: paths.slice() })
    setPaths([])
    setCurDrawn({ ...curDrawn, path: [], erase: false })
  }

  const undoDraw = () => {
    const last = hist.pop()
    if (last === undefined)
      return

    switch (last.action) {
      case actions.addPath:
        const path = paths.pop();
        if (path === undefined)
          return
        redoHist.push({ action: actions.deletePath, paths: [path] })
        break;
      case actions.clear:
        if (!last.paths)
          return;
        redoHist.push({ action: actions.clear });
        setPaths(last.paths.slice());
        break;
    }
  }

  const redoDraw = () => {
    const first = redoHist.pop()
    if (first === undefined)
      return

    switch (first.action) {
      case actions.deletePath:
        if (first.paths === undefined)
          return
        paths.push(first.paths[0])
        hist.push({ action: actions.addPath })
        break;
      case actions.clear:
        hist.push({ action: actions.clear, paths: paths.slice() })
        setPaths([])
        break;
    }
  }

  const onSelectColor = (color: returnedResults) => {
    selectedColor.value = color.rgb;
  };

  const confirmColor = () => {
    curDrawn.color = selectedColor.value;
    setShowPicker(false)
  }

  const setStroke = () => {
    const size = Math.max((curDrawn.strokeSize + 2) % maxStroke, 1);
    setCurDrawn({ ...curDrawn, strokeSize: size });
  }

  return (
    <View className="flex-1 flex border-blue-500 border-4 w-full h-full">
      <View className="flex-initial flex flex-row p-2 items-end">
        <TouchableOpacity onPress={() => setShowPicker(!showPicker)} className="flex-1 items-center">
          <Ionicons name="color-palette" size={32} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={setStroke} className="flex-1 items-center">
          <Svg className="flex-1 items-center" viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={curDrawn.strokeSize * 10} fill={curDrawn.color} />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurDrawn({ ...curDrawn, erase: false })} className="flex-1 items-center">
          <Ionicons name="brush" size={32} color={curDrawn.erase ? "black" : "blue"} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setCurDrawn({ ...curDrawn, erase: true })} className="flex-1 items-center">
          <Ionicons name="beaker-sharp" size={32} color={curDrawn.erase ? "blue" : "black"} />
        </TouchableOpacity>
        <TouchableOpacity onPress={undoDraw} className="flex-1 items-center">
          <Ionicons name="arrow-undo" size={32} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={redoDraw} className="flex-1 items-center">
          <Ionicons name="arrow-redo" size={32} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={clearPath} className="flex-1 items-center">
          <Ionicons name="trash" size={32} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowAnnotation(!showAnnotation)} className="flex-1 items-center">
          <Ionicons name={showAnnotation ? "eye" : "eye-off"} size={32} color="black" />
        </TouchableOpacity>
      </View>
      <View onTouchMove={updatePath} onTouchEnd={savePath} className="flex-1">
        {showAnnotation && (
          <Svg className="absolute">
            {paths.map((path: pathInfo, index: number) => (
              <Path
                key={index}
                d={path.path.join(' ')}
                stroke={path.erase ? 'white' : path.color}
                fill={'transparent'}
                strokeWidth={path.strokeSize}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            <Path
              d={curDrawn.path.join('\n')}
              stroke={curDrawn.erase ? 'white' : selectedColor.value}
              fill={'transparent'}
              strokeWidth={curDrawn.strokeSize}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        )}
        <Svg className="">
          <Path
            d={"M49,90 55,90 62,90 68,92 72,95 74,99 76,103 76,108 77,113 77,118 77,124 76,131 72,139 68,147 64,154 61,162 58,168 55,174 52,179 50,183 47,188 45,191 43,194 42,195 40,196 39,196 38,196 38,194 38,191 39,187 42,183 45,179 48,176 51,171 55,167 59,163 62,159 65,155 68,152 69,151 69,151 69,151 70,151 70,151 71,151 72,151 74,151 76,151 79,152 83,154 88,155 93,156 98,156 101,156 104,156 107,155 112,152 117,148 123,143 128,139 132,134 135,130 136,126 137,123 138,119 138,116 138,113 138,111 138,109 138,107 138,106 138,105 138,105 138,105 138,107 137,110 136,113 135,117 133,120 131,124 128,131 125,138 123,146 120,155 118,164 116,172 115,178 114,183 114,186 114,186 114,186 116,185 119,182 123,179 126,177 130,176 135,175 141,174 149,174 155,174 161,173 166,171 171,169 175,166 180,162 185,156 190,149 193,144 193,140 193,138 191,138 186,138 181,138 174,138 168,141 160,145 153,149 148,154 144,159 140,165 138,173 135,182 134,191 133,198 133,202 134,204 138,205 143,205 147,205 152,205 157,203 162,202 167,200 171,198 176,197 181,195 186,194 191,192 195,190 199,188 203,184 206,179 208,173 210,165 212,157 215,148 217,139 219,130 222,121 224,113 226,105 227,99 228,93 228,88 228,83 228,80 228,80 226,80 225,83 225,88 224,94 224,100 223,105 221,113 219,124 216,136 214,149 212,162 210,174 209,183 209,189 209,193 209,194 209,194 211,195 213,196 215,196 217,197 220,197 225,197 231,195 238,190 243,183 247,177 249,170 251,164 252,157 252,150 253,142 253,135 254,127 255,119 256,112 258,104 260,96 262,88 264,82 265,77 266,72 266,70 266,68 264,68 261,68 256,68 252,72 249,76 248,81 248,86 248,92 247,102 244,118 241,135 239,151 238,165 237,175 236,183 236,188 236,192 236,194 236,196 237,197 239,198 241,198 244,199 247,200 250,200 253,201 256,201 260,201 264,201 268,201 270,201 273,199 275,197 277,194 279,190 282,186 285,183 287,179 290,176 292,174 295,172 297,170 300,168 302,166 304,164 306,163 308,161 310,159 312,156 313,154 315,151 316,148 318,145 319,142 321,139 323,137 324,134 327,132 330,129 333,127 336,125 339,125 341,125 343,125 345,125 347,129 348,133 351,138 354,143 356,149 359,155 362,161 362,166 362,170 362,172 362,175 359,178 356,180 353,183 348,185 342,189 334,193 326,196 320,198 315,199 312,199 309,199 306,199 302,197 299,195 297,193 295,190 295,187 295,183 295,180 295,176 296,172 297,168 299,165 301,162 303,160 305,157 307,155 309,153 310,150 312,147 313,145 314,142 316,140 317,138 318,136 319,133 320,132 322,130 323,129 324,128 325,127 327,127 329,127 330,127 332,127 334,127 336,129 338,130 341,132 344,132 347,133 350,133 354,133 358,133 362,133 367,133 371,132 374,130 376,128 377,125 377,124 377,124 M30,311 30,324 30,339 30,352 30,361 30,366 30,369 31,369 33,369 35,367 40,361 48,349 60,329 68,311 72,301 73,299 73,301 73,305 73,309 72,315 70,324 65,347 60,371 58,386 58,389 62,387 65,380 69,372 77,358 86,340 96,324 104,309 109,299 111,293 111,292 111,292 M151,306 147,308 141,311 134,316 128,320 123,325 118,331 110,343 101,365 94,384 92,394 92,397 92,397 95,398 99,398 104,399 110,399 118,399 128,396 139,392 150,385 161,378 169,369 173,361 175,353 175,346 175,339 173,332 169,325 165,319 161,316 156,313 152,311 147,309 143,308 139,307 M196,307 196,314 196,323 196,332 196,342 196,351 196,359 196,366 196,371 196,375 196,378 196,381 196,384 196,387 196,389 196,391 196,392 M213,294 220,298 226,303 232,308 237,313 241,318 244,323 245,327 246,331 246,334 245,337 241,340 235,342 229,343 224,344 219,345 216,345 215,345 214,345 215,345 218,345 220,348 224,352 227,358 231,366 234,374 235,380 237,385 237,387 238,388 M289,251 289,265 289,284 287,301 284,315 279,325 275,333 272,338 270,342 269,348 267,352 266,357 265,361 265,364 265,365 266,365 269,364 271,364 273,363 276,362 279,362 288,359 M330,265 330,279 330,293 330,306 327,318 325,327 323,333 322,336 322,338 322,339 322,340 322,341 322,341 322,342 322,347 322,355 322,363 322,368 322,370 M333,255 336,255 338,258 340,261 343,265 346,271 350,277 353,285 356,291 359,297 362,302 364,306 366,310 367,313 368,317 369,321 369,325 369,329 369,333 369,338 369,342 369,346 368,349 365,353 363,356 359,358 356,361 352,363 347,364 342,365 338,366 329,368"
            }
            stroke={'black'}
            fill={'transparent'}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Modal className="flex items-center w-full" visible={showPicker} animationType='slide' transparent={true}>
        <SafeAreaView>
          <View className="flex items-center">
            <View className="bg-gray-50 w-2/3 p-3">
              <ColorPicker value='red' onComplete={onSelectColor}>
                <Preview />
                <Panel1 />
                <HueSlider />
                <OpacitySlider />
                <Swatches />
              </ColorPicker>
              <TouchableOpacity className="bg-black opacity-40 items-center p-2" onPress={confirmColor}>
                <Text className="text-white">Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal >
    </View >
  )
}
