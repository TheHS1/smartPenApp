import sys
import logging
import asyncio
import threading

from typing import Any, Union

from bless import (  # type: ignore
    BlessServer,
    BlessGATTCharacteristic,
    GATTCharacteristicProperties,
    GATTAttributePermissions,
)
import numpy as np
import cv2 as cv
import argparse
from picamera2 import Picamera2
from undistort import undistort

#logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(name=__name__)

# NOTE: Some systems require different synchronization methods.
trigger: Union[asyncio.Event, threading.Event]
trigger = asyncio.Event()

def read_request(characteristic: BlessGATTCharacteristic, **kwargs) -> bytearray:
    logger.debug(f"Reading {characteristic.value}")
    return characteristic.value


def write_request(characteristic: BlessGATTCharacteristic, value: Any, **kwargs):
    characteristic.value = value
    logger.debug(f"Char value set to {characteristic.value}")
    trigger.set()


async def run(loop):
    trigger.clear()
    # Instantiate the server
    my_service_name = "Pen service"
    server = BlessServer(name=my_service_name, loop=loop)
    server.read_request_func = read_request
    server.write_request_func = write_request

    # Add Service
    my_service_uuid = "00000001-710e-4a5b-8d75-3e5b444bc3cf"
    await server.add_new_service(my_service_uuid)

    # Add a Characteristic to the service
    my_char_uuid = "00000002-710e-4a5b-8d75-3e5b444bc3cf"

    char_flags = (
        GATTCharacteristicProperties.read
        | GATTCharacteristicProperties.write
        | GATTCharacteristicProperties.indicate
    )
    permissions = GATTAttributePermissions.readable | GATTAttributePermissions.writeable
    await server.add_new_characteristic(
        my_service_uuid, my_char_uuid, char_flags, None, permissions
    )

    logger.debug(server.get_characteristic(my_char_uuid))
    await server.start()
    logger.debug("Advertising")
    message = "M"

    while not await server.is_connected():
        await asyncio.sleep(1)

    picam2 = Picamera2()
    main={'format': 'RGB888', 'size': (640, 480)}
    sensor = {'output_size': (1920, 1080), 'bit_depth': 10}
    config = picam2.create_preview_configuration(main=main, sensor=sensor)
    print(config)
    picam2.configure(config)
    picam2.start()


    # params for ShiTomasi corner detection
    feature_params = dict( maxCorners = 50,
                           qualityLevel = 0.3,
                           minDistance = 7,
                           blockSize = 7 )
    # Parameters for lucas kanade optical flow
    lk_params = dict( winSize  = (15, 15),
                      maxLevel = 2,
                      criteria = (cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.03))

    # Take first frame and find corners in it
    old_frame = picam2.capture_array()
    print(old_frame.shape)
    #old_frame = undistort(old_frame)
    old_gray = cv.cvtColor(old_frame, cv.COLOR_BGR2GRAY)
    p0 = cv.goodFeaturesToTrack(old_gray, mask = None, **feature_params)
    # Create a mask image for drawing purposes
    mask = np.zeros_like(old_frame)

    pos = np.array([mask.shape[1] / 2, mask.shape[0]/2])


    while(1):
        frame = picam2.capture_array()
        #frame = undistort(frame)
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
                pos=pos+avg
                if(avg[0] < 0.01 and avg[1] < 0.01):
                    message += str(int(pos[0]/3)) + "," + str(int(pos[1]/3)) + " "
        await asyncio.sleep(0.001)

        # Now update the previous frame and previous points
        old_gray = frame_gray.copy()
        if good_new.shape[0] != p1.shape[0] or good_new.shape[0] < 7:
            p0 = cv.goodFeaturesToTrack(old_gray, mask = None, **feature_params)
        else:
            p0 = good_new.reshape(-1, 1, 2)
            await asyncio.sleep(1)
        if len(message) > 20:
            b = bytearray()
            b.extend(map(ord, message[0:20]))
            server.get_characteristic(my_char_uuid).value = b
            server.get_characteristic(my_char_uuid)
            server.update_value(my_service_uuid, "00000002-710e-4a5b-8d75-3e5b444bc3cf")
            message = message[20:]
        k = cv.waitKey(1) & 0xff
        if k == 27:
            break
        elif k == ord('c'):
            pos = np.array([mask.shape[1]/2, mask.shape[0]/2])
            

    await asyncio.sleep(5)
    await server.stop()


loop = asyncio.get_event_loop()
loop.run_until_complete(run(loop))
