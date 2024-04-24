import { Adapter } from './adapter';
export declare class UsbBBbootDeviceAdapter extends Adapter {
    private drives;
    private scanner;
    constructor();
    start(): void;
    stop(): void;
    private onAttach;
    private onDetach;
}
