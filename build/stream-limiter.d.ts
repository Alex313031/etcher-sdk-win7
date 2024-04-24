/// <reference types="node" />
import { Transform } from 'stream';
export declare class StreamLimiter extends Transform {
    private stream;
    private maxBytes;
    constructor(stream: NodeJS.ReadableStream, maxBytes: number);
    _transform(buffer: Buffer, _encoding: string, callback: (error?: Error, data?: Buffer) => void): void;
}
