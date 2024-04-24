/// <reference types="node" />
import { EventEmitter } from 'events';
import { ReadResult, WriteResult } from 'file-disk';
import { BlocksWithChecksum, SparseReadable } from '../sparse-stream/shared';
import { SparseWritable } from '../sparse-stream/shared';
import { CreateReadStreamOptions, CreateSparseReadStreamOptions, SourceDestination, Verifier } from './source-destination';
export declare class MultiDestinationError extends Error {
    error: Error;
    destination: SourceDestination;
    constructor(error: Error, destination: SourceDestination);
}
export declare class MultiDestinationVerifier extends Verifier {
    private verifiers;
    private timer;
    constructor(source: MultiDestination, checksumOrBlocks: string | BlocksWithChecksum[], size?: number);
    private oneVerifierFinished;
    private emitProgress;
    run(): Promise<void>;
}
export declare class MultiDestination extends SourceDestination {
    readonly destinations: Set<SourceDestination>;
    readonly erroredDestinations: Set<SourceDestination>;
    constructor(destinations: SourceDestination[]);
    getAlignment(): number | undefined;
    destinationError(destination: SourceDestination, error: Error, stream?: EventEmitter): void;
    get activeDestinations(): Set<SourceDestination>;
    private can;
    canRead(): Promise<boolean>;
    canWrite(): Promise<boolean>;
    canCreateReadStream(): Promise<boolean>;
    canCreateSparseReadStream(): Promise<boolean>;
    canCreateWriteStream(): Promise<boolean>;
    canCreateSparseWriteStream(): Promise<boolean>;
    read(buffer: Buffer, bufferOffset: number, length: number, sourceOffset: number): Promise<ReadResult>;
    write(buffer: Buffer, bufferOffset: number, length: number, fileOffset: number): Promise<WriteResult>;
    createReadStream(options: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
    createSparseReadStream(options: CreateSparseReadStreamOptions): Promise<SparseReadable>;
    private createStream;
    createWriteStream(...args: Parameters<SourceDestination['createWriteStream']>): Promise<NodeJS.WritableStream>;
    createSparseWriteStream(...args: Parameters<SourceDestination['createSparseWriteStream']>): Promise<SparseWritable>;
    createVerifier(checksumOrBlocks: string | BlocksWithChecksum[], size?: number): Verifier;
    protected _open(): Promise<void>;
    protected _close(): Promise<void>;
}
