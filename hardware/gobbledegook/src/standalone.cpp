// Copyright 2017-2019 Paul Nettle
//
// This file is part of Gobbledegook.
//
// Use of this source code is governed by a BSD-style license that can be found
// in the LICENSE file in the root of the source tree.

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
// >>
// >>>  INSIDE THIS FILE
// >>
//
// This is an example single-file stand-alone application that runs a
// Gobbledegook server.
//
// >>
// >>>  DISCUSSION
// >>
//
// Very little is required ("MUST") by a stand-alone application to instantiate
// a valid Gobbledegook server. There are also some things that are reocommended
// ("SHOULD").
//
// * A stand-alone application MUST:
//
//     * Start the server via a call to `ggkStart()`.
//
//         Once started the server will run on its own thread.
//
//         Two of the parameters to `ggkStart()` are delegates responsible for
//         providing data accessors for the server, a `GGKServerDataGetter`
//         delegate and a 'GGKServerDataSetter' delegate. The getter method
//         simply receives a string name (for example, "battery/level") and
//         returns a void pointer to that data (for example: `(void
//         *)&batteryLevel`). The setter does the same only in reverse.
//
//         While the server is running, you will likely need to update the data
//         being served. This is done by calling
//         `ggkNofifyUpdatedCharacteristic()` or `ggkNofifyUpdatedDescriptor()`
//         with the full path to the characteristic or delegate whose data has
//         been updated. This will trigger your server's `onUpdatedValue()`
//         method, which can perform whatever actions are needed such as sending
//         out a change notification (or in BlueZ parlance, a
//         "PropertiesChanged" signal.)
//
// * A stand-alone application SHOULD:
//
//     * Shutdown the server before termination
//
//         Triggering the server to begin shutting down is done via a call to
//         `ggkTriggerShutdown()`. This is a non-blocking method that begins the
//         asynchronous shutdown process.
//
//         Before your application terminates, it should wait for the server to
//         be completely stopped. This is done via a call to `ggkWait()`. If the
//         server has not yet reached the `EStopped` state when `ggkWait()` is
//         called, it will block until the server has done so.
//
//         To avoid the blocking behavior of `ggkWait()`, ensure that the server
//         has stopped before calling it. This can be done by ensuring
//         `ggkGetServerRunState() == EStopped`. Even if the server has stopped,
//         it is recommended to call `ggkWait()` to ensure the server has
//         cleaned up all threads and other internals.
//
//         If you want to keep things simple, there is a method
//         `ggkShutdownAndWait()` which will trigger the shutdown and then block
//         until the server has stopped.
//
//     * Implement signal handling to provide a clean shut-down
//
//         This is done by calling `ggkTriggerShutdown()` from any signal
//         received that can terminate your application. For an example of this,
//         search for all occurrences of the string "signalHandler" in the code
//         below.
//
//     * Register a custom logging mechanism with the server
//
//         This is done by calling each of the log registeration methods:
//
//             `ggkLogRegisterDebug()`
//             `ggkLogRegisterInfo()`
//             `ggkLogRegisterStatus()`
//             `ggkLogRegisterWarn()`
//             `ggkLogRegisterError()`
//             `ggkLogRegisterFatal()`
//             `ggkLogRegisterAlways()`
//             `ggkLogRegisterTrace()`
//
//         Each registration method manages a different log level. For a full
//         description of these levels, see the header comment in Logger.cpp.
//
//         The code below includes a simple logging mechanism that logs to
//         stdout and filters logs based on a few command-line options to
//         specify the level of verbosity.
//
// >>
// >>>  Building with GOBBLEDEGOOK
// >>
//
// The Gobbledegook distribution includes this file as part of the Gobbledegook
// files with everything compiling to a single, stand- alone binary. It is built
// this way because Gobbledegook is not intended to be a generic library. You
// will need to make your custom modifications to it. Don't worry, a lot of work
// went into Gobbledegook to make it almost trivial to customize (see
// Server.cpp).
//
// If it is important to you or your build process that Gobbledegook exist as a
// library, you are welcome to do so. Just configure your build process to build
// the Gobbledegook files (minus this file) as a library and link against that
// instead. All that is required by applications linking to a Gobbledegook
// library is to include `include/Gobbledegook.h`.
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

