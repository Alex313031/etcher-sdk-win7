/// <reference types="node" />
import { Transform } from 'stream';
export declare class BlockTransformStream extends Transform {
    bytesRead: number;
    bytesWritten: number;
    private alignedReadableState;
    private currentBuffer;
    private currentBufferPosition;
    private unlockCurrentBuffer;
    constructor({ chunkSize, alignment, numBuffers, }: {
        chunkSize: number;
        alignment: number;
        numBuffers?: number;
    });
    private __flush;
    private pushChunk;
    _transform(chunk: Buffer, _encoding: string, callback: (error?: Error) => void): void;
    _flush(callback: (error?: Error) => void): void;
    static alignIfNeeded(stream: NodeJS.ReadableStream, alignment?: number, numBuffers?: number): NodeJS.ReadableStream | BlockTransformStream;
}
