/// <reference types="node" />
export interface AlignedLockableBuffer extends Buffer {
    alignment: number;
    lock: () => Promise<() => void>;
    rlock: () => Promise<() => void>;
    slice: (start?: number, end?: number) => AlignedLockableBuffer;
}
export declare function createBuffer(size: number, alignment: number): AlignedLockableBuffer;
export declare function isAlignedLockableBuffer(buffer: Buffer): buffer is AlignedLockableBuffer;
export declare class AlignedReadableState {
    private bufferSize;
    private alignment;
    private numBuffers;
    private buffers;
    private currentBufferIndex;
    constructor(bufferSize: number, alignment: number, numBuffers: number);
    getCurrentBuffer(): AlignedLockableBuffer;
}