#include "../include/Gobbledegook.h"
#include "ctpl_stl.h"
#include "opencv2/core/types.hpp"
#include <chrono>
#include <iostream>
#include <libcamera/libcamera.h>
#include <mutex>
#include <opencv2/calib3d/calib3d.hpp>
#include <opencv2/core.hpp>
#include <opencv2/features2d.hpp> // Include header for FAST
#include <opencv2/highgui.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/video.hpp>
#include <opencv2/videoio.hpp>
#include <pigpio.h>
#include <signal.h>
#include <sstream>
#include <sys/mman.h>
#include <thread>
#include <vector>

using namespace cv;
using namespace std;

#define minOpticPoints 2

//
// Constants
//

// Maximum time to wait for any single async process to timeout during
// initialization
static const int kMaxAsyncInitTimeoutMS = 30 * 1000;
const Size DIM(640, 480);

// Camera matrix (K)
const Mat K = (Mat_<double>(3, 3) << 359.8891228256634, 0.0, 335.1625120488727,
               0.0, 359.7463655695599, 220.7128714747221, 0.0, 0.0, 1.0);

// Distortion coefficients (D)
const Mat D = (Mat_<double>(4, 1) << -0.01684524332140226, -0.08959331600156382,
               0.31754669583708056, -0.42204012028321364);

//
// Server data values
//

// The svg string ("svg/string") reported by the server (see Server.cpp)
static string nextSend = "M ";

// CV data values
// Create the undistortion maps
Mat map1, map2;
Ptr<FastFeatureDetector> detector;

struct FlowData {
  Mat frame_gray;
  Mat old_gray;
  vector<Point2f> p0;
  Point2f flowAvg;
};

vector<Scalar> colors;
Mat old_frame, old_gray;
std::mutex posMutex; // protects message
Point2f pos(DIM.height / (float)2, DIM.width / (float)2);

// Make assumption that resolution of video input does not change
const Range leftRange = Range(0, DIM.height * 0.5);
const Range topRange = Range(0, DIM.width * 0.5);
const Range rightRange = Range(0.5 * DIM.height, DIM.height);
const Range bottomRange = Range(DIM.width * 0.5, DIM.width);
FlowData flowData[3];

// Create thread pool with 3 threads
ctpl::thread_pool p(3);
std::vector<std::future<void>> results(3);

//
// Logging
//

enum LogLevel { Debug, Verbose, Normal, ErrorsOnly };

// Our log level - defaulted to 'Normal' but can be modified via command-line
// options
LogLevel logLevel = Normal;

// Our full set of logging methods (we just log to stdout)
//
// NOTE: Some methods will only log if the appropriate `logLevel` is set
void LogDebug(const char *pText) {
  if (logLevel <= Debug) {
    std::cout << "  DEBUG: " << pText << std::endl;
  }
}
void LogInfo(const char *pText) {
  if (logLevel <= Verbose) {
    std::cout << "   INFO: " << pText << std::endl;
  }
}
void LogStatus(const char *pText) {
  if (logLevel <= Normal) {
    std::cout << " STATUS: " << pText << std::endl;
  }
}
void LogWarn(const char *pText) {
  std::cout << "WARNING: " << pText << std::endl;
}
void LogError(const char *pText) {
  std::cout << "!!ERROR: " << pText << std::endl;
}
void LogFatal(const char *pText) {
  std::cout << "**FATAL: " << pText << std::endl;
}
void LogAlways(const char *pText) {
  std::cout << "..Log..: " << pText << std::endl;
}
void LogTrace(const char *pText) {
  std::cout << "-Trace-: " << pText << std::endl;
}

//
// Signal handling
//

// We setup a couple Unix signals to perform graceful shutdown in the case of
// SIGTERM or get an SIGING (CTRL-C)
void signalHandler(int signum) {
  switch (signum) {
  case SIGINT:
    LogStatus("SIGINT recieved, shutting down");
    ggkTriggerShutdown();
    break;
  case SIGTERM:
    LogStatus("SIGTERM recieved, shutting down");
    ggkTriggerShutdown();
    break;
  }
}

//
// Server data management
//

// Called by the server when it wants to retrieve a named value
//
// This method conforms to `GGKServerDataGetter` and is passed to the server via
// our call to `ggkStart()`.
//
// The server calls this method from its own thread, so we must ensure our
// implementation is thread-safe. In our case, we're simply sending over stored
// values, so we don't need to take any additional steps to ensure
// thread-safety.
const void *dataGetter(const char *pName) {
  if (nullptr == pName) {
    LogError("NULL name sent to server data getter");
    return nullptr;
  }

  std::string strName = pName;

  if (strName == "svg/string") {
    return nextSend.c_str();
  }
  LogWarn((std::string("Unknown name for server data getter request: '") +
           pName + "'")
              .c_str());
  return nullptr;
}

