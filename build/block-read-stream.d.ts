/// <reference types="node" />
import { Readable } from 'stream';
import { File } from './source-destination/file';
export declare class BlockReadStream extends Readable {
    private source;
    private alignment;
    private alignedReadableState;
    private bytesRead;
    private end;
    private chunkSize;
    private maxRetries;
    constructor({ source, alignment, start, end, chunkSize, maxRetries, numBuffers, }: {
        source: File;
        alignment?: number;
        start?: number;
        end?: number;
        chunkSize?: number;
        maxRetries?: number;
        numBuffers?: number;
    });
    private tryRead;
    _read(): Promise<void>;
}
export declare const ProgressBlockReadStream: {
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
} & typeof BlockReadStream;
