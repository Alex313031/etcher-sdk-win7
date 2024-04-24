/// <reference types="cyclic-32" />
import * as xxhash from 'xxhash-addon';
export declare type XXHash = typeof xxhash;
export declare const getRaspberrypiUsbboot: () => typeof import("node-raspberrypi-usbboot") | undefined;
export declare const getXXHash: () => typeof xxhash;
export declare const getUnmountDisk: () => (arg1: string) => Promise<void>;
export declare const getCrc: () => typeof import("cyclic-32");