// Called by the server when it wants to update a named value
//
// This method conforms to `GGKServerDataSetter` and is passed to the server via
// our call to `ggkStart()`.
//
// The server calls this method from its own thread, so we must ensure our
// implementation is thread-safe. In our case, we're simply sending over stored
// values, so we don't need to take any additional steps to ensure
// thread-safety.
int dataSetter(const char *pName, const void *pData) {
  if (nullptr == pName) {
    LogError("NULL name sent to server data setter");
    return 0;
  }
  if (nullptr == pData) {
    LogError("NULL pData sent to server data setter");
    return 0;
  }

  std::string strName = pName;

  if (strName == "svg/string") {
    printf("Resetting position\n");
    const lock_guard<mutex> lock(posMutex);
    pos.x = 0;
    pos.y = 0;
    // nextSend = static_cast<const char *>(pData);
    // LogDebug((std::string("Server data: text string set to '") + nextSend +
    // "'").c_str());
    return 1;
  }
  LogWarn((std::string("Unknown name for server data setter request: '") +
           pName + "'")
              .c_str());

  return 0;
}

// Function to undistort the image using fisheye model
Mat undistort(const Mat &img) {

  // Undistort the image
  Mat undistorted_img;
  cv::remap(img, undistorted_img, map1, map2, INTER_LINEAR, BORDER_CONSTANT);

  return undistorted_img;
}

void flow(int id, FlowData *flowData) {
  // calculate optical flow
  vector<uchar> status;
  vector<float> err;
  vector<Point2f> p1;
  TermCriteria criteria =
      TermCriteria((TermCriteria::COUNT) + (TermCriteria::EPS), 10, 0.03);
  vector<Point2f> good_new;
  if (!flowData->p0.empty()) {
    calcOpticalFlowPyrLK(flowData->old_gray, flowData->frame_gray, flowData->p0,
                         p1, status, err, Size(15, 15), 2, criteria);
    for (uint i = 0; i < p1.size(); i++) {
      // Select good points
      if (status[i] == 1) {
        good_new.push_back(p1[i]);
      }
    }
  }
  Point2f avg = Point2f(0, 0);

  if (!good_new.empty()) {
    for (unsigned int i = 0; i < good_new.size(); i++) {
      avg += p1[i] - flowData->p0[i];
    }
    avg.x /= good_new.size();
    avg.y /= good_new.size();
  }
  flowData->p0 = good_new;
  if (flowData->p0.size() < minOpticPoints) {
    vector<KeyPoint> keypoints;
    detector->detect(flowData->old_gray, keypoints);
    KeyPoint::convert(keypoints, flowData->p0);
  }
  flowData->flowAvg = avg;
}

//
// Entry point
//

// Libcamera camera
static shared_ptr<libcamera::Camera> camera;
string message = "";
std::mutex messMutex; // protects message
int first = 0;
int prevState = 1;

