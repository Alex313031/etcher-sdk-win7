/// <reference types="node" />
import { Transform } from 'stream';
import { BlocksWithChecksum, SparseReadable, SparseStreamChunk, SparseWritable } from './shared';
export declare class SparseTransformStream extends Transform implements SparseWritable, SparseReadable {
    blocks: BlocksWithChecksum[];
    position: number;
    bytesWritten: number;
    private alignedReadableState;
    constructor({ blocks, chunkSize, alignment, numBuffers, }: {
        blocks: BlocksWithChecksum[];
        chunkSize: number;
        alignment: number;
        numBuffers?: number;
    });
    private __transform;
    _transform(chunk: SparseStreamChunk, _encoding: string, callback: (error?: Error) => void): void;
}
export declare const ProgressSparseTransformStream: {
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
} & typeof SparseTransformStream;
