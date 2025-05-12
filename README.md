<img src="expo/assets/images/logo.png" width="400" height="auto">

# Intellisync Pen

A smart pen that digitizes physical pen strokes and analyzes them via a Companion App. This project was developed as a capstone project for San Jose State University's B.S. Computer Engineering program by Harjot Singh, Rishi Sheth, and Vineeth Chandra Sai Kandukuri and advised by Bernardo Flores, PhD. More information and demonstrations can be found [here](https://www.sjsu.edu/cmpe/research/project-expo/2025-spring.php).

## Abstract

Smart technology empowers people to complete ordinary tasks conveniently and efficiently through inter-device communication and automation. Existing products,  like the Livescribe smart pen, employ a proprietary pen and microdot paper system to facilitate note-taking for professionals. Another well-known company, reMarkable, approaches digital note-taking via a revolutionary e-ink digital tablet and stylus solution. The tablet functions as an ultra-thin paper-like surface for drawing that gets instantly translated to a digital medium on the tablet. This system has the advantage of offering pressure detection and note editing, but at high cost and requires an extra device.

Although the technology for text digitization is well-researched, one limitation of current products is their lack of inclusivity across domains, leading to numerous untapped markets. For instance, in the domain of creative writing, a smart pen should more heavily support writers, by providing feedback on their writing and suggestions for where to take their story to stimulate creativity. Writing is a personalized intellectual process, requiring diverse tools among individualized domains.

To solve this problem for diverse groups of writers, the smart pen integrated a bundle of plugins and user friendly tools such as automated PDF formatting via snippet expansion for note-takers and sentiment analysis for writers to provide feedback on their tone of writing. This provided the user with a greater understanding of their natural writing patterns and fostered writing enhancement via the companion application.

## Directory Structure

### Expo
React native Expo application designed for iOS and Android. Although the majority of functionality is available through Expo GO, the dev or release build is necessary for BLE functionality and to use the LaTeX Plugin.

### Hardware
Contains scripts for raspberry pi realtime image processing and communication via BLE using the [Gobbledegook](https://github.com/nettlep/gobbledegook) BLE application framework.

### API
Contains services for smart pen companion application, including optical character recognition via [Florence-2](https://arxiv.org/abs/2311.06242), sentiment analysis via [distilbert](https://huggingface.co/lxyuan/distilbert-base-multilingual-cased-sentiments-student), and automatic PDF formatting using [Mistletoe](https://github.com/miyuchina/mistletoe) to convert markdown formatting to latex and [LaTeXCompiler](https://github.com/amrane99/LatexCompiler) to compile the PDF.

### Scripts
Miscellaneous testing scripts that were used to develop the project but are not needed to run it.

## Build and Install Instructions
To begin, first clone the respository on the server, on the raspberry pi, and on a development computer

### On the pen device
1. Install Dependencies: 
```
$ sudo apt update && sudo apt install libopencv-dev wiringpi libcamera-dev -y
```
2. Install the latest version of pigpio from [here](https://abyz.me.uk/rpi/pigpio/download.html)
3. Run the following commands to compile the program
```
$ cd hardware/gobbledegook
$ autoreconf -i
$ ./configure && make
```
4. Run the compiled program: Note: PIGpio requires root to be run
```
# ./src/standalone
```

### Running the expo development server
Note: The following instructions are for building the iOS app only as the team did not have access to android devices. This process requires a Mac. Further information for expo development builds can be found [here](https://docs.expo.dev/develop/development-builds/create-a-build/)
1. Change directory into the Expo directory
```
$ cd expo
```
2. Install node dependencies (use the equivalent for your node package manager): 
```
$ npm install
```
3. Create .env file with the following content. Fill out ```SERVERIP``` and ```SERVERPORT``` with the correct information. The server uses port 5000 by default.
```
EXPO_PUBLIC_SERVER_URL=[SERVERIP]:[SERVERPORT]
```
4. Start the server to verify dependency installation. If a QR code is displayed then dependencies have been correctly installed and kill the server with ^C.
```
$ npx expo start
```
5. Ensure that [Xcode](https://developer.apple.com/documentation/safari-developer-tools/installing-xcode-and-simulators) and Xcode commandline tools are installed.
6. Attach physical device to Mac and click trust this computer when prompted.
7. Install the dev client dependency:
```
$ npx expo install expo-dev-client
```
8. Build the expo dev client. Pick your device from the list of devices when prompted.
```
$ npx expo run:ios --device
```
9. To resolve untrusted certificate error, navigate to Settings > General > VPN & Device Management and trust the certificate at the bottom of the page.
10. Restart the server and scan the QR code with the camera app on your device
```
$ npx expo start
```

### Running the server
1. Change directory into the API directory
```
$ cd api
```
2. Install requirements
```
$ pip install -r requirements.txt
```
3. Start the server. First launch will take a while as ML models will be downloaded. Using a CUDA capable GPU with at least 4GB of VRAM is recommended.
```
$ python server.py
```
