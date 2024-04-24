/// <reference types="node" />
import { Drive as DrivelistDrive } from 'drivelist';
import { ReadResult, WriteResult } from 'file-disk';
import { BlockWriteStream } from '../block-write-stream';
import { AdapterSourceDestination } from '../scanner/adapters/adapter';
import { SparseWriteStream } from '../sparse-stream/sparse-write-stream';
import { File } from './file';
import { Metadata } from './metadata';
export declare class BlockDevice extends File implements AdapterSourceDestination {
    private drive;
    private unmountOnSuccess;
    oDirect: boolean;
    emitsProgress: boolean;
    readonly alignment: number;
    constructor({ drive, unmountOnSuccess, write, direct, }: {
        drive: DrivelistDrive;
        unmountOnSuccess?: boolean;
        write?: boolean;
        direct?: boolean;
    });
    getAlignment(): number | undefined;
    protected getOpenFlags(): number;
    get isSystem(): boolean;
    get raw(): string;
    get device(): string;
    get devicePath(): string | null;
    get description(): string;
    get mountpoints(): import("drivelist").Mountpoint[];
    get size(): number | null;
    protected _getMetadata(): Promise<Metadata>;
    canWrite(): Promise<boolean>;
    canCreateWriteStream(): Promise<boolean>;
    canCreateSparseWriteStream(): Promise<boolean>;
    createWriteStream({ highWaterMark, }?: {
        highWaterMark?: number;
    }): Promise<BlockWriteStream>;
    createSparseWriteStream({ highWaterMark, }?: {
        highWaterMark?: number;
    }): Promise<SparseWriteStream>;
    protected _open(): Promise<void>;
    protected _close(): Promise<void>;
    private offsetIsAligned;
    private alignOffsetBefore;
    private alignOffsetAfter;
    private alignedRead;
    read(buffer: Buffer, bufferOffset: number, length: number, sourceOffset: number): Promise<ReadResult>;
    private alignedWrite;
    write(buffer: Buffer, bufferOffset: number, length: number, fileOffset: number): Promise<WriteResult>;
}
