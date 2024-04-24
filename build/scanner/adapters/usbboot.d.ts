import { Adapter } from './adapter';
export declare class UsbbootDeviceAdapter extends Adapter {
    private drives;
    private scanner?;
    constructor();
    start(): void;
    stop(): void;
    private onAttach;
    private onDetach;
}