static void requestComplete(libcamera::Request *request) {
  if (request->status() == libcamera::Request::RequestCancelled)
    return;

  const libcamera::Request::BufferMap &buffers = request->buffers();
  for (auto bufferPair : buffers) {
    const libcamera::Stream *stream = bufferPair.first;

    libcamera::FrameBuffer *buffer = bufferPair.second;

    libcamera::StreamConfiguration const &cfg = stream->configuration();
    int fd = buffer->planes()[0].fd.get();
    uint8_t *ptr =
        static_cast<uint8_t *>(mmap(NULL, buffer->planes()[0].length,
                                    PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0));
    Mat image(cfg.size.height, cfg.size.width, CV_8UC3, ptr, cfg.stride);
    if (first == 0) {
      colors.push_back(Scalar(0, 0, 255));
      colors.push_back(Scalar(0, 255, 0));
      colors.push_back(Scalar(255, 0, 0));

      cvtColor(image, old_gray, COLOR_BGR2GRAY);
      old_gray = undistort(old_gray);
      // Initialize optical flow data structures
      flowData[0].old_gray = Mat(old_gray, rightRange, bottomRange);
      flowData[1].old_gray = Mat(old_gray, leftRange, bottomRange);
      flowData[2].old_gray = Mat(old_gray, rightRange, topRange);

      vector<KeyPoint> keypoints;
      for (int i = 0; i < 3; i++) {
        detector->detect(flowData[i].old_gray, keypoints);
        KeyPoint::convert(keypoints, flowData[i].p0);
        // goodFeaturesToTrack(flowData[i].old_gray, flowData[i].p0,
        // maxTomasiPoints,
        //   0.3, 7, Mat(), 7, false, 0.04);
      }

      first = 1;
    } else {
      // auto start = chrono::high_resolution_clock::now();
      Mat frame_gray;
      cvtColor(image, frame_gray, COLOR_BGR2GRAY);
      frame_gray = undistort(frame_gray);
      flowData[0].frame_gray = Mat(frame_gray, rightRange, bottomRange);
      flowData[1].frame_gray = Mat(frame_gray, leftRange, bottomRange);
      flowData[2].frame_gray = Mat(frame_gray, rightRange, topRange);

      results[0] = p.push(flow, &flowData[0]);
      results[1] = p.push(flow, &flowData[1]);
      results[2] = p.push(flow, &flowData[2]);

      results[0].get();
      results[1].get();
      results[2].get();

      Point2f avg = Point2f(0, 0);
      for (int i = 0; i < 3; i++) {
        avg += flowData[i].flowAvg;
      }
      avg.x /= 3;
      avg.y /= 3;

      const lock_guard<mutex> lock(posMutex);
      Point2f newPos = pos - avg;
      if (((int)newPos.x != (int)pos.x) || ((int)newPos.y != (int)pos.y)) {
        const lock_guard<mutex> lock2(messMutex);
        int state = gpioRead(4);
        if (state == 1 && prevState == 0) {
          message += "M";
        }
        prevState = state;
        if (state == 1) {
          message += to_string(static_cast<int>(pos.x)) + "," +
                     to_string(static_cast<int>(pos.y)) + " ";
        }
      }
      pos = newPos;
      // Now update the previous frame and previous points
      old_gray = frame_gray.clone();
      flowData[0].old_gray = Mat(old_gray, rightRange, bottomRange);
      flowData[1].old_gray = Mat(old_gray, leftRange, bottomRange);
      flowData[2].old_gray = Mat(old_gray, rightRange, topRange);
      // auto stop = chrono::high_resolution_clock::now();
      // auto duration = chrono::duration_cast<chrono::milliseconds>(stop -
      // start); cout << duration.count() << endl;
    }
  }
  /* Re-queue the Request to the camera. */
  request->reuse(libcamera::Request::ReuseBuffers);
  camera->queueRequest(request);
}

