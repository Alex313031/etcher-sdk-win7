import { Drive as $Drive } from 'drivelist';
import { Adapter } from './adapter';
export interface DrivelistDrive extends $Drive {
    displayName: string;
    icon?: string;
}
export declare class BlockDeviceAdapter extends Adapter {
    includeSystemDrives: () => boolean;
    private unmountOnSuccess;
    private oWrite;
    private oDirect;
    private drives;
    private running;
    private ready;
    constructor({ includeSystemDrives, unmountOnSuccess, write, direct, }: {
        includeSystemDrives?: () => boolean;
        unmountOnSuccess?: boolean;
        write?: boolean;
        direct?: boolean;
    });
    start(): void;
    stop(): void;
    private scanLoop;
    private scan;
    private listDrives;
}
