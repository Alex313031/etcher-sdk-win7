/// <reference types="node" />
import { Writable } from 'stream';
import { AlignedLockableBuffer } from './aligned-lockable-buffer';
import { BlockDevice } from './source-destination/block-device';
export declare class BlockWriteStream extends Writable {
    private destination;
    private delayFirstBuffer;
    private maxRetries;
    bytesWritten: number;
    private position;
    private firstBuffer?;
    constructor({ destination, highWaterMark, delayFirstBuffer, maxRetries, }: {
        destination: BlockDevice;
        highWaterMark?: number;
        delayFirstBuffer?: boolean;
        maxRetries?: number;
    });
    private writeBuffer;
    private __write;
    _write(buffer: AlignedLockableBuffer, _encoding: string, callback: (error: Error | undefined) => void): void;
    private __final;
    /**
     * @summary Write buffered data before a stream ends, called by stream internals
     */
    _final(callback: (error?: Error | null) => void): void;
}
export declare const ProgressBlockWriteStream: {
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
} & typeof BlockWriteStream;
