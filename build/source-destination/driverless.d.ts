import { DriverlessDevice as WinUsbDriverlessDevice } from 'winusb-driver-generator';
import { AdapterSourceDestination } from '../scanner/adapters/adapter';
import { SourceDestination } from './source-destination';
export declare class DriverlessDevice extends SourceDestination implements AdapterSourceDestination {
    accessible: boolean;
    raw: null;
    device: null;
    devicePath: null;
    isSystem: boolean;
    mountpoints: never[];
    size: null;
    emitsProgress: boolean;
    deviceDescriptor: {
        idVendor: number;
        idProduct: number;
    };
    description: string;
    constructor(driverlessDevice: WinUsbDriverlessDevice);
}
