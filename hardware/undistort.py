# Undistortion script tuned for 160 degree fov imx219 camera

import numpy as np
import sys
import cv2 as cv2

DIM=(640, 480)
K=np.array([[359.8891228256634, 0.0, 335.1625120488727], [0.0, 359.7463655695599, 220.7128714747221], [0.0, 0.0, 1.0]])
D=np.array([[-0.01684524332140226], [-0.08959331600156382], [0.31754669583708056], [-0.42204012028321364]])
def undistort(img):
    h,w = img.shape[:2]
    map1, map2 = cv2.fisheye.initUndistortRectifyMap(K, D, np.eye(3), K, DIM, cv2.CV_16SC2)
    undistorted_img = cv2.remap(img, map1, map2, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    # cv2.imshow("undistorted", undistorted_img)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    return undistorted_img
if __name__ == '__main__':
    for p in sys.argv[1:]:
        undistort(p)
