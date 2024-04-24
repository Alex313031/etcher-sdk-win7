import { Disk } from 'file-disk';
import { Dictionary } from '../../utils';
export declare type Partition = number | {
    primary: number;
    logical?: number;
};
export interface FileOnPartition {
    partition?: Partition;
    image?: string;
    path: string;
}
export interface CopyOperation {
    command: 'copy';
    from: FileOnPartition;
    to: FileOnPartition;
    when: Dictionary<string>;
}
export interface DeviceTypeJSON {
    configuration: {
        config: FileOnPartition;
        operations?: CopyOperation[];
    };
    yocto: {
        archive?: boolean;
    };
}
export declare function shouldRunOperation(options: Dictionary<any>, operation: CopyOperation): boolean;
export declare function normalizePartition(partition: Partition): number;
export declare function configure(disk: Disk, config?: Dictionary<any>): Promise<void>;
