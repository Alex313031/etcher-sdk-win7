import { UsbbootDevice } from 'node-raspberrypi-usbboot';
import { AdapterSourceDestination } from '../scanner/adapters/adapter';
import { SourceDestination } from './source-destination';
export declare class UsbbootDrive extends SourceDestination implements AdapterSourceDestination {
    usbDevice: UsbbootDevice;
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
    constructor(usbDevice: UsbbootDevice);
}
