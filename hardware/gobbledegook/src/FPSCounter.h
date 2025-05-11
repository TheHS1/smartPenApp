#include <chrono>
#include <iostream>

class FPSCounter {
public:
  FPSCounter() : frameCount(0), fps(0), elapsedTime(0.0f) {
    previousTime = std::chrono::high_resolution_clock::now();
  }

  void update() {
    auto currentTime = std::chrono::high_resolution_clock::now();
    float frameDeltaTime =
        std::chrono::duration<float>(currentTime - previousTime).count();
    previousTime = currentTime;

    frameCount++;
    elapsedTime += frameDeltaTime; // Accumulate the time

    // Check if 1 second or more has passed
    if (elapsedTime >= 1.0f) {
      fps = static_cast<int>(frameCount / elapsedTime); // Calculate FPS

      std::cout << "FPS " << fps << std::endl;

      frameCount = 0;
      elapsedTime -= 1.0f;
    }
  }

  int getFPS() const { return fps; }

private:
  int frameCount;
  int fps;
  float elapsedTime;
  std::chrono::time_point<std::chrono::high_resolution_clock> previousTime;
};
