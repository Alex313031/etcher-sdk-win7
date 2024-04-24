/// <reference types="node" />
import { Disk, ReadResult, WriteResult } from 'file-disk';
import { BlocksWithChecksum, ChecksumType } from '../../sparse-stream/shared';
import { SparseFilterStream } from '../../sparse-stream/sparse-filter-stream';
import { SparseReadStream } from '../../sparse-stream/sparse-read-stream';
import { Metadata } from '../metadata';
import { CreateReadStreamOptions, CreateSparseReadStreamOptions, SourceDestination } from '../source-destination';
import { SourceSource } from '../source-source';
export declare type ConfigureFunction = (disk: Disk) => Promise<void>;
export declare class SourceDisk extends Disk {
    private source;
    constructor(source: SourceDestination);
    protected _getCapacity(): Promise<number>;
    protected _read(buffer: Buffer, bufferOffset: number, length: number, fileOffset: number): Promise<ReadResult>;
    protected _write(_buffer: Buffer, _bufferOffset: number, _length: number, _fileOffset: number): Promise<WriteResult>;
    protected _flush(): Promise<void>;
}
export declare class ConfiguredSource extends SourceSource {
    private shouldTrimPartitions;
    private createStreamFromDisk;
    private checksumType;
    private chunkSize;
    private disk;
    private configure?;
    constructor({ source, // source needs to implement read and createReadStream
    shouldTrimPartitions, createStreamFromDisk, configure, checksumType, chunkSize, }: {
        source: SourceDestination;
        shouldTrimPartitions: boolean;
        createStreamFromDisk: boolean;
        configure?: ConfigureFunction | 'legacy';
        checksumType?: ChecksumType;
        chunkSize?: number;
    });
    getBlocks(): Promise<BlocksWithChecksum[]>;
    private getBlocksWithChecksumType;
    canRead(): Promise<boolean>;
    canCreateReadStream(): Promise<boolean>;
    canCreateSparseReadStream(): Promise<boolean>;
    read(buffer: Buffer, bufferOffset: number, length: number, sourceOffset: number): Promise<ReadResult>;
    createReadStream(options: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
    private createSparseReadStreamFromDisk;
    private createSparseReadStreamFromStream;
    createSparseReadStream({ generateChecksums, alignment, numBuffers, }?: CreateSparseReadStreamOptions): Promise<SparseReadStream | SparseFilterStream>;
    protected _getMetadata(): Promise<Metadata>;
    private trimPartitions;
    protected _open(): Promise<void>;
    protected _close(): Promise<void>;
}
