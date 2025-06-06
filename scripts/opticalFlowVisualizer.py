import numpy as np
import cv2 as cv
import argparse

cap = cv.VideoCapture('tcp://192.168.1.248:8554')
# params for ShiTomasi corner detection
feature_params = dict( maxCorners = 50,
                       qualityLevel = 0.3,
                       minDistance = 7,
                       blockSize = 7 )
# Parameters for lucas kanade optical flow
lk_params = dict( winSize  = (15, 15),
                  maxLevel = 2,
                  criteria = (cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.03))
# Create some random colors
color = np.random.randint(0, 255, (100, 3))
# Take first frame and find corners in it
ret, old_frame = cap.read()
old_gray = cv.cvtColor(old_frame, cv.COLOR_BGR2GRAY)
p0 = cv.goodFeaturesToTrack(old_gray, mask = None, **feature_params)
# Create a mask image for drawing purposes
mask = np.zeros_like(old_frame)

# pos = np.zeros((2, ))
pos = np.array([mask.shape[1] / 2, mask.shape[0]/2])
print(old_frame.shape)
while(1):
    ret, frame = cap.read()
    if not ret:
        print('No frames grabbed!')
        break
    frame_gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
    # calculate optical flow
    if p0 is not None:
        p1, st, err = cv.calcOpticalFlowPyrLK(old_gray, frame_gray, p0, None, **lk_params)
        # Select good points
        if p1 is not None:
            good_new = p1[st==1]
            good_old = p0[st==1]
        if good_new.shape[0] > 0:
            # draw the tracks
            avg=np.average(good_new - good_old, axis = 0)
            for i, (new, old) in enumerate(zip(good_new, good_old)):
                a, b = new.ravel()
                c, d = old.ravel()
                mask = cv.line(mask, (int(pos[0]), int(pos[1])), (int(pos[0]) + int(avg[0]), int(pos[1]) + int(avg[1])), color[i].tolist(), 2)
                frame = cv.circle(frame, (int(a), int(b)), 5, color[i].tolist(), -1)

            flipped = cv.flip(mask, -1)

            pos=pos+avg
            img = cv.add(frame, flipped)
            cv.imshow('frame', img)
            k = cv.waitKey(1) & 0xff
            if k == 27:
                break
            elif k == ord('c'):
                pos = np.array([mask.shape[1] / 2, mask.shape[0]/2])
                mask = np.zeros_like(old_frame)
    # Now update the previous frame and previous points
    old_gray = frame_gray.copy()
    # p0 = good_new.reshape(-1, 1, 2)
    if good_new.shape[0] != p1.shape[0] or good_new.shape[0] < 7:
        p0 = cv.goodFeaturesToTrack(old_gray, mask = None, **feature_params)
        # mask = np.zeros_like(old_frame)
    else:
        p0 = good_new.reshape(-1, 1, 2)
cv.destroyAllWindows()