int main(int argc, char **ppArgv) {
  // A basic command-line parser
  for (int i = 1; i < argc; ++i) {
    std::string arg = ppArgv[i];
    if (arg == "-q") {
      logLevel = ErrorsOnly;
    } else if (arg == "-v") {
      logLevel = Verbose;
    } else if (arg == "-d") {
      logLevel = Debug;
    } else {
      LogFatal((std::string("Unknown parameter: '") + arg + "'").c_str());
      LogFatal("");
      LogFatal("Usage: standalone [-q | -v | -d]");
      return -1;
    }
  }
  // gpio
  if (gpioInitialise() < 0) {
    std::cerr << "pigpio initialisation failed" << std::endl;
    return 1;
  }
  gpioSetMode(4, PI_INPUT); // Set the GPIO pin to output mode
  gpioSetPullUpDown(4, PI_PUD_DOWN);

  // Setup our signal handlers
  signal(SIGINT, signalHandler);
  signal(SIGTERM, signalHandler);
  signal(SIGSEGV, signalHandler);

  // Initialize undistortion maps
  fisheye::initUndistortRectifyMap(K, D, Mat::eye(3, 3, CV_64F), K, DIM,
                                   CV_16SC2, map1, map2);

  // Initialize FAST detector
  detector = FastFeatureDetector::create(15, true);

  // Initialize libcamera
  unique_ptr<libcamera::CameraManager> cm =
      make_unique<libcamera::CameraManager>();
  cm->start();
  auto cameras = cm->cameras();
  if (cameras.empty()) {
    cout << "No cameras were identified on the system." << endl;
    cm->stop();
    return -1;
  }
  camera = cm->get(cameras[0]->id());
  camera->acquire();
  unique_ptr<libcamera::CameraConfiguration> config =
      camera->generateConfiguration({libcamera::StreamRole::Viewfinder});
  libcamera::StreamConfiguration &streamConfig = config->at(0);
  cout << "Default viewfinder configuration is: " << streamConfig.toString()
       << endl;

  streamConfig.size.width = 640;
  streamConfig.size.height = 480;

  int ret = camera->configure(config.get());
  if (ret) {
    cout << "Failed to configure camera" << endl;
    return -1;
  }
  config->validate();
  cout << "Final viewfinder configuration: " << streamConfig.toString() << endl;

  // apply configuration to camera

  camera->configure(config.get());

  libcamera::FrameBufferAllocator *allocator =
      new libcamera::FrameBufferAllocator(camera);
  for (libcamera::StreamConfiguration &cfg : *config) {
    int ret = allocator->allocate(cfg.stream());
    if (ret < 0) {
      cerr << "Can't allocate buffers" << endl;
      return -1;
    }
  }

  // frame capture settings
  libcamera::Stream *stream = streamConfig.stream();
  const vector<unique_ptr<libcamera::FrameBuffer>> &buffers =
      allocator->buffers(stream);
  vector<unique_ptr<libcamera::Request>> requests;
  for (unsigned int i = 0; i < buffers.size(); ++i) {
    unique_ptr<libcamera::Request> request = camera->createRequest();
    if (!request) {
      cerr << "Can't create request" << endl;
      return -1;
    }

    const unique_ptr<libcamera::FrameBuffer> &buffer = buffers[i];
    int ret = request->addBuffer(stream, buffer.get());
    if (ret < 0) {
      cerr << "Can't set buffer for request" << endl;
      return -1;
    }

    /*
     * Controls can be added to a request on a per frame basis.
     */
    libcamera::ControlList &controls = request->controls();
    controls.set(libcamera::controls::FrameDurationLimits,
                 libcamera::Span<const std::int64_t, 2>({16666, 16666}));
    controls.set(libcamera::controls::Brightness, 0.1);
    controls.set(libcamera::controls::ExposureValue, 0.25);

    requests.push_back(move(request));
  }

  // Set signals
  camera->requestCompleted.connect(requestComplete);

  // Start Capture
  camera->start();
  for (unique_ptr<libcamera::Request> &request : requests)
    camera->queueRequest(request.get());

  // Register our loggers
  ggkLogRegisterDebug(LogDebug);
  ggkLogRegisterInfo(LogInfo);
  ggkLogRegisterStatus(LogStatus);
  ggkLogRegisterWarn(LogWarn);
  ggkLogRegisterError(LogError);
  ggkLogRegisterFatal(LogFatal);
  ggkLogRegisterAlways(LogAlways);
  ggkLogRegisterTrace(LogTrace);

  // Start the server's ascync processing
  //
  // This starts the server on a thread and begins the initialization process
  //
  // !!!IMPORTANT!!!
  //
  //     This first parameter (the service name) must match tha name configured
  //     in the D-Bus permissions. See the Readme.md file for more information.
  //
  if (!ggkStart("gobbledegook", "Pen service", "Pen service", dataGetter,
                dataSetter, kMaxAsyncInitTimeoutMS)) {
    return -1;
  }

  // Wait for the server to start the shutdown process
  //
  // While we wait, every 1 millisecond, send next section of data over if more
  // than 20 bytes is stored
  while (ggkGetServerRunState() < EStopping) {
    std::this_thread::sleep_for(std::chrono::milliseconds(30));
    if (message.length() >= 20) {
      const lock_guard<mutex> lock(messMutex);
      nextSend = message.substr(0, 20);
      message.erase(0, 20);
      ggkNofifyUpdatedCharacteristic("/com/gobbledegook/svg/string");
      // cout << message << endl;
    }
  }

  // Clean up libcamera
  camera->stop();
  allocator->free(stream);
  delete allocator;
  camera->release();
  camera.reset();
  cm->stop();

  // Clean up pigpio
  gpioTerminate();

  printf("cleaned up libcamera and pigpio");

  // Wait for the server to come to a complete stop (CTRL-C from the command
  // line)
  if (!ggkWait()) {
    return -1;
  }

  // Return the final server health status as a success (0) or error (-1)
  return ggkGetServerHealth() == EOk ? 0 : 1;
}
