import { UsbBBbootDevice } from '@balena/node-beaglebone-usbboot';
import { AdapterSourceDestination } from '../scanner/adapters/adapter';
import { SourceDestination } from './source-destination';
export declare class UsbBBbootDrive extends SourceDestination implements AdapterSourceDestination {
    usbDevice: UsbBBbootDevice;
    raw: null;
    displayName: string;
    device: null;
    devicePath: null;
    icon: string;
    isSystem: boolean;
    description: string;
    mountpoints: never[];
    isReadOnly: boolean;
    disabled: boolean;
    size: null;
    emitsProgress: boolean;
    progress: number;
    constructor(usbDevice: UsbBBbootDevice);
}
