/// <reference types="node" />
import { Writable } from 'stream';
import { SourceDestination } from '../source-destination/source-destination';
import { SparseStreamChunk, SparseWritable } from './shared';
export declare class SparseWriteStream extends Writable implements SparseWritable {
    private destination;
    firstBytesToKeep: number;
    private maxRetries;
    position: number;
    bytesWritten: number;
    private _firstChunks;
    constructor({ destination, highWaterMark, firstBytesToKeep, maxRetries, }: {
        destination: SourceDestination;
        firstBytesToKeep?: number;
        maxRetries?: number;
        highWaterMark?: number;
    });
    private writeChunk;
    private copyChunk;
    private __write;
    _write(chunk: SparseStreamChunk, _enc: string, callback: (error: Error | null) => void): void;
    private __final;
    /**
     * @summary Write buffered data before a stream ends, called by stream internals
     */
    _final(callback: (error?: Error | null) => void): void;
}
export declare const ProgressSparseWriteStream: {
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
} & typeof SparseWriteStream;
