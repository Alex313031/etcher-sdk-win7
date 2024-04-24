import { Disk } from 'file-disk';
export declare function copy(diskFrom: Disk, partitionFrom: number | undefined, pathFrom: string, diskTo: Disk, partitionTo: number | undefined, pathTo: string): Promise<void>;
