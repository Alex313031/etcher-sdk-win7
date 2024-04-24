/// <reference types="node" />
import { Transform as TransformStream } from 'stream';
import { EventEmitter } from 'events';
import { ReadResult, WriteResult } from 'file-disk';
import { GetPartitionsResult } from 'partitioninfo';
import { AlignedLockableBuffer } from '../aligned-lockable-buffer';
import { BlocksWithChecksum, SparseReadable } from '../sparse-stream/shared';
import { SparseWritable } from '../sparse-stream/shared';
import { Metadata } from './metadata';
import { ProgressEvent } from './progress';
import { SourceSource } from './source-source';
declare class HashStream extends TransformStream {
    private _outEnc;
    private _hash;
    constructor(seed: number, outEnc: string | Buffer);
    _transform(chunk: Buffer, _encoding: string, callback: () => void): void;
    _flush(callback: () => void): void;
}
export declare class CountingHashStream extends HashStream {
    bytesWritten: number;
    __transform(chunk: Buffer | AlignedLockableBuffer, encoding: string): Promise<void>;
    _transform(chunk: Buffer | AlignedLockableBuffer, encoding: string, callback: (error?: Error) => void): void;
}
export declare const ProgressHashStream: {
    new (...args: any[]): {
        addListener(event: string | symbol, listener: (...args: any[]) => void): any;
        on(event: string | symbol, listener: (...args: any[]) => void): any;
        once(event: string | symbol, listener: (...args: any[]) => void): any;
        removeListener(event: string | symbol, listener: (...args: any[]) => void): any;
        off(event: string | symbol, listener: (...args: any[]) => void): any;
        removeAllListeners(event?: string | symbol | undefined): any;
        setMaxListeners(n: number): any;
        getMaxListeners(): number;
        listeners(event: string | symbol): Function[];
        rawListeners(event: string | symbol): Function[];
        emit(event: string | symbol, ...args: any[]): boolean;
        listenerCount(event: string | symbol): number;
        prependListener(event: string | symbol, listener: (...args: any[]) => void): any;
        prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): any;
        eventNames(): (string | symbol)[];
    };
} & typeof CountingHashStream;
export declare function createHasher(): {
    addListener(event: string | symbol, listener: (...args: any[]) => void): any;
    on(event: string | symbol, listener: (...args: any[]) => void): any;
    once(event: string | symbol, listener: (...args: any[]) => void): any;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): any;
    off(event: string | symbol, listener: (...args: any[]) => void): any;
    removeAllListeners(event?: string | symbol | undefined): any;
    setMaxListeners(n: number): any;
    getMaxListeners(): number;
    listeners(event: string | symbol): Function[];
    rawListeners(event: string | symbol): Function[];
    emit(event: string | symbol, ...args: any[]): boolean;
    listenerCount(event: string | symbol): number;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): any;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): any;
    eventNames(): (string | symbol)[];
} & CountingHashStream;
export declare class SourceDestinationFs {
    private source;
    constructor(source: SourceDestination);
    open(_path: string, _options: any, callback: (error: Error | null, fd?: number) => void): void;
    close(_fd: number, callback: (error: Error | null) => void): void;
    fstat(_fd: number, callback: (error: Error | null, stats?: {
        size: number;
    }) => void): void;
    read(_fd: number, buffer: Buffer, bufferOffset: number, length: number, sourceOffset: number, callback: (error: Error | null, bytesRead?: number, buffer?: Buffer) => void): void;
}
export declare abstract class Verifier extends EventEmitter {
    progress: ProgressEvent;
    abstract run(): Promise<void>;
    protected handleEventsAndPipe(stream: NodeJS.ReadableStream, meter: NodeJS.WritableStream): void;
}
export declare class StreamVerifier extends Verifier {
    private source;
    private checksum;
    private size;
    constructor(source: SourceDestination, checksum: string, size: number);
    run(): Promise<void>;
}
export declare class SparseStreamVerifier extends Verifier {
    private source;
    private blocks;
    constructor(source: SourceDestination, blocks: BlocksWithChecksum[]);
    run(): Promise<void>;
}
export interface CreateReadStreamOptions {
    emitProgress?: boolean;
    start?: number;
    end?: number;
    alignment?: number;
    numBuffers?: number;
}
export interface CreateSparseReadStreamOptions {
    generateChecksums?: boolean;
    alignment?: number;
    numBuffers?: number;
}
export declare class SourceDestination extends EventEmitter {
    static readonly imageExtensions: string[];
    static readonly mimetype?: string;
    private static mimetypes;
    private metadata;
    private isOpen;
    static register(Cls: typeof SourceSource): void;
    getAlignment(): number | undefined;
    canRead(): Promise<boolean>;
    canWrite(): Promise<boolean>;
    canCreateReadStream(): Promise<boolean>;
    canCreateSparseReadStream(): Promise<boolean>;
    canCreateWriteStream(): Promise<boolean>;
    canCreateSparseWriteStream(): Promise<boolean>;
    getMetadata(): Promise<Metadata>;
    protected _getMetadata(): Promise<Metadata>;
    read(_buffer: Buffer, _bufferOffset: number, _length: number, _sourceOffset: number): Promise<ReadResult>;
    write(_buffer: Buffer, _bufferOffset: number, _length: number, _fileOffset: number): Promise<WriteResult>;
    createReadStream(_options?: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
    createSparseReadStream(_options?: CreateSparseReadStreamOptions): Promise<SparseReadable>;
    getBlocks(): Promise<BlocksWithChecksum[]>;
    createWriteStream(_options?: {
        highWaterMark?: number;
    }): Promise<NodeJS.WritableStream>;
    createSparseWriteStream(_options?: {
        highWaterMark?: number;
    }): Promise<SparseWritable>;
    open(): Promise<void>;
    close(): Promise<void>;
    protected _open(): Promise<void>;
    protected _close(): Promise<void>;
    createVerifier(checksumOrBlocks: string | BlocksWithChecksum[], size?: number): Verifier;
    private getMimeTypeFromName;
    private getMimeTypeFromContent;
    private getInnerSourceHelper;
    getInnerSource(): Promise<SourceDestination>;
    getPartitionTable(): Promise<GetPartitionsResult | undefined>;
}
export {};
