import { Adapter } from './adapter';
declare class DriverlessDeviceAdapter$ extends Adapter {
    private drives;
    private running;
    private ready;
    private listDriverlessDevices;
    start(): void;
    stop(): void;
    private scanLoop;
    private scan;
    private listDrives;
}
export declare const DriverlessDeviceAdapter: typeof DriverlessDeviceAdapter$ | undefined;
export {};
