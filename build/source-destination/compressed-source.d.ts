/// <reference types="node" />
import { Transform } from 'stream';
import { Metadata } from './metadata';
import { CreateReadStreamOptions } from './source-destination';
import { SourceSource } from './source-source';
export interface SourceTransform extends Transform {
    sourceStream: NodeJS.ReadableStream;
}
export declare function isSourceTransform(stream: any): stream is SourceTransform;
export declare function getRootStream(stream: NodeJS.ReadableStream): NodeJS.ReadableStream;
export declare abstract class CompressedSource extends SourceSource {
    protected abstract createTransform(): Transform;
    protected getSize(): Promise<{
        size: number;
        isEstimated: boolean;
    } | undefined>;
    canCreateReadStream(): Promise<boolean>;
    createReadStream({ emitProgress, start, end, }?: CreateReadStreamOptions): Promise<SourceTransform>;
    protected getSizeFromPartitionTable(): Promise<number | undefined>;
    protected _getMetadata(): Promise<Metadata>;
}
