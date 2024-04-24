/// <reference types="node" />
export interface Dictionary<T> {
    [key: string]: T;
}
export declare function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer>;
export declare function sparseStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer>;
export declare function difference<T>(setA: Set<T>, setB: Set<T>): Set<T>;
export declare function asCallback<T>(promise: Promise<T>, callback: (error?: Error | null, value?: T) => void): Promise<void>;
export declare function fromCallback<T>(fn: (callback: (error?: Error | null, result?: T) => void) => void): Promise<T>;
export declare function delay(ms: number): Promise<void>;
export declare function minBy<T>(things: Iterable<T>, iteratee: (thing: T) => number): T | undefined;
export declare function maxBy<T>(things: Iterable<T>, iteratee: (thing: T) => number): T | undefined;
export declare function sumBy<T>(things: Iterable<T>, iteratee: (thing: T) => number): number;
export declare function every<T>(things: Iterable<T>): boolean;
export declare function once<T>(fn: () => T): () => T;
